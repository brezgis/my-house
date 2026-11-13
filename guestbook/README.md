# The guest book

A very small service that keeps the notes visitors leave in Anna's guest book. It is one book with several
doors: the mailbox by the gate of Anna's House (house.brezgis.com) and the guestbook page of the recursite
(recursite.brezgis.com/guestbook/). Every door shows every note, each marked with where it was written.

It is two Python files using only the standard library: `guestbook.py` (the service and the moderation
commands) and `screens.py` (cleaning, and what holds a note back). There is no pip and no database server;
notes are kept in SQLite.

Nothing here is deployed. These are the steps for samovar, to be done when Anna says so.

**Where things live.** The house and the recursite are static sites on GitHub Pages. They cannot run a program
or keep a database, so the service lives on its own subdomain on samovar: **guestbook.brezgis.com**. The PAGES
live where they always have: the mailbox is part of house.brezgis.com, and the guestbook page is
**recursite.brezgis.com/guestbook/**. Both pages talk to the SERVICE at **guestbook.brezgis.com** from the
visitor's browser.

## Who a "sender" is

Limits are kept per **sender**: an IPv4 address, or an IPv6 **/64**. A /64 is one household or one server,
however many addresses it rotates through. A sender is known only by a keyed hash.
- The key is made fresh each month and kept in the database. Last month's key is kept for matching, and older
  keys are thrown away, so old hashes can never be recomputed.
- Every hash, report and block is erased after 30 days. This runs at start-up and then at most hourly, whether
  or not anyone posts.

## How a note gets in

A note **appears at once** unless something holds it back. Then it waits for Anna, and the writer sees it as
"waiting for Anna to read it". They are never told why, and nothing about it looks like an error.

**Cleaning comes first, always.** Before anything else:
- Control characters, zero-width characters, bidi overrides and "blank" letters (Hangul fillers, the braille
  blank) are removed. The two joiners stay, because emoji sequences and Persian need them.
- More than two combining marks on a letter are cut ("zalgo").
- More than 10 line breaks are joined with spaces, and spaces and blank lines are tidied.
- A note needs at least two visible letters, digits or emoji. A name with nothing visible becomes "no name".

**Then, in order:**

1. **Dropped silently** (the visitor is told "waiting", and nothing is kept):
   - a filled honeypot field;
   - a form sent back less than 4 seconds after it was shown;
   - a form used a second time;
   - a blocked sender.
2. **Refused, with a kind message:**
   - empty, or over 400 letters; a name over 40;
   - an unknown place;
   - a form that is missing, more than 2 hours old, or not this sender's. This one carries `"code": "form"`;
     both pages then fetch a fresh form quietly and send again.
   - a sender past their own limit: a burst of 3 notes, then 4 an hour;
   - only as a last resort, when 500 notes are held even after squeezing (step 3), "the mailbox is full".
3. **Held for Anna:**
   - **link**: anything that looks like a link or a way to get in touch:
     - `http://` (and `hxxp://`), `www.`, any lower-case domain (`farmacia.es`, `youtu.be`);
     - a domain spelled with fullwidth, ideographic, `[.]` or `(.)` dots, or spaced out (`evil . c o m`);
     - a bare IP address;
     - an email address (with `[at]`/`[dot]` too), "dot com" written out;
     - an @handle, an Instagram, Discord or TikTok handle;
     - a phone number of 7 or more digits (dates and years are not phone numbers);
     - WhatsApp/Telegram-style invitations.
   - **words**: a small built-in list of slurs and gross abuse, plus an optional words file on the server.
     - Text is read as a person would read it: NFKC-folded, case-folded, accents stripped.
     - Cyrillic and Greek look-alike letters are read as Latin, but only in words that are already partly
       Latin or in text that is mostly Latin, so Russian and Greek notes are untouched.
     - `sh1t`, `$hit`, `f*ck`, `f.u.c.k`, `phuck`, `fvck` and `f u c k` are read as the words they spell;
       stretched letters are collapsed.
     - Matching is on whole words only, so Scunthorpe, Penistone, Sussex, cocktail, therapist, Niger, spicy
       and grapes pass.
     - **Words that are innocent in other languages** (Danish *kys*, Swedish *slut*, French *retard* and
       *râpé*) count only in text written entirely in plain English letters. A note with any accented or
       non-Latin letter is read as not-English for these few words.
     - The name is screened the same way.
   - **markup**: real tags (`<b>…>`, `<script`), `javascript:`, `onerror=`, entities, and template and SQL
     injection strings. A lone `<`, `<3` and `2 < 3` are fine. Everything is stored as plain text either way.
   - **tricks**:
     - an unbroken run of 40 characters (scripts written without spaces, Chinese, Japanese, Korean and Thai,
       do not count toward it);
     - more than half punctuation or non-emoji symbols (emoji are fine);
     - a wall of capitals (40+ letters, 80% capitals);
     - one character 12 times running;
     - one word making up half the note.
   - **duplicate**: the same text (20 or more letters) as a published note from someone else in the last 7
     days. Short greetings ("Thank you!") are never duplicates, and held notes never count, so they cannot be
     used to poison the check. **repeat**: a sender's near-identical note within 24 hours.
   - **allowance**: a sender may have **2 notes a day appear at once**. Further notes are taken but held.
   - **pace**: the whole book publishes at most a burst of 30, then 60 an hour. Past that, notes are held,
     never refused.
   - **breaker**: if 12 notes have appeared at once in 10 minutes **from at least 3 different senders**, the
     breaker trips:
     - the notes that appeared in those 10 minutes are pulled back to held (except any Anna approved herself);
     - the book goes to review mode;
     - it resets itself after **6 quiet hours**, or at once with `breaker reset`.
     One sender can never trip it: their own allowance holds them first.
   - **review**: everything, in review mode (`GB_MODE=review`, the kill switch).
4. Otherwise, **published**.

**When the mailbox is crowded:** from 450 held notes, the oldest held notes of senders with several held notes
are dropped first, before anyone is told the mailbox is full.

**After the fact:**
- Anna can hide a published note at once (`hide`) and bring it back (`unhide`). A note she approves or unhides
  can no longer be hidden by reports.
- Visitors can **report** a note. A report counts toward hiding only if:
  - it comes with a form from a recent visit (someone who really loaded the book);
  - the reporter has made no other counting report that day.
- Reports from **3 different senders** hide a note until Anna looks, but **no more than 3 notes a day** across
  the whole book. Past that, reports only flag notes for her. Reports cannot be used to empty the book.

## The API

- `GET /notes?page=N` and optionally `&place=P`: published notes, newest first, eight to a page.
  - Returns `{"notes": [{"id", "name", "text", "date", "at", "place"}], "page", "pages", "total", "form"}`.
  - `id` is a short public id, used for reporting. `date` is the UTC day; `at` is the full UTC time, which the
    pages show in the reader's own time zone.
  - `page` is clamped to the last page. An unknown place gets 400.
  - `form` is a token signed for this sender, good for one note within 2 hours.
  - Held, hidden, rejected and deleted notes never appear, and neither do hashes or screening results.
- `POST /notes` with JSON `{"name", "text", "place", "form", "website"}`.
  - Returns `202 {"ok": true, "status": "published", "note": {...}}`, or `202 {"ok": true, "status": "pending"}`.
  - `place` is one of `GB_PLACES` (`house`, `recursite`; `town` is reserved). A note with no `place` (or `null`)
    is taken as `house`, so a copy of the house's first page cached in someone's browser keeps working.
- `POST /notes/<id>/report`, with an empty body or JSON `{"reason", "form"}`.
  - The answer is always `202 {"ok": true}`, whatever the id.
  - A burst of 5 reports, then 10 an hour, per sender.
- `OPTIONS` answers the CORS preflight. `GET /health` returns `{"ok": true}`.

**Defaults** (all in one block at the top of `guestbook.py`):

| Setting | Default |
| --- | --- |
| request body | 4 KB at most |
| form token | good for 2 hours and once; a note sent sooner than 4 s after its form is dropped |
| per sender | a burst of 3 notes then 4 an hour; 2 published at once a day |
| everyone together | a burst of 30 published at once, then 60 an hour (then held) |
| breaker | 12 notes from 3+ senders in 10 minutes; resets after 6 quiet hours |
| reports | 3 senders hide a note; at most 3 automatic hides a day |
| held notes | 500 at most; squeezing starts at 450 |
| hashes, reports, blocks | forgotten after 30 days |
| connections | 64 at once; a silent connection is cut after 5 s; every connection is cut after 20 s in all (a whole-request deadline, not a per-read one) |

**Logged:** the method, a cleaned path (report ids replaced by `*`, anything but printable ASCII removed) and the
status. No addresses and no bodies. Errors write one line with no address and no traceback. The optional
notify log (below) has a number, a place and a name per note, never an address.

**Settings (environment):**

| Setting | Default | What it is |
| --- | --- | --- |
| `GB_HOST`, `GB_PORT` | 127.0.0.1, 8790 | where it listens |
| `GB_DB` | `./data/notes.db` | the database |
| `GB_SALT` | next to the database | signs form tokens; it no longer has anything to do with addresses |
| `GB_ORIGINS` | `https://house.brezgis.com,https://recursite.brezgis.com,http://localhost:8791,http://127.0.0.1:8791` | an explicit list, matched exactly |
| `GB_PLACES` | `house,recursite` | where a note may come from |
| `GB_MODE` | `instant` | `instant` or `review` |
| `GB_WORDS` | `words.txt` next to the database | extra screened words; optional, never in the repository |
| `GB_NOTIFY_LOG` | off | see below |
| `GB_TRUST_PROXY` | 1 | take the address from `X-Real-IP` only when the connection comes from 127.0.0.1 |

**Older databases** are brought up to date once, at start-up: missing columns are added, old notes are marked
`house`, and each note gets a public id. Requests never touch the schema. A `GET` writes nothing, except the
hourly forgetting.

## Tests

    cd guestbook && python3 -m unittest -v

The 68 tests cover:
- cleaning; every screen, with a table of sincere notes in eleven languages, with emoji, dates and `<3`;
- the bypasses from the security review (look-alikes, fillers, spellings, disguised links);
- review and instant modes; the daily allowance, the pace and the held cap;
- the breaker (several senders needed, pull-back, self-reset, reset by hand);
- reports (one /64 is one reporter, reports without a form only flag, the daily cap, approved notes immune);
- single-use and sender-bound forms; blocks;
- forgetting without any post, discarded keys, backups without hashes;
- that a GET writes nothing and never sets up the schema; places and migration;
- and over real HTTP:
  - exact CORS for both sites;
  - `X-Real-IP` and IPv6 senders, with and without a trusted proxy;
  - refusals closing the connection (no keep-alive desync);
  - deep and malformed JSON;
  - a clean log, and the error path's one quiet line;
  - a trickling connection cut off; `MAX_CONN` and recovery; steady file descriptors.

The `Proof*` classes are the security review's proof scripts made into tests.

## Deploying on samovar (Ubuntu 24.04, nginx, certbot, Python 3.12)

Point a DNS A record (and AAAA, if samovar has IPv6) for **guestbook.brezgis.com** at samovar, then:

1. **A user, the code, the settings.**

       sudo useradd --system --home /var/lib/guestbook --shell /usr/sbin/nologin guestbook
       sudo install -d -o root -g root -m 755 /opt/guestbook
       sudo install -o root -g root -m 644 guestbook.py screens.py /opt/guestbook/
       sudo install -o root -g guestbook -m 640 /dev/null /etc/guestbook.env
       sudoedit /etc/guestbook.env

   with these lines in `/etc/guestbook.env`:

       GB_HOST=127.0.0.1
       GB_PORT=8790
       GB_DB=/var/lib/guestbook/notes.db
       GB_SALT=/var/lib/guestbook/salt
       GB_ORIGINS=https://house.brezgis.com,https://recursite.brezgis.com
       GB_PLACES=house,recursite
       GB_MODE=instant
       GB_NOTIFY_LOG=/var/lib/guestbook/new.log

   (Leave out the last line to keep the notifier off.)

2. **The service**: `/etc/systemd/system/guestbook.service`

       [Unit]
       Description=Guest book for Anna's House and the recursite
       After=network.target

       [Service]
       User=guestbook
       Group=guestbook
       EnvironmentFile=/etc/guestbook.env
       ExecStart=/usr/bin/python3 /opt/guestbook/guestbook.py serve
       StateDirectory=guestbook
       StateDirectoryMode=0700
       UMask=0077
       Restart=on-failure
       NoNewPrivileges=yes
       CapabilityBoundingSet=
       AmbientCapabilities=
       ProtectSystem=strict
       ReadWritePaths=/var/lib/guestbook
       ProtectHome=yes
       PrivateTmp=yes
       PrivateDevices=yes
       PrivateUsers=yes
       ProtectKernelTunables=yes
       ProtectKernelModules=yes
       ProtectKernelLogs=yes
       ProtectControlGroups=yes
       ProtectHostname=yes
       ProtectClock=yes
       ProtectProc=invisible
       ProcSubset=pid
       RestrictAddressFamilies=AF_INET AF_INET6 AF_UNIX
       IPAddressDeny=any
       IPAddressAllow=localhost
       RestrictNamespaces=yes
       RestrictRealtime=yes
       RestrictSUIDSGID=yes
       RemoveIPC=yes
       LockPersonality=yes
       MemoryDenyWriteExecute=yes
       SystemCallArchitectures=native
       SystemCallFilter=@system-service
       SystemCallErrorNumber=EPERM
       MemoryMax=128M
       TasksMax=96

       [Install]
       WantedBy=multi-user.target

   - `systemd-analyze verify` accepts this unit.
   - The service was run and took a note under `SystemCallFilter=@system-service`, `MemoryDenyWriteExecute`,
     `IPAddressDeny=any`/`IPAddressAllow=localhost` and `ProtectSystem=strict`. That run was a transient unit
     in a user manager, which cannot apply every option.
   - If the service will not start on samovar, `journalctl -u guestbook` names the option. `PrivateUsers=` and
     `ProtectProc=` are the likeliest to need removing on an unusual kernel.

   Then:

       sudo systemctl daemon-reload
       sudo systemctl enable --now guestbook
       curl -s http://127.0.0.1:8790/health                   # {"ok": true}
       sudo systemctl status guestbook --no-pager             # "guest book listening on 127.0.0.1:8790, instant (GB_MODE=instant)"

3. **The certificate, without letting certbot rewrite nginx.** Write both server blocks by hand (step 4) and
   get the certificate with certbot's **webroot** method, so that certbot never edits them.
   - First, only the port-80 block from step 4 is enabled. It answers the ACME challenge from
     `/var/www/letsencrypt`.

         sudo install -d -m 755 /var/www/letsencrypt
         sudo nginx -t && sudo systemctl reload nginx
         sudo certbot certonly --webroot -w /var/www/letsencrypt -d guestbook.brezgis.com \
              --deploy-hook "systemctl reload nginx"

   - Renewals then run the same way with no edits to nginx (`sudo certbot renew --dry-run` checks).

4. **nginx**: `/etc/nginx/sites-available/guestbook`. No log on samovar may hold a guest-book visitor's
   address, so:
   - both server blocks for this name log with an address-free format, and paths are logged as fixed labels;
   - this server's errors go nowhere.

   What that loses: nginx's own error messages for this site (upstream failures, timeouts). The service's own
   log (`journalctl -u guestbook`) still says what went wrong, without addresses. Global nginx errors (bad
   config at reload) still go to the main error log.

       # --- in the http context (this file is included inside http {} on Ubuntu) ---
       # nginx's own limits key on the address. The app keys IPv6 on the /64 itself;
       # these are a coarse first line.
       limit_req_zone  $binary_remote_addr zone=guestbook:1m rate=30r/m;
       limit_conn_zone $binary_remote_addr zone=guestbook_conn:1m;
       map $uri $guestbook_path {
           /notes                        /notes;
           ~^/notes/[A-Za-z0-9_-]+/report$ /notes/*/report;
           /health                       /health;
           ~^/\.well-known/acme-challenge/ /acme;
           default                       other;
       }
       log_format guestbook_noip '$time_iso8601 $request_method $guestbook_path $status $body_bytes_sent';

       server {
           listen 80;
           listen [::]:80;
           server_name guestbook.brezgis.com;
           server_tokens off;
           access_log /var/log/nginx/guestbook.access.log guestbook_noip;
           error_log /dev/null crit;
           location /.well-known/acme-challenge/ { root /var/www/letsencrypt; }
           location / { return 301 https://guestbook.brezgis.com$request_uri; }
       }

       server {
           listen 443 ssl http2;            # (nginx 1.24 on Ubuntu 24.04; from 1.25 this is written `listen 443 ssl;` plus `http2 on;`)
           listen [::]:443 ssl http2;
           server_name guestbook.brezgis.com;
           server_tokens off;
           ssl_certificate     /etc/letsencrypt/live/guestbook.brezgis.com/fullchain.pem;
           ssl_certificate_key /etc/letsencrypt/live/guestbook.brezgis.com/privkey.pem;
           add_header Strict-Transport-Security "max-age=31536000" always;
           access_log /var/log/nginx/guestbook.access.log guestbook_noip;
           error_log /dev/null crit;
           client_max_body_size 4k;
           client_body_timeout 10s;
           client_header_timeout 10s;
           send_timeout 15s;
           limit_conn guestbook_conn 10;
           location = /health { proxy_pass http://127.0.0.1:8790; }
           location ~ "^/notes(/[A-Za-z0-9_-]{8}/report)?$" {      # quoted: nginx needs quotes round a pattern with braces
               limit_req zone=guestbook burst=20 nodelay;
               proxy_pass http://127.0.0.1:8790;
               proxy_http_version 1.1;
               proxy_set_header Connection "";
               proxy_set_header Host $host;
               proxy_set_header X-Real-IP $remote_addr;
               proxy_connect_timeout 3s;
               proxy_send_timeout 15s;
               proxy_read_timeout 15s;
               proxy_request_buffering on;      # nginx reads the whole (small) body before the app sees anything
               proxy_buffering on;
           }
           location / { return 404; }
       }

   For step 3, enable it with only the first `server` block present (or the second one commented out). Once the
   certificate exists, add the second and reload:

       sudo ln -s /etc/nginx/sites-available/guestbook /etc/nginx/sites-enabled/
       sudo nginx -t && sudo systemctl reload nginx
       curl -s https://guestbook.brezgis.com/health
       sudo tail -2 /var/log/nginx/guestbook.access.log        # e.g. "2027-01-01T12:00:00+00:00 GET /health 200 12": no address

   Also check that nothing else logs the address. If the main `nginx.conf` has a default `access_log` at the http
   level, it is overridden by the lines above for this site. Other sites keep their own.

5. **Open the doors.**
   - In the house, set this in `site/src/guestbook.js`:

         export const GUESTBOOK_URL = 'https://guestbook.brezgis.com';

   - In the recursite, set it in the one constant at the top of the script in `guestbook/index.html` (the
     recursite keeps each page's script inline):

         const GUESTBOOK_URL = 'https://guestbook.brezgis.com';

   - Publish each as usual.

   Until these are set, the mailbox in the garden still opens and says the guest book is not open yet. The
   recursite page says the guestbook is temporarily out of order.

## The kill switch: instant or review

    sudo sed -i 's/^GB_MODE=.*/GB_MODE=review/' /etc/guestbook.env && sudo systemctl restart guestbook     # every note waits for you
    sudo sed -i 's/^GB_MODE=.*/GB_MODE=instant/' /etc/guestbook.env && sudo systemctl restart guestbook    # notes appear at once again

`gb mode` (below) says which it is in and why. If the flood breaker has tripped, it says so. `gb breaker reset`
lets notes flow again without a restart.

## Reading the post (moderation)

Run these on samovar as the service's user, with the same settings:

    alias gb='sudo -u guestbook env $(sudo cat /etc/guestbook.env | xargs) python3 /opt/guestbook/guestbook.py'
    gb mode                    # instant or review, and why
    gb held                    # what is waiting for you, oldest first, with the reason (link, words, allowance, breaker, ...)
    gb recent 20               # the latest published notes, with place and anything the screens noticed
    gb show 12                 # one note in full, with any reports (12, or its public id)
    gb approve 12 13           # publish held notes; reports can no longer hide them
    gb reject 14               # keep a held note out of sight (kept, never shown)
    gb hide 15                 # take a published note down at once;  gb unhide 15  puts it back (and protects it)
    gb delete 14               # remove a note for good
    gb reports                 # reported notes, with reasons ("flag only" marks reports that could not hide anything)
    gb block 3fa9c2d1          # refuse a sender (the 8 characters after "from" in held/recent/show), for up to 30 days
    gb unblock 3fa9c2d1;  gb blocks
    gb breaker                 # has the flood breaker tripped?   gb breaker reset   lets notes flow again
    gb list --place recursite  # what is public from one door;  --all  for everything
    gb export > notes.json     # the public notes as JSON;  export --all  for everything (never hashes)

## Hearing about new notes (optional, off by default)

- **A log to tail.** With `GB_NOTIFY_LOG` set, the service appends one line (mode 600) for:
  - every new note, published or HELD, with the reason;
  - every report and automatic hide;
  - the breaker tripping and resetting.

  Each line has a number, a place and a name, never an address. Follow it with:

      sudo tail -f /var/lib/guestbook/new.log

- **A daily digest.** `gb digest` prints what came in over the last 24 hours (`--hours N` for another span).
  It prints nothing at all when there is nothing new, which suits cron: cron mails a command's output only when
  there is some, if samovar has local mail. Add it with `sudo crontab -u guestbook -e`:

      0 8 * * *  env $(cat /etc/guestbook.env | xargs) python3 /opt/guestbook/guestbook.py digest

There is no email-sending code and no third-party service. Nothing is enabled until you set it up.

## Security: what could go wrong, and what handles it

- **Stored or reflected XSS.**
  - Notes are stored as plain text and both pages draw them with `textContent` only.
  - The API sends JSON with `X-Content-Type-Options: nosniff` and a `default-src 'none'` CSP.
  - Markup is held.
- **Cross-site posting.**
  - POST needs an `Origin` exactly on the allow-list (no trailing-slash or case games) and a JSON body, which
    forces a CORS preflight.
  - There are no cookies.
  - Each note needs a form fetched by the same sender, at least 4 s and at most 2 hours earlier, used once.
- **One person posing as many** (the review's finding 1).
  - Every limit keys on the sender: an IPv6 /64 is one sender.
  - Instant publishing is rationed per sender, and the global pace holds rather than refuses.
  - The breaker needs several senders, pulls the burst back and resets itself.
  - Reports need real visits, count once a day per reporter and hide at most 3 notes a day.
  - The held cap squeezes repeat senders first.
- **Screen bypasses.** Look-alikes, fillers, alternative spellings and disguised links are folded before
  screening (the review's finding 2; tested).
- **SQL injection.**
  - Every value is a bound parameter.
  - The only strings built into SQL are constants (the published clause, fixed `place = ?` and `IN (?, ?)`
    fragments, and table and column names from the `COLUMNS` list at start-up).
  - Checked with `grep -n "execute(f" guestbook.py`.
- **Oversized bodies, smuggling, slow clients.**
  - nginx caps bodies at 4 KB and buffers them, times out headers and bodies, and limits connections.
  - The app checks `Content-Length` again, closes the connection after every refused request (so an unread
    body can never be read as the next request), cuts silent connections after 5 s and every connection after
    20 s in all, and turns away more than 64 at once.
  - Deep JSON is a 400.
- **Path tricks.** No files are served. The service answers exactly `/notes`, `/notes/<8 characters>/report`
  and `/health`; anything else is 404.
- **Privacy.**
  - No address is stored or logged, by the app or by nginx.
  - Hashes use a monthly key that is thrown away, and are erased after 30 days whether or not anyone posts.
  - `X-Real-IP` is trusted only from 127.0.0.1.
  - No cookies, no tracking, no third parties.
- **Logs.**
  - The request log has printable ASCII only (no terminal-escape tricks), no addresses and no bodies.
  - Errors are one quiet line; http.server's own errors and tracebacks are replaced.
- **The process.** It runs as the unprivileged `guestbook` user with the hardened unit above. The database,
  WAL, salt and log are mode 600 in a 700 directory.

## Backups

    gb backup /var/lib/guestbook/notes-$(date +%F).db      # a consistent copy, mode 600, safe while it runs

- **By default the copy holds no sender hashes, no hash keys and no blocks.** It cannot be matched to anyone,
  and it can be kept anywhere you would keep the notes themselves.
- `--with-hashes` makes a full copy. Keep that as private as the server, and only as long as you need to.
- The `salt` file only signs form tokens. A new one simply makes open pages fetch a fresh form, so it does not
  need backing up.
- To restore:
  1. stop the service;
  2. put the copy back as `notes.db` (owner `guestbook`, mode 600);
  3. start the service.

## Trying it on another machine

    cd guestbook
    GB_PORT=8795 GB_ORIGINS=http://localhost:8791 python3 guestbook.py serve
    # and open the house at http://localhost:8791/?guestbook=http://127.0.0.1:8795

The `?guestbook=` override works only away from the real sites, and only for localhost or 127.0.0.1 (the house
also accepts its own host). The local data goes in `guestbook/data/`, which git ignores.
