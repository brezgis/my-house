#!/usr/bin/env python3
"""The guest book for Anna's House: a tiny service that keeps visitors' notes.

One book with several doors: the mailbox at the gate of the house (house.brezgis.com) and the
guestbook page of the recursite (recursite.brezgis.com/guestbook/). Each note records the door it
came through (its "place"); every door shows every note.

Notes appear at once (GB_MODE=instant) unless something holds one back for Anna: a screen
(screens.py: links, slurs, markup, symbol soup, duplicates), the sender's small daily allowance of
instant notes, the book's overall pace, or the flood breaker. A held note waits, as every note does
in review mode (GB_MODE=review, the kill switch). Visitors can report a note; enough reports from
different people hide it until Anna looks, within strict limits so that reports cannot be used to
empty the book.

A "sender" is an IPv4 address, or an IPv6 /64 (one household or one server, however many addresses
it rotates through). Senders are known only by a keyed hash; the key changes every month and old keys
are thrown away, and every hash is erased after FORGET_DAYS.

Python 3.12 standard library only (http.server + sqlite3). It runs behind nginx, bound to 127.0.0.1,
as an unprivileged user (see README.md).

    python3 guestbook.py serve                    run the service
    python3 guestbook.py mode                     instant or review, and why
    python3 guestbook.py held [--place P]         notes waiting for Anna (also: pending)
    python3 guestbook.py recent [N] [--place P]   the latest published notes, with what the screens said
    python3 guestbook.py list [--all] [--place P] published notes (or every note)
    python3 guestbook.py show ID [ID ...]         notes in full (ID: the number, or the public id)
    python3 guestbook.py approve ID [ID ...]      publish held notes (they cannot then be hidden by reports)
    python3 guestbook.py reject ID [ID ...]       keep held notes out of sight (kept, never shown)
    python3 guestbook.py hide ID [ID ...]         take published notes down at once;  unhide ID  puts them back
    python3 guestbook.py delete ID [ID ...]       remove notes for good
    python3 guestbook.py reports                  notes visitors have reported
    python3 guestbook.py block HASH [...]         refuse a sender (the 8 characters after "from" in held/show/recent);  unblock HASH;  blocks
    python3 guestbook.py breaker [reset]          whether the flood breaker has tripped; reset it
    python3 guestbook.py digest [--hours H]       what came in lately, published and held (for cron)
    python3 guestbook.py export [--all] [--place P]   JSON on stdout (never hashes)
    python3 guestbook.py backup FILE [--with-hashes]  a consistent copy of the database (without sender hashes or keys, unless asked)

The HTTP side:
    GET  /notes?page=N[&place=P]   published notes, newest first, from every place unless P is given:
                         {"notes": [{"id", "name", "text", "date", "at", "place"}], "page", "pages", "total", "form"}
                         id is a short public id; date the UTC day and at the full UTC time; "form" is a token,
                         signed for this sender, good for one note within FORM_LIFE
    POST /notes          JSON {"name", "text", "place", "form", "website"} -> 202 {"ok": true, "status": "published",
                         "note": {...}} or 202 {"ok": true, "status": "pending"} when it waits for Anna;
                         400 {"error", "code": "form"} when the form token is missing, stale or not this sender's
    POST /notes/ID/report    optional JSON {"reason", "form"} -> 202 {"ok": true}
    OPTIONS              CORS preflight for both
    GET  /health         {"ok": true}

The request log has the method, a cleaned path and the status only: no addresses, no bodies.

Configuration, from the environment (all optional):
    GB_HOST 127.0.0.1   GB_PORT 8790   GB_DB ./data/notes.db   GB_SALT next to it (mode 600; signs form tokens)
    GB_ORIGINS    explicit comma-separated list (default: https://house.brezgis.com,
                  https://recursite.brezgis.com,http://localhost:8791,http://127.0.0.1:8791)
    GB_PLACES     house,recursite ('town' is reserved for later)
    GB_MODE       instant (default) | review
    GB_WORDS      extra screened words, one per line (default: words.txt next to the database; optional)
    GB_NOTIFY_LOG a file to append one line to for every new note, report, hide and trip (default: none)
    GB_TRUST_PROXY  1 (default): take the client address from X-Real-IP when the connection comes from 127.0.0.1
"""

import hashlib
import hmac
import ipaddress
import json
import os
import re
import secrets
import socket
import sqlite3
import sys
import threading
import time
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlsplit, parse_qs

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import screens  # noqa: E402
from screens import clean, validate  # noqa: E402,F401  (kept importable from here)

# ---- Limits and thresholds (all in one place) ----------------------------------------------------
MAX_BODY = 4096                 # bytes in a POST
PAGE_SIZE = 8
MAX_PAGE = 1000
MIN_SECONDS = 4                 # a form sent back sooner than this after it was shown is a bot's (dropped quietly)
FORM_LIFE = 2 * 3600            # a form token is good for one note within two hours (the pages fetch a fresh one quietly)
PER_SENDER = (3, 4 / 3600)      # notes sent: a burst of 3 per sender, then 4 an hour (past it: "try again later", to that sender only)
INSTANT_PER_DAY = 2             # notes per sender that may appear at once in a day; more are taken, but held
GLOBAL_PUBLISH = (30, 60 / 3600)    # notes appearing at once, everyone together: a burst of 30, then 60 an hour; past it they are held
REPORTS_PER_SENDER = (5, 10 / 3600)
MAX_PENDING = 500               # held notes kept at most; from 450 the oldest from senders with several held are dropped first
SQUEEZE_AT = 450
FORGET_DAYS = 30                # sender hashes, reports and blocks are forgotten after this many days
BREAKER = {'notes': 12, 'senders': 3, 'window': 10 * 60, 'quiet': 6 * 3600}   # 12 published in 10 minutes from 3+ senders
REPORT_HIDE = 3                 # reports from this many different senders (each with a real form) hide a note...
AUTO_HIDES_PER_DAY = 3          # ...but no more than this many notes a day across the book; past that, reports only flag
MAX_REASON = 200
MAX_CONN = 64                   # requests handled at once; more are turned away
READ_TIMEOUT = 5                # seconds a connection may sit silent
REQUEST_DEADLINE = 20           # seconds a connection may last in all
MAINTAIN_EVERY = 3600           # forgetting and purging run at start-up and then at most hourly, on any request

DEFAULT_ORIGINS = 'https://house.brezgis.com,https://recursite.brezgis.com,http://localhost:8791,http://127.0.0.1:8791'
DEFAULT_PLACE = 'house'         # a note that names no place came from the house's first client


def env(name, default):
    v = os.environ.get(name)
    return v if v not in (None, '') else default


class Config:
    def __init__(self, **kw):
        self.host = kw.get('host', env('GB_HOST', '127.0.0.1'))
        self.port = int(kw.get('port', env('GB_PORT', '8790')))
        self.db = kw.get('db', env('GB_DB', os.path.join(HERE, 'data', 'notes.db')))
        self.salt_file = kw.get('salt_file', env('GB_SALT', os.path.join(os.path.dirname(self.db), 'salt')))
        origins = kw.get('origins', env('GB_ORIGINS', DEFAULT_ORIGINS))
        if isinstance(origins, str):
            origins = [o.strip() for o in origins.split(',') if o.strip()]
        self.origins = set(origins)
        places = kw.get('places', env('GB_PLACES', 'house,recursite'))
        if isinstance(places, str):
            places = [p.strip() for p in places.split(',') if p.strip()]
        self.places = tuple(places)
        self.mode = kw.get('mode', env('GB_MODE', 'instant')).strip().lower()
        if self.mode not in ('instant', 'review'):
            raise SystemExit(f'GB_MODE must be instant or review, not {self.mode!r}')
        self.words_file = kw.get('words_file', env('GB_WORDS', os.path.join(os.path.dirname(self.db), 'words.txt')))
        self.notify_log = kw.get('notify_log', env('GB_NOTIFY_LOG', ''))
        self.trust_proxy = str(kw.get('trust_proxy', env('GB_TRUST_PROXY', '1'))) == '1'
        self.clock = kw.get('clock', time.time)


def identity(ip):
    """Who a request is from, for limits: an IPv4 address, or the /64 an IPv6 address is in."""
    try:
        a = ipaddress.ip_address(str(ip).split('%')[0].strip())
    except ValueError:
        return str(ip)[:64]
    if a.version == 6:
        if a.ipv4_mapped:
            return str(a.ipv4_mapped)
        return str(ipaddress.ip_network(f'{a}/64', strict=False))
    return str(a)


# ---- Storage -----------------------------------------------------------------------------------
SCHEMA = """
CREATE TABLE IF NOT EXISTS notes (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL DEFAULT '',
  text       TEXT NOT NULL,
  created_at TEXT NOT NULL,              -- UTC, ISO 8601
  status     TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),   -- held, published, rejected
  decided_at TEXT,
  ip_hash    TEXT,                       -- the sender's keyed hash; erased after FORGET_DAYS
  has_link   INTEGER NOT NULL DEFAULT 0,
  place      TEXT NOT NULL DEFAULT 'house'
);
CREATE TABLE IF NOT EXISTS reports (
  note_id    INTEGER NOT NULL,
  sender     TEXT NOT NULL,              -- the reporter's keyed hash
  reason     TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  UNIQUE (note_id, sender)
);
CREATE TABLE IF NOT EXISTS blocks (prefix TEXT PRIMARY KEY, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS state (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS notes_status ON notes (status, id);
"""
COLUMNS = [                              # added to older databases, in order; names and types never come from input
    ('notes', 'place', "TEXT NOT NULL DEFAULT 'house'"),
    ('notes', 'hidden', 'INTEGER NOT NULL DEFAULT 0'),     # taken down after publishing (by Anna, or by reports)
    ('notes', 'hidden_by', 'TEXT'),
    ('notes', 'hidden_at', 'TEXT'),
    ('notes', 'public_id', 'TEXT'),
    ('notes', 'screen', "TEXT NOT NULL DEFAULT ''"),      # what the screens said, for Anna only
    ('notes', 'norm', 'TEXT'),                            # the text reduced for duplicate checks; NULL: not yet computed
    ('notes', 'instant', 'INTEGER NOT NULL DEFAULT 0'),   # published at once (not by Anna)
    ('notes', 'immune', 'INTEGER NOT NULL DEFAULT 0'),    # Anna approved or unhid it: reports cannot hide it
    ('reports', 'counts', 'INTEGER NOT NULL DEFAULT 0'),  # this report counts toward hiding
]


def connect(path):
    """Open the database. Nothing else: the schema is set up once, by Book, at start-up."""
    d = os.path.dirname(path)
    if d:
        os.makedirs(d, mode=0o700, exist_ok=True)
    new = not os.path.exists(path)
    con = sqlite3.connect(path, timeout=10, isolation_level=None)
    if new:
        try:
            os.chmod(path, 0o600)
        except OSError:
            pass
    con.row_factory = sqlite3.Row
    con.execute('PRAGMA busy_timeout=5000')
    return con


def setup_db(con):
    """Create and bring up to date, once, at start-up. Old notes were all written at the house."""
    con.execute('PRAGMA journal_mode=WAL')
    con.executescript(SCHEMA)
    for table, name, decl in COLUMNS:
        if name not in {r[1] for r in con.execute(f'PRAGMA table_info({table})')}:
            con.execute(f'ALTER TABLE {table} ADD COLUMN {name} {decl}')
    for (i,) in con.execute('SELECT id FROM notes WHERE public_id IS NULL').fetchall():
        con.execute('UPDATE notes SET public_id = ? WHERE id = ?', (secrets.token_urlsafe(6), i))
    for r in con.execute("SELECT id, text FROM notes WHERE norm IS NULL OR norm = ''").fetchall():
        con.execute('UPDATE notes SET norm = ? WHERE id = ?', (screens.norm_key(r['text']), r['id']))
    con.execute('CREATE UNIQUE INDEX IF NOT EXISTS notes_public ON notes (public_id)')
    con.execute('CREATE INDEX IF NOT EXISTS notes_place ON notes (place, status, id)')
    con.execute('CREATE INDEX IF NOT EXISTS notes_sender ON notes (ip_hash, created_at)')


def load_salt(path):
    try:
        with open(path, 'rb') as f:
            s = f.read()
        if len(s) >= 16:
            return s
    except FileNotFoundError:
        pass
    d = os.path.dirname(path)
    if d:
        os.makedirs(d, mode=0o700, exist_ok=True)
    s = secrets.token_bytes(32)
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(fd, 'wb') as f:
        f.write(s)
    return s


def iso(t):
    return datetime.fromtimestamp(t, timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')


def now_iso(clock=time.time):
    return iso(clock())


def month(t, back=0):
    d = datetime.fromtimestamp(t, timezone.utc)
    m = d.year * 12 + d.month - 1 - back
    return f'{m // 12:04d}-{m % 12 + 1:02d}'


# ---- Rate limits (in memory; a restart forgets them) ---------------------------------------------
class Buckets:
    def __init__(self, size, rate, clock):
        self.size, self.rate, self.clock, self.b, self.lock = size, rate, clock, {}, threading.Lock()

    def take(self, key):
        with self.lock:
            t = self.clock()
            level, last = self.b.get(key, (self.size, t))
            level = min(self.size, level + (t - last) * self.rate)
            if level < 1:
                self.b[key] = (level, t)
                return False
            self.b[key] = (level - 1, t)
            if len(self.b) > 20000:                  # keep memory bounded: drop full buckets
                for k in [k for k, (lv, ls) in self.b.items() if lv + (t - ls) * self.rate >= self.size][:10000]:
                    del self.b[k]
            return True


# ---- The book --------------------------------------------------------------------------------------
PENDING = {'ok': True, 'status': 'pending'}
STALE = {'error': 'The page needed a fresh form. Please send your note again.', 'code': 'form'}


class Book:
    PUBLISHED = "status = 'approved' AND hidden = 0"

    def __init__(self, cfg):
        self.cfg = cfg
        self.salt = load_salt(cfg.salt_file)
        self.form_key = hmac.new(self.salt, b'form-token', hashlib.sha256).digest()
        self.per_sender = Buckets(*PER_SENDER, cfg.clock)
        self.everyone = Buckets(*GLOBAL_PUBLISH, cfg.clock)
        self.reporters = Buckets(*REPORTS_PER_SENDER, cfg.clock)
        self.words = screens.load_words(cfg.words_file)
        self.local = threading.local()
        self.lock = threading.Lock()             # one note decided at a time (duplicates, budgets, the breaker)
        self.spent = {}                          # form tokens already used: token -> expiry
        self.spent_lock = threading.Lock()
        self.maintained = 0
        con = connect(cfg.db)
        setup_db(con)
        con.close()
        with self.lock:
            self.maintain(force=True)

    @property
    def db(self):
        con = getattr(self.local, 'con', None)
        if con is None:
            con = self.local.con = connect(self.cfg.db)
        return con

    def now(self):
        return self.cfg.clock()

    def ago(self, seconds):
        return iso(self.now() - seconds)

    # -- senders: keyed hashes, the key changing every month (two months' keys are kept, older ones thrown away)
    def key(self, back=0, create=False):
        name = 'hashkey:' + month(self.now(), back)
        k = self.get_state(name)
        if k is None and create:
            k = secrets.token_hex(32)
            self.db.execute('INSERT OR IGNORE INTO state (key, value) VALUES (?, ?)', (name, k))
            k = self.get_state(name)
        return bytes.fromhex(k) if k else None

    def hashes(self, ip):
        """This sender's hash under this month's key, then last month's (if kept)."""
        who = identity(ip).encode()
        out = [hmac.new(self.key(0, create=True), who, hashlib.sha256).hexdigest()[:24]]
        prev = self.key(1)
        if prev:
            out.append(hmac.new(prev, who, hashlib.sha256).hexdigest()[:24])
        return out

    def ip_hash(self, ip):
        return self.hashes(ip)[0]

    # -- form tokens: issued for one sender, good once, for FORM_LIFE
    def _sign(self, ts, nonce, ip):
        return hmac.new(self.form_key, f'{ts}.{nonce}.{identity(ip)}'.encode(), hashlib.sha256).hexdigest()[:20]

    def form_token(self, ip='127.0.0.1'):
        ts, nonce = str(int(self.now())), secrets.token_hex(6)
        return f'{ts}.{nonce}.{self._sign(ts, nonce, ip)}'

    def form_age(self, token, ip='127.0.0.1'):
        """Seconds since the form was shown, or None if the token is not this sender's or is malformed."""
        if not isinstance(token, str) or not re.fullmatch(r'\d{1,12}\.[0-9a-f]{12}\.[0-9a-f]{20}', token):
            return None
        ts, nonce, sig = token.split('.')
        if not hmac.compare_digest(sig, self._sign(ts, nonce, ip)):
            return None
        return self.now() - int(ts)

    def spend(self, token):
        """True the first time a token is used; False after."""
        with self.spent_lock:
            t = self.now()
            if len(self.spent) > 20000:
                self.spent = {k: v for k, v in self.spent.items() if v > t}
            if self.spent.get(token, 0) > t:
                return False
            self.spent[token] = t + FORM_LIFE + 60
            return True

    # -- state: keys, the breaker
    def get_state(self, key):
        r = self.db.execute('SELECT value FROM state WHERE key = ?', (key,)).fetchone()
        return r[0] if r else None

    def set_state(self, key, value):
        if value is None:
            self.db.execute('DELETE FROM state WHERE key = ?', (key,))
        else:
            self.db.execute('INSERT INTO state (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', (key, value))

    def mode(self):
        """('instant' or 'review', why)."""
        if self.cfg.mode == 'review':
            return 'review', 'GB_MODE=review'
        tripped = self.get_state('breaker')
        if tripped:
            return 'review', f'the flood breaker tripped at {tripped} (it resets itself after {BREAKER["quiet"] // 3600} quiet hours)'
        return 'instant', 'GB_MODE=instant'

    def notify(self, line):
        if not self.cfg.notify_log:
            return
        try:
            fd = os.open(self.cfg.notify_log, os.O_WRONLY | os.O_CREAT | os.O_APPEND, 0o600)
            with os.fdopen(fd, 'a', encoding='utf-8') as f:
                f.write(f'{now_iso(self.cfg.clock)} {line}\n')
        except OSError:
            pass

    # -- forgetting, purging, resetting: at start-up, then at most hourly
    def maintain(self, force=False):
        if not force and self.now() - self.maintained < MAINTAIN_EVERY:
            return
        self.maintained = self.now()
        con, cut = self.db, self.ago(FORGET_DAYS * 86400)
        con.execute('UPDATE notes SET ip_hash = NULL WHERE ip_hash IS NOT NULL AND created_at < ?', (cut,))
        con.execute('DELETE FROM reports WHERE created_at < ?', (cut,))
        con.execute('DELETE FROM blocks WHERE created_at < ?', (cut,))
        keep = {'hashkey:' + month(self.now(), 0), 'hashkey:' + month(self.now(), 1)}
        for (k,) in con.execute("SELECT key FROM state WHERE key LIKE 'hashkey:%'").fetchall():
            if k not in keep:
                con.execute('DELETE FROM state WHERE key = ?', (k,))
        self.key(0, create=True)
        tripped = self.get_state('breaker')
        if tripped and self.now() - datetime.strptime(tripped, '%Y-%m-%dT%H:%M:%SZ').replace(tzinfo=timezone.utc).timestamp() >= BREAKER['quiet']:
            self.set_state('breaker', None)
            self.notify('BREAKER reset itself after a quiet spell; notes appear at once again')

    def tick(self):
        with self.lock:
            self.maintain()

    # -- reading
    def page(self, n, place=None, ip='127.0.0.1'):
        self.tick()
        where, args = f'WHERE {self.PUBLISHED}', []
        if place:
            where += ' AND place = ?'
            args.append(place)
        total = self.db.execute(f'SELECT COUNT(*) FROM notes {where}', args).fetchone()[0]
        pages = max(1, -(-total // PAGE_SIZE))
        n = min(max(1, n), pages)
        rows = self.db.execute(f'SELECT * FROM notes {where} ORDER BY id DESC LIMIT ? OFFSET ?', (*args, PAGE_SIZE, (n - 1) * PAGE_SIZE)).fetchall()
        return {'notes': [public(r) for r in rows], 'page': n, 'pages': pages, 'total': total, 'form': self.form_token(ip)}

    # -- writing
    def blocked(self, hs):
        return any(h.startswith(p) for (p,) in self.db.execute('SELECT prefix FROM blocks') for h in hs)

    def squeeze(self):
        """Near the cap on held notes, drop the oldest held notes of senders who have several."""
        con = self.db
        held = con.execute("SELECT COUNT(*) FROM notes WHERE status = 'pending'").fetchone()[0]
        if held < SQUEEZE_AT:
            return held
        for (i,) in con.execute("""SELECT id FROM notes WHERE status = 'pending' AND immune = 0 AND ip_hash IN
                                   (SELECT ip_hash FROM notes WHERE status = 'pending' AND ip_hash IS NOT NULL GROUP BY ip_hash HAVING COUNT(*) > 1)
                                   ORDER BY id LIMIT ?""", (held - SQUEEZE_AT + 1,)).fetchall():
            con.execute('DELETE FROM notes WHERE id = ?', (i,))
        return con.execute("SELECT COUNT(*) FROM notes WHERE status = 'pending'").fetchone()[0]

    def post(self, body, ip):
        """(status, payload). Bots, replays and blocked senders are told 'pending' and nothing is kept."""
        name, text = validate(body)                  # raises ValueError
        place = body.get('place', DEFAULT_PLACE)
        if place is None:
            place = DEFAULT_PLACE
        if place not in self.cfg.places:
            raise ValueError('This guest book does not know where that note came from.')
        if body.get('website'):                      # the honeypot: a field people never see
            return 202, PENDING
        token = body.get('form')
        age = self.form_age(token, ip)
        if age is None or age > FORM_LIFE or age < -60:
            return 400, STALE
        if age < MIN_SECONDS or not self.spend(token):
            return 202, PENDING
        hs = self.hashes(ip)
        if not self.per_sender.take(hs[0]):
            return 429, {'error': 'That is a lot of post for one afternoon. Try again in a little while.'}
        with self.lock:
            self.maintain()
            con = self.db
            if self.blocked(hs):
                return 202, PENDING
            if self.squeeze() >= MAX_PENDING:
                return 503, {'error': 'The mailbox is full until Anna has read what is in it. Do come back.'}
            why = screens.screen(name, text, self.words)
            norm = screens.norm_key(text)
            mine = '(' + ','.join('?' * len(hs)) + ')'
            if len(norm) >= screens.SCREEN['dup_min'] and con.execute(
                    f'SELECT 1 FROM notes WHERE norm = ? AND {self.PUBLISHED} AND created_at >= ? AND (ip_hash IS NULL OR ip_hash NOT IN {mine}) LIMIT 1',
                    (norm, self.ago(screens.SCREEN['dup_days'] * 86400), *hs)).fetchone():
                why.append('duplicate')
            elif any(screens.similar(norm, r[0]) for r in con.execute(f'SELECT norm FROM notes WHERE ip_hash IN {mine} AND created_at >= ?',
                                                                       (*hs, self.ago(screens.SCREEN['sender_hours'] * 3600)))):
                why.append('repeat')
            mode, _ = self.mode()
            if mode == 'review' and not why:
                why.append('review')
            if not why and con.execute(f'SELECT COUNT(*) FROM notes WHERE ip_hash IN {mine} AND instant = 1 AND created_at >= ?',
                                       (*hs, self.ago(86400))).fetchone()[0] >= INSTANT_PER_DAY:
                why.append('allowance')
            if not why and not self.everyone.take('*'):
                why.append('pace')
            if not why and self.breaker_trips(hs[0]):
                why.append('breaker')
            publish = not why
            stamp = now_iso(self.cfg.clock)
            cur = con.execute('INSERT INTO notes (name, text, created_at, status, decided_at, ip_hash, has_link, place, public_id, screen, norm, instant) '
                              'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                              (name, text, stamp, 'approved' if publish else 'pending', stamp if publish else None, hs[0],
                               1 if 'link' in why else 0, place, secrets.token_urlsafe(6), ','.join(why), norm, 1 if publish else 0))
            self.notify(f"{'published' if publish else 'HELD'} #{cur.lastrowid} {place} {name[:30]!r}{(' [' + ','.join(why) + ']') if why else ''}")
            if publish:
                return 202, {'ok': True, 'status': 'published', 'note': public(con.execute('SELECT * FROM notes WHERE id = ?', (cur.lastrowid,)).fetchone())}
            return 202, PENDING

    def breaker_trips(self, h):
        """Would one more note make a flood? Then trip: pull the burst back to held, and hold this one."""
        con, since = self.db, self.ago(BREAKER['window'])
        rows = con.execute(f'SELECT id, ip_hash FROM notes WHERE {self.PUBLISHED} AND instant = 1 AND created_at >= ?', (since,)).fetchall()
        senders = {r['ip_hash'] for r in rows} | {h}
        if len(rows) + 1 < BREAKER['notes'] or len(senders) < BREAKER['senders']:
            return False
        self.set_state('breaker', now_iso(self.cfg.clock))
        n = con.execute("UPDATE notes SET status = 'pending', decided_at = NULL, instant = 0, screen = TRIM(screen || ',breaker', ',') "
                        f'WHERE {self.PUBLISHED} AND instant = 1 AND immune = 0 AND created_at >= ?', (since,)).rowcount
        self.notify(f'BREAKER tripped: {n} note(s) from the last {BREAKER["window"] // 60} minutes pulled back to held; review mode '
                    f'until `guestbook.py breaker reset` or {BREAKER["quiet"] // 3600} quiet hours')
        return True

    def report(self, pid, body, ip):
        """Always 202 (unless rate-limited): a reporter learns nothing about the note or the count."""
        reason, token = '', None
        if isinstance(body, dict):
            reason = (clean(body.get('reason', '') or '', False) or '')[:MAX_REASON]
            token = body.get('form')
        hs = self.hashes(ip)
        if not self.reporters.take(hs[0]):
            return 429, {'error': 'Thank you; that is enough reports for now.'}
        age = self.form_age(token, ip)
        real = age is not None and 0 <= age <= FORM_LIFE          # someone who loaded the book in the last two hours
        with self.lock:
            self.maintain()
            con = self.db
            r = con.execute(f'SELECT id, immune FROM notes WHERE public_id = ? AND {self.PUBLISHED}', (pid,)).fetchone()
            if not r:
                return 202, {'ok': True}
            mine = '(' + ','.join('?' * len(hs)) + ')'
            counts = real and not con.execute(f'SELECT 1 FROM reports WHERE sender IN {mine} AND counts = 1 AND created_at >= ?',
                                              (*hs, self.ago(86400))).fetchone()
            con.execute('INSERT OR IGNORE INTO reports (note_id, sender, reason, created_at, counts) VALUES (?, ?, ?, ?, ?)',
                        (r['id'], hs[0], reason, now_iso(self.cfg.clock), 1 if counts else 0))
            n = con.execute('SELECT COUNT(DISTINCT sender) FROM reports WHERE note_id = ? AND counts = 1', (r['id'],)).fetchone()[0]
            self.notify(f'REPORT #{r["id"]} ({n} counting){": " + reason[:60] if reason else ""}')
            hides = con.execute("SELECT COUNT(*) FROM notes WHERE hidden_by = 'reports' AND hidden_at >= ?", (self.ago(86400),)).fetchone()[0]
            if n >= REPORT_HIDE and not r['immune'] and hides < AUTO_HIDES_PER_DAY:
                con.execute("UPDATE notes SET hidden = 1, hidden_by = 'reports', hidden_at = ? WHERE id = ?", (now_iso(self.cfg.clock), r['id']))
                self.notify(f'HIDDEN #{r["id"]} after {n} reports, until Anna looks')
        return 202, {'ok': True}


def public(r):
    """What anyone may see of a note: nothing about who sent it or what the screens said."""
    return {'id': r['public_id'], 'name': r['name'], 'text': r['text'], 'date': r['created_at'][:10], 'at': r['created_at'], 'place': r['place']}


# ---- HTTP ------------------------------------------------------------------------------------------
SECURITY_HEADERS = {
    'X-Content-Type-Options': 'nosniff',
    'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
    'Referrer-Policy': 'no-referrer',
    'X-Frame-Options': 'DENY',
    'Cross-Origin-Resource-Policy': 'cross-origin',
}
REPORT_PATH = re.compile(r'^/notes/([A-Za-z0-9_-]{8})/report$')
PRINTABLE = re.compile(r'[^\x21-\x7e]')        # for paths and methods: no spaces either
LOGSAFE = re.compile(r'[^\x20-\x7e]')


def say(line):
    """One line to the service log, with anything that is not printable ASCII taken out."""
    sys.stderr.write(LOGSAFE.sub('?', line) + '\n')


def guarded(fn):
    """Never a traceback to the visitor or the log."""
    def run(self):
        try:
            fn(self)
        except (socket.timeout, TimeoutError, ConnectionError):
            self.close_connection = True
        except Exception:
            self.close_connection = True
            say(f'{now_iso()} {PRINTABLE.sub("", str(self.command or "-"))[:10]} error')
            try:
                self.send(500, {'error': 'Something went wrong. Do try again later.'})
            except OSError:
                pass
    return run


def make_handler(book):
    cfg = book.cfg

    class Handler(BaseHTTPRequestHandler):
        server_version = 'guestbook'
        sys_version = ''
        protocol_version = 'HTTP/1.1'
        timeout = READ_TIMEOUT                       # a silent connection is cut off...

        def setup(self):
            super().setup()                          # ...and every connection after REQUEST_DEADLINE, however slowly it trickles
            self.killer = threading.Timer(REQUEST_DEADLINE, self.kill)
            self.killer.daemon = True
            self.killer.start()

        def kill(self):
            try:
                self.connection.shutdown(socket.SHUT_RDWR)
            except OSError:
                pass

        def finish(self):
            self.killer.cancel()
            try:
                super().finish()
            except OSError:
                pass

        def version_string(self):
            return 'guestbook'

        def log_message(self, fmt, *args):           # method, path and status only: no addresses, no bodies
            pass

        def log_request(self, code='-', size='-'):
            path = urlsplit(self.path or '').path
            path = '/notes/*/report' if REPORT_PATH.match(path) else PRINTABLE.sub('', path)[:40]
            say(f'{now_iso()} {PRINTABLE.sub("", str(self.command or "-"))[:10]} {path} {code}')

        def send_error(self, code, message=None, explain=None):      # http.server's own errors, as JSON that says nothing
            self.close_connection = True
            try:
                self.send(code, {'error': 'That request could not be read.'})
            except OSError:
                pass

        def client_ip(self):
            ip = self.client_address[0]
            if cfg.trust_proxy and ip in ('127.0.0.1', '::1'):
                ip = (self.headers.get('X-Real-IP') or ip).strip()
            return ip

        def origin_ok(self):
            h = getattr(self, 'headers', None)       # None when http.server could not read the request
            o = h.get('Origin') if h is not None else None
            return o is not None and o in cfg.origins

        def send(self, status, payload=None, cache=None):
            if status >= 400:
                self.close_connection = True         # a refused request may have left a body unread: never read it as the next request
            body = b'' if payload is None else json.dumps(payload, ensure_ascii=False).encode('utf-8')
            self.send_response(status)
            if payload is not None:
                self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', str(len(body)))
            self.send_header('Cache-Control', cache or 'no-store')
            for k, v in SECURITY_HEADERS.items():
                self.send_header(k, v)
            self.send_header('Vary', 'Origin')
            if self.origin_ok():
                self.send_header('Access-Control-Allow-Origin', self.headers['Origin'])
            if self.close_connection:
                self.send_header('Connection', 'close')
            self.end_headers()
            if self.command != 'HEAD':
                self.wfile.write(body)

        def route(self):
            return urlsplit(self.path).path.rstrip('/') or '/'

        @guarded
        def do_OPTIONS(self):
            r = self.route()
            if r != '/notes' and not REPORT_PATH.match(r):
                return self.send(404)
            if not self.origin_ok():
                return self.send(403)
            self.send_response(204)
            self.send_header('Access-Control-Allow-Origin', self.headers['Origin'])
            self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
            self.send_header('Access-Control-Allow-Headers', 'Content-Type')
            self.send_header('Access-Control-Max-Age', '86400')
            if self.headers.get('Access-Control-Request-Private-Network') == 'true':
                self.send_header('Access-Control-Allow-Private-Network', 'true')      # only matters when testing on a home network
            self.send_header('Vary', 'Origin')
            self.send_header('Content-Length', '0')
            for k, v in SECURITY_HEADERS.items():
                self.send_header(k, v)
            self.end_headers()

        @guarded
        def do_GET(self):
            r = self.route()
            if r == '/health':
                return self.send(200, {'ok': True})
            if r != '/notes':
                return self.send(404, {'error': 'Not here.'})
            if self.headers.get('Origin') is not None and not self.origin_ok():
                return self.send(403, {'error': 'Not from here.'})
            q = parse_qs(urlsplit(self.path).query)
            try:
                n = int(q.get('page', ['1'])[0])
            except ValueError:
                n = 1
            n = min(max(1, n), MAX_PAGE)
            place = q.get('place', [''])[0] or None
            if place is not None and place not in cfg.places:
                return self.send(400, {'error': 'No such place.'})
            return self.send(200, book.page(n, place, self.client_ip()), cache='no-store')

        def do_HEAD(self):
            self.do_GET()

        def read_json(self, optional=False):
            """(body, None) or (None, (status, payload))."""
            try:
                length = int(self.headers.get('Content-Length', '0' if optional else ''))
            except ValueError:
                return None, (411, {'error': 'How long is it?'})
            if length < 0 or length > MAX_BODY:
                return None, (413, {'error': 'That is too long.'})
            if optional and length == 0:
                return {}, None
            ctype = (self.headers.get('Content-Type') or '').split(';')[0].strip().lower()
            if ctype != 'application/json':
                return None, (415, {'error': 'Send it as JSON.'})
            try:
                return json.loads(self.rfile.read(length).decode('utf-8')), None
            except (ValueError, UnicodeDecodeError, RecursionError):
                return None, (400, {'error': 'That did not look like a note.'})

        @guarded
        def do_POST(self):
            r = self.route()
            m = REPORT_PATH.match(r)
            if r != '/notes' and not m:
                return self.send(404, {'error': 'Not here.'})
            if not self.origin_ok():
                return self.send(403, {'error': 'Not from here.'})
            body, err = self.read_json(optional=bool(m))
            if err:
                return self.send(*err)
            if m:
                return self.send(*book.report(m.group(1), body, self.client_ip()))
            try:
                status, payload = book.post(body, self.client_ip())
            except ValueError as e:
                return self.send(400, {'error': str(e)})
            return self.send(status, payload)

        def do_PUT(self):
            self.send(405, {'error': 'No.'})
        do_DELETE = do_PATCH = do_PUT

    return Handler


class Server(ThreadingHTTPServer):
    """A thread per connection, but no more than MAX_CONN at once."""
    daemon_threads = True

    def __init__(self, *a, **kw):
        self.slots = threading.BoundedSemaphore(MAX_CONN)
        super().__init__(*a, **kw)

    def process_request(self, request, client_address):
        if not self.slots.acquire(blocking=False):
            self.shutdown_request(request)
            return
        try:
            super().process_request(request, client_address)
        except Exception:
            self.slots.release()
            raise

    def process_request_thread(self, request, client_address):
        try:
            super().process_request_thread(request, client_address)
        finally:
            self.slots.release()

    def handle_error(self, request, client_address):
        say(f'{now_iso()} connection error')          # no peer address, no traceback


def serve(cfg):
    book = Book(cfg)
    srv = Server((cfg.host, cfg.port), make_handler(book))
    mode, why = book.mode()
    say(f'{now_iso()} guest book listening on {cfg.host}:{cfg.port}, {mode} ({why})')
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        srv.server_close()


# ---- Moderation, from the command line ----------------------------------------------------------------
def state_of(r):
    if r['status'] == 'approved':
        return 'hidden' if r['hidden'] else 'published'
    return 'held' if r['status'] == 'pending' else 'rejected'


def show_rows(con, rows, full=False):
    if not rows:
        print('(nothing)')
    for r in rows:
        n = con.execute('SELECT COUNT(*) FROM reports WHERE note_id = ?', (r['id'],)).fetchone()[0]
        tags = [t for t in (r['screen'] or '').split(',') if t]
        if r['hidden_by']:
            tags.append('hidden by ' + r['hidden_by'])
        if r['immune']:
            tags.append('kept by Anna')
        if n:
            tags.append(f'{n} report(s)')
        text = r['text'] if full else r['text'].replace('\n', ' / ')
        if not full and len(text) > 110:
            text = text[:107] + '...'
        sender = (r['ip_hash'] or '--------')[:8]
        print(f"#{r['id']:<5} {r['public_id']}  {r['created_at'][:16].replace('T', ' ')}  {state_of(r):<9} {r['place']:<10} "
              f"{(r['name'] or '(no name)')[:24]:<24} from {sender}{('  [' + ', '.join(tags) + ']') if tags else ''}")
        print(f'       {text}')
        if full:
            for rep in con.execute('SELECT reason, created_at, counts FROM reports WHERE note_id = ? ORDER BY created_at', (r['id'],)):
                print(f"       report {rep['created_at'][:16].replace('T', ' ')}{'' if rep['counts'] else ' (flag only)'}: {rep['reason'] or '(no reason given)'}")


def moderate(argv, cfg=None, book=None):
    cfg = cfg or Config()
    if not argv or argv[0] in ('-h', '--help', 'help'):
        print(__doc__)
        return 0
    cmd, args = argv[0], list(argv[1:])
    if cmd == 'serve':
        serve(cfg)
        return 0
    book = book or Book(cfg)
    book.tick()
    con = book.db
    stamp = lambda: now_iso(book.cfg.clock)      # noqa: E731
    place = None
    if '--place' in args:
        i = args.index('--place')
        if i + 1 >= len(args):
            print('Which place? For example: --place recursite')
            return 2
        place, args = args[i + 1], args[:i] + args[i + 2:]
    pw, pa = (' AND place = ?', [place]) if place else ('', [])

    def ids():
        out = []
        for a in args:
            a = a.lstrip('#')
            if not re.fullmatch(r'\d{1,12}|[A-Za-z0-9_-]{8}', a):
                print(f'"{a[:20]}" is not a note number or public id.')
                continue
            r = con.execute('SELECT id FROM notes WHERE id = ? OR public_id = ?', (int(a) if a.isdigit() else -1, a)).fetchone()
            if r:
                out.append(r['id'])
            else:
                print(f'No note {a}.')
        return out

    if cmd in ('approve', 'reject', 'hide', 'unhide', 'delete', 'show') and not args:
        print('Which notes? Give their numbers (or public ids).')
        return 2
    if cmd == 'mode':
        mode, why = book.mode()
        print(f'{mode} ({why})')
    elif cmd in ('pending', 'held'):
        show_rows(con, con.execute(f"SELECT * FROM notes WHERE status = 'pending'{pw} ORDER BY id", pa).fetchall())
        if book.get_state('breaker'):
            print(f'Note: the flood breaker has tripped, so new notes are held. `breaker reset` when you are ready (it resets itself after {BREAKER["quiet"] // 3600} quiet hours).')
    elif cmd == 'recent':
        n = int(args[0]) if args and args[0].isdigit() else 20
        show_rows(con, con.execute(f"SELECT * FROM notes WHERE status = 'approved'{pw} ORDER BY id DESC LIMIT ?", (*pa, n)).fetchall())
    elif cmd == 'list':
        where = 'WHERE 1' if '--all' in args else f'WHERE {Book.PUBLISHED}'
        show_rows(con, con.execute(f'SELECT * FROM notes {where}{pw} ORDER BY id DESC', pa).fetchall())
    elif cmd == 'show':
        show_rows(con, [con.execute('SELECT * FROM notes WHERE id = ?', (i,)).fetchone() for i in ids()], full=True)
    elif cmd in ('approve', 'reject'):
        status = 'approved' if cmd == 'approve' else 'rejected'
        n = sum(con.execute('UPDATE notes SET status = ?, decided_at = ?, hidden = 0, hidden_by = NULL, immune = ? WHERE id = ?',
                            (status, stamp(), 1 if cmd == 'approve' else 0, i)).rowcount for i in ids())
        print(f"{n} note(s) {'published' if cmd == 'approve' else 'rejected'}.")
    elif cmd in ('hide', 'unhide'):
        on = cmd == 'hide'
        n = sum(con.execute('UPDATE notes SET hidden = ?, hidden_by = ?, hidden_at = ?, immune = ? WHERE id = ?',
                            (1 if on else 0, 'Anna' if on else None, stamp() if on else None, 0 if on else 1, i)).rowcount for i in ids())
        print(f"{n} note(s) {'hidden' if on else 'shown again'}.")
    elif cmd == 'delete':
        n = 0
        for i in ids():
            n += con.execute('DELETE FROM notes WHERE id = ?', (i,)).rowcount
            con.execute('DELETE FROM reports WHERE note_id = ?', (i,))
        print(f'{n} note(s) deleted.')
    elif cmd == 'reports':
        show_rows(con, con.execute('SELECT * FROM notes WHERE id IN (SELECT note_id FROM reports) ORDER BY id DESC').fetchall(), full=True)
    elif cmd in ('block', 'unblock'):
        if not args or any(not re.fullmatch(r'[0-9a-f]{6,24}', a) for a in args):
            print('Give the first six or more characters of a sender (shown after "from" in held, show, recent).')
            return 2
        for a in args:
            if cmd == 'block':
                con.execute('INSERT OR REPLACE INTO blocks (prefix, created_at) VALUES (?, ?)', (a, stamp()))
            else:
                con.execute('DELETE FROM blocks WHERE prefix = ?', (a,))
        print(f"{len(args)} sender(s) {'blocked for up to ' + str(FORGET_DAYS) + ' days' if cmd == 'block' else 'unblocked'}.")
    elif cmd == 'blocks':
        rows = con.execute('SELECT * FROM blocks ORDER BY created_at').fetchall()
        print('\n'.join(f"{r['prefix']}  since {r['created_at'][:16].replace('T', ' ')}" for r in rows) or '(nobody)')
    elif cmd == 'breaker':
        tripped = book.get_state('breaker')
        if args and args[0] == 'reset':
            book.set_state('breaker', None)
            print('The breaker is reset. ' + ('Notes appear at once again.' if cfg.mode == 'instant' else 'GB_MODE is review, so notes still wait for you.')
                  + (' Notes it pulled back are in `held`.' if tripped else ''))
        else:
            print(f'Tripped at {tripped}: new notes are held until `breaker reset` (or {BREAKER["quiet"] // 3600} quiet hours).' if tripped
                  else f'Not tripped ({BREAKER["notes"]} notes from {BREAKER["senders"]}+ senders within {BREAKER["window"] // 60} minutes would trip it).')
    elif cmd == 'digest':
        try:
            hours = float(args[args.index('--hours') + 1]) if '--hours' in args else 24
        except (ValueError, IndexError):
            print('For example: digest --hours 24')
            return 2
        since = book.ago(hours * 3600)
        rows = con.execute('SELECT * FROM notes WHERE created_at >= ? ORDER BY id', (since,)).fetchall()
        held = [r for r in rows if r['status'] == 'pending']
        pub = [r for r in rows if r['status'] == 'approved']
        reported = con.execute('SELECT COUNT(DISTINCT note_id) FROM reports WHERE created_at >= ?', (since,)).fetchone()[0]
        if not rows and not reported and not book.get_state('breaker'):
            return 0                                 # nothing new: print nothing (cron mails only when there is news)
        print(f'The guest book, the last {hours:g} hours: {len(pub)} published, {len(held)} held, {reported} note(s) reported. Mode: {book.mode()[0]}.')
        for title, group in (('Held for you', held), ('Published', pub)):
            if group:
                print(f'\n{title}:')
                show_rows(con, group)
    elif cmd == 'export':
        where = 'WHERE 1' if '--all' in args else f'WHERE {Book.PUBLISHED}'
        rows = con.execute(f'SELECT id, public_id, name, text, place, created_at, status, hidden, decided_at FROM notes {where}{pw} ORDER BY id', pa).fetchall()
        json.dump([dict(r) for r in rows], sys.stdout, ensure_ascii=False, indent=1)
        print()
    elif cmd == 'backup':
        keep = '--with-hashes' in args
        args = [a for a in args if a != '--with-hashes']
        if len(args) != 1:
            print('Give a file to write: backup /path/to/copy.db')
            return 2
        fd = os.open(args[0], os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
        os.close(fd)
        dest = sqlite3.connect(args[0])
        con.backup(dest)
        if not keep:                                 # a copy that cannot be matched to anyone
            dest.execute('UPDATE notes SET ip_hash = NULL')
            dest.execute("UPDATE reports SET sender = 'r' || rowid")
            dest.execute('DELETE FROM blocks')
            dest.execute("DELETE FROM state WHERE key LIKE 'hashkey:%'")
            dest.commit()
            dest.execute('VACUUM')
        dest.close()
        os.chmod(args[0], 0o600)
        print(f'Copied to {args[0]}' + (' (with sender hashes and keys: keep it as private as the server).' if keep else ' (without sender hashes or keys).'))
    else:
        print(f'Unknown command {cmd!r}. Try: held, recent, list, show, approve, reject, hide, unhide, delete, reports, block, unblock, blocks, breaker, digest, mode, export, backup, serve.')
        return 2
    return 0


if __name__ == '__main__':
    sys.exit(moderate(sys.argv[1:]))
