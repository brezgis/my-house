"""Screens for the guest book: what is cleaned from every note, and what holds a note back for Anna.

Standard library only. Nothing here rejects a sincere note: cleaning removes characters that are
never wanted, and screening names the reasons a note should wait for Anna instead of appearing at
once. The writer is never told which rule held their note.

All the knobs are in SCREEN below. The rules are meant for a guest book: ordinary kind notes in any
language, with emoji, dates and "<3", must publish (tested).
"""

import codecs
import difflib
import os
import re
import unicodedata

SCREEN = {
    'max_name': 40, 'min_text': 2, 'max_text': 400,
    'max_lines': 10,           # more line breaks than this are joined with spaces
    'max_marks': 2,            # combining marks kept on one letter (more is "zalgo")
    'long_run': 40,            # an unbroken run of this many characters (not counting scripts written without spaces) is held
    'junk_share': 0.5,         # held if more than this share of 8+ visible characters are punctuation or non-emoji symbols
    'caps_letters': 40,        # a wall of capitals: at least this many letters...
    'caps_share': 0.8,         # ...of which this share are capitals
    'char_repeat': 12,         # the same character this many times in a row
    'word_repeat': 0.5,        # one word making up this share of 8+ words
    'dup_min': 20,             # texts shorter than this (letters and digits) are never "duplicates" of other people's
    'dup_days': 7,             # the same text as a published note from someone else in this many days is held
    'sender_hours': 24,        # a sender's near-identical notes within this many hours are held
    'sender_similar': 0.85,    # how alike counts as near-identical (difflib ratio)
}

# ---- Cleaning (always, before anything is stored) ----------------------------------------------------
KEEP_FORMAT = {'‌', '‍'}                 # zero-width (non-)joiners: needed in emoji sequences and Persian
BLANKS = {'ㅤ', 'ᅟ', 'ᅠ', 'ﾠ', '⠀', '᠎'}      # "letters" that draw nothing


def clean(s, keep_newlines):
    """Plain text: NFC; no control, format (zero-width, bidi override) or blank-drawing characters,
    except the joiners; at most a couple of combining marks per letter; tidy space and lines."""
    if not isinstance(s, str):
        return None
    s = unicodedata.normalize('NFC', s).replace('\r\n', '\n').replace('\r', '\n')
    out, marks = [], 0
    for ch in s:
        cat = unicodedata.category(ch)
        if ch == '\n':
            out.append('\n' if keep_newlines else ' ')
            marks = 0
        elif ch == '\t':
            out.append(' ')
        elif ch in KEEP_FORMAT:
            out.append(ch)
        elif ch in BLANKS or cat in ('Cc', 'Cf', 'Cs', 'Co', 'Cn') or ch in '  ':
            continue
        elif cat in ('Mn', 'Me'):
            marks += 1
            if marks <= SCREEN['max_marks']:
                out.append(ch)
        else:
            out.append(ch)
            marks = 0
    s = ''.join(out)
    s = re.sub(r'[  　]{2,}', ' ', s)
    s = re.sub(r' *\n *', '\n', s)
    s = re.sub(r'\n{3,}', '\n\n', s)
    s = s.strip()
    lines = s.split('\n')
    if len(lines) > SCREEN['max_lines'] + 1:
        s = '\n'.join(lines[:SCREEN['max_lines']]) + ' ' + ' '.join(x for x in lines[SCREEN['max_lines']:] if x)
    return s


def visible(s):
    """Characters that show: letters, digits, emoji and other symbols (not marks, joiners or space)."""
    return [ch for ch in s if not ch.isspace() and unicodedata.category(ch)[0] in 'LNS']


def validate(body):
    """(name, text) cleaned, or raises ValueError with a message fit to show a visitor."""
    if not isinstance(body, dict):
        raise ValueError('That did not look like a note.')
    name = clean(body.get('name', '') or '', False)
    text = clean(body.get('text', ''), True)
    if name is None or text is None:
        raise ValueError('That did not look like a note.')
    if not visible(name):
        name = ''
    if len(name) > SCREEN['max_name']:
        raise ValueError(f"Names can be up to {SCREEN['max_name']} letters long.")
    if len(text) < SCREEN['min_text'] or len(visible(text)) < 2:
        raise ValueError('The note is empty.')
    if len(text) > SCREEN['max_text']:
        raise ValueError(f"Notes can be up to {SCREEN['max_text']} letters long.")
    return name, text


# ---- Look-alikes ----------------------------------------------------------------------------------------
# Cyrillic and Greek letters that look like Latin ones. They are read as Latin only in a word that is
# already partly Latin, or (all look-alikes) in text that is mostly Latin: Russian and Greek stay Russian
# and Greek. Fullwidth and mathematical letters are folded by NFKC.
CONFUSABLE = str.maketrans({
    'а': 'a', 'в': 'b', 'е': 'e', 'ё': 'e', 'к': 'k', 'м': 'm', 'н': 'h', 'о': 'o', 'р': 'p', 'с': 'c', 'т': 't', 'у': 'y', 'х': 'x',
    'і': 'i', 'ї': 'i', 'ј': 'j', 'ѕ': 's', 'ԁ': 'd', 'ԛ': 'q', 'ԝ': 'w', 'ӏ': 'l', 'ɡ': 'g', 'ꮃ': 'w',
    'α': 'a', 'β': 'b', 'ε': 'e', 'η': 'n', 'ι': 'i', 'κ': 'k', 'ν': 'v', 'ο': 'o', 'ρ': 'p', 'τ': 't', 'υ': 'u', 'χ': 'x', 'γ': 'y', 'ω': 'w',
})
_CONF_SET = set('авеёкмнорстухіїјѕԁԛԝӏɡꮃαβεηικνορτυχγω')


def _script(ch):
    n = unicodedata.name(ch, '')
    return 'latin' if n.startswith('LATIN') else 'cyrillic' if n.startswith('CYRILLIC') else 'greek' if n.startswith('GREEK') else 'other'


def fold(s):
    """NFKC, case-folded, look-alikes read as Latin where the text is Latin-shaped, accents stripped."""
    s = unicodedata.normalize('NFKC', s).casefold()
    letters = [ch for ch in s if ch.isalpha()]
    latin_text = letters and sum(_script(ch) == 'latin' for ch in letters) / len(letters) >= 0.6
    out = []
    for word in re.split(r'(\s+)', s):
        ls = [ch for ch in word if ch.isalpha()]
        scripts = {_script(ch) for ch in ls}
        mixed = 'latin' in scripts and len(scripts) > 1
        all_conf = ls and all(ch in _CONF_SET or _script(ch) == 'latin' for ch in ls)
        out.append(word.translate(CONFUSABLE) if (mixed or (latin_text and all_conf)) else word)
    s = unicodedata.normalize('NFKD', ''.join(out))
    return ''.join(ch for ch in s if not unicodedata.combining(ch))


# ---- Links and ways to get in touch ---------------------------------------------------------------------
TLDS = 'com|net|org|io|co|ru|su|xyz|info|top|biz|ly|gg|tk|cn|uk|de|fr|nl|ca|au|app|dev|site|online|shop|store|club|link|live|life|click|win|vip|pro|cc|tv|ws|gl|page|ai'
# (in any case; endings that are also short words, 'in', 'me', 'to', 'it', 'be', 'us', 'es', are caught by the lower-case rule below,
#  so that "a lovely house.It was great" is not a link)
DOTS = str.maketrans({'。': '.', '｡': '.', '．': '.', '․': '.', '·': '.'})
LINKS = [
    re.compile(r'\bh[xt]{2}ps?\s*:\s*/\s*/', re.I),
    re.compile(r'\bwww\s*\.', re.I),
    re.compile(rf'\b[a-z0-9][a-z0-9-]*(\.[a-z0-9-]+)*\s*\.\s*({TLDS})\b(?!\.?[a-z])', re.I),
    re.compile(r'\b[a-z0-9][a-z0-9-]{1,62}\.[a-z]{2,24}(?=$|[/\s,;:!?)\]])'),           # any lower-case domain (a sentence run on without a space starts with a capital)
    re.compile(r'[a-z0-9._%+-]+\s*(@|\(at\)|\[at\]|\{at\})\s*[a-z0-9-]+(\s*(\.|\(dot\)|\[dot\]|\bdot\b)\s*[a-z]{2,})+', re.I),
    re.compile(rf'\b(dot|\(dot\)|\[dot\]|\{{dot\}})\s*({TLDS})\b', re.I),
    re.compile(r'[\[(]\s*\.\s*[\])]'),                                                     # evil[.]com, evil(.)com
    re.compile(r'\s\.\s*(c\s*o\s*m|n\s*e\s*t|o\s*r\s*g)\b', re.I),                         # evil . c o m
    re.compile(r'\b[a-z0-9-]{2,}\s+(com|net|org|ru|io)\s*/', re.I),                        # evil com/x
    re.compile(r'\b\d{1,3}(\.\d{1,3}){3}\b'),                                              # a bare IP address
    re.compile(r'(^|[\s(])@[a-z0-9_.]{2,}', re.I),
    re.compile(r'\b[a-z0-9_.]{2,}#\d{4}\b', re.I),                                         # a Discord tag
    re.compile(r'\b(t\.me|wa\.me|bit\.ly|discord\.gg|tinyurl|bitly|linktr\.?ee)\b', re.I),
    re.compile(r'\b(whats\s*app|telegram|signal|kik|snap\s*chat|wechat|onlyfans)\b', re.I),
    re.compile(r'\b(insta(gram)?|ig|snap|tiktok|discord|dsc|twitter|tg)\s*[:@]?\s*[a-z0-9_.]*[_.0-9][a-z0-9_.]*\b', re.I),
]
DATES = re.compile(r'\b(\d{1,2}[./-]\d{1,2}[./-]\d{2,4}|\d{4}[./-]\d{1,2}[./-]\d{1,2})\b')
PHONE = re.compile(r'\+?\(?\d[\d\s().\-/]{5,}\d')


def has_link(s):
    s = unicodedata.normalize('NFKC', s).translate(DOTS)
    if any(p.search(s) for p in LINKS):
        return True
    for m in PHONE.finditer(DATES.sub(' ', s)):
        groups = re.findall(r'\d+', m.group())
        if all(len(g) == 4 and g[:2] in ('19', '20') for g in groups):
            continue                                  # years, not a number to ring
        if len(''.join(groups)) >= 7:
            return True
    return False


# ---- Words ------------------------------------------------------------------------------------------
# A small built-in list of slurs and gross abuse, kept in ROT13 so that nobody reading this file meets
# them by accident: single words (whole words, with a few common endings), phrases (whole-word
# sequences), and a few words that are innocent in other languages (Danish "kys", Swedish "slut",
# French "retard" and "râpé"), which count only in text written in plain English letters. Extra entries
# can be kept on the server in a file the repository never sees (GB_WORDS; one per line, # for comments;
# a line with a space is a phrase).
_ROT_WORDS = """
shpx fuvg phag juber ovgpu zbgureshpxre
avttre avttn avtte avtnu snttbg snt qlxr genaal xvxr fcvp puvax jrgonpx tbbx
cnxv enturnq fnaqavttre pbbaf fdhnj ubgragbg cnrqb crqb crqbcuvyr encvfg fcnfgvp 1488
"""
_ROT_ENGLISH = 'xlf fyhg ergneq encr'
_ROT_PHRASES = "xvyy lbhefrys | xvyy lbhe frys | tb qvr | ubcr lbh qvr | arpx lbhefrys | urvy uvgyre | fvrt urvy | juvgr cbjre | 14 88"
ENDINGS = ('', 's', 'd', 'es', 'er', 'ers', 'ed', 'ing', 'in', 'y', 'z')      # for entries of five letters or more
SHORT_ENDINGS = ('', 's', 'd', 'es', 'er', 'ers', 'ed', 'ing')               # shorter ones ('y' would catch 'spicy')
SUBS = str.maketrans({'0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '8': 'b', '9': 'g', '@': 'a', '$': 's', '!': 'i', '|': 'l', '+': 't', '€': 'e', '£': 'l'})
FILLERS = '*#_.-~'                                     # inside a word, these stand for a hidden letter: f*ck, f.u.c.k


def _collapse(w):
    return re.sub(r'(.)\1+', r'\1', w)


def tokens(s):
    """Folded (above), look-alike digits and symbols read as letters, runs of three or more of a letter
    cut to two, split into words; runs of single letters ("f u c k") read as one word. A filler
    between letters is kept as '*' (a wildcard)."""
    s = fold(s).replace('‌', '').replace('‍', '')
    words = []
    for raw in re.split(r'\s+', s):
        raw = re.sub(r"^[\"'(\[]+|[!?.,;:'\")\]]+$", '', raw)            # punctuation round a word is not a disguised letter
        w = raw if raw.isdigit() else raw.translate(SUBS)
        w = re.sub(rf'(?<=[a-z])[{re.escape(FILLERS)}]+(?=[a-z])', '*', w)
        words.extend(re.sub(r'(.)\1{2,}', r'\1\1', p) for p in re.split(r'[^a-z0-9*]+', w) if p.strip('*'))
    out, run = [], []
    for w in words + ['']:
        if len(w) == 1 and w.isalpha():
            run.append(w)
            continue
        out.extend([''.join(run)] if len(run) >= 3 else run)
        run = []
        if w:
            out.append(w)
    return out


def load_words(extra_file=None):
    rot = lambda s: codecs.decode(s, 'rot13')      # noqa: E731
    words = rot(_ROT_WORDS).split()
    phrases = [p.strip() for p in rot(_ROT_PHRASES).split('|')]
    if extra_file and os.path.exists(extra_file):
        with open(extra_file, encoding='utf-8') as f:
            for line in f:
                e = line.split('#', 1)[0].strip()
                (phrases if ' ' in e else words).append(e)
    single = lambda ws: {t[0] for t in (tokens(w) for w in ws) if len(t) == 1}      # noqa: E731
    return single(words), [t for t in (tokens(p) for p in phrases) if t], single(rot(_ROT_ENGLISH).split())


def _variants(w):
    """The common spellings round a word: ph for f, v for u in a word with no vowel, k for ck."""
    vs = {w, w.replace('ph', 'f')}
    if not re.search('[aeiou]', w):
        vs |= {v.replace('v', 'u') for v in list(vs)}
    vs |= {v.replace('ck', 'k') for v in list(vs)}
    return vs


def _matches(w, b):
    """A word is a listed word if it is that word with an ordinary ending, or that word stretched out
    (a letter doubled that the word does not double: "fuuck"; "niger" is not stretched), or that word
    with a hidden letter (f*ck)."""
    ends = ENDINGS if len(b) >= 5 else SHORT_ENDINGS
    bk = b.replace('ck', 'k')
    for v in _variants(w):
        if '*' in v:
            pat = re.compile(v.replace('*', '[a-z]{0,2}') + '(' + '|'.join(ends) + ')')
            if pat.fullmatch(b) or pat.fullmatch(bk):
                return True
            continue
        for base in (b, bk):
            if v.startswith(base) and v[len(base):] in ends:
                return True
            cw, cb = _collapse(v), _collapse(base)
            if cw != v and len(v) > len(base) and cw.startswith(cb) and cw[len(cb):] in tuple(_collapse(e) for e in ends):
                return True
    return False


def bad_words(s, words):
    singles, phrases, english = words
    plain = all(ch.isascii() for ch in s if ch.isalpha())          # written in plain English letters only
    t = tokens(s)
    listed = singles | (english if plain else set())
    for w in t:
        if w.isdigit() or any(c.isdigit() for c in w):
            if w in listed:
                return True
            continue
        if any(_matches(w, b) for b in listed if not b.isdigit()):
            return True
    for p in phrases:
        n = len(p)
        if any(t[i:i + n] == p for i in range(len(t) - n + 1)) or ''.join(p) in t:
            return True
    return False


# ---- Markup and injection strings -------------------------------------------------------------------
MARKUP = [re.compile(p, re.I) for p in [
    r'<\s*/?\s*[a-z!?][^<>]{0,200}>', r'<\s*(script|iframe|img|svg|style|object|embed|link|meta|a\s)', r'javascript\s*:', r'data\s*:\s*text/html',
    r'\bon[a-z]+\s*=', r'&#x?[0-9a-f]+;?', r'<\?php', r'\{\{.*\}\}', r'\$\{.*\}', r'\b(union\s+select|drop\s+table|or\s+1\s*=\s*1)\b',
    r'\[url\s*=?', r'\[/?(img|link)\]',
]]


def has_markup(s):
    return any(p.search(s) for p in MARKUP)


# ---- Things that are not really writing -------------------------------------------------------------
SPACELESS = re.compile(r'[฀-๿ᄀ-ᇿ぀-ヿ㄀-ㄯ㄰-㆏㐀-䶿一-鿿가-힯豈-﫿ｦ-ﾟ]')


def is_emoji(ch):
    o = ord(ch)
    return 0x1f000 <= o <= 0x1faff or 0x2600 <= o <= 0x27bf or 0x2b00 <= o <= 0x2bff or 0x2190 <= o <= 0x21ff or ch in '❤♥❣'


def tricks(s):
    c = SCREEN
    if any(len(SPACELESS.sub('', run)) >= c['long_run'] for run in s.split()):
        return True
    vis = visible(s) + [ch for ch in s if unicodedata.category(ch)[0] == 'P']
    junk = [ch for ch in vis if unicodedata.category(ch)[0] == 'P' or (unicodedata.category(ch)[0] == 'S' and not is_emoji(ch))]
    if len(vis) >= 8 and len(junk) / len(vis) > c['junk_share']:
        return True
    letters = [ch for ch in s if ch.isalpha()]
    if len(letters) >= c['caps_letters'] and sum(ch.isupper() for ch in letters) / len(letters) > c['caps_share']:
        return True
    if re.search(r'([^\W\d_])\1{%d,}' % (c['char_repeat'] - 1), s) or re.search(r'([!?.\-_=*~#])\1{%d,}' % (c['char_repeat'] - 1), s):
        return True
    words = re.findall(r'\w+', s.casefold())
    if len(words) >= 8 and max(words.count(w) for w in set(words)) / len(words) >= c['word_repeat']:
        return True
    return False


# ---- Duplicates ---------------------------------------------------------------------------------------
def norm_key(s):
    """What counts as 'the same text': letters, digits and emoji, folded."""
    return ''.join(ch for ch in fold(s) if ch.isalnum() or is_emoji(ch))


def similar(a, b):
    return bool(a) and bool(b) and difflib.SequenceMatcher(None, a, b).ratio() >= SCREEN['sender_similar']


# ---- All of it -------------------------------------------------------------------------------------------
def screen(name, text, words):
    """The reasons (if any) a note should wait for Anna; duplicates are checked by the caller."""
    why = []
    both = name + '\n' + text
    if has_link(both):
        why.append('link')
    if bad_words(both, words):
        why.append('words')
    if has_markup(both):
        why.append('markup')
    if tricks(text) or (name and tricks(name)):
        why.append('tricks')
    return why
