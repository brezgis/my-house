"""Tests for the guest book. Run from this folder:  python3 -m unittest -v

The classes named Proof* are the security review's proof scripts (scratchpad/gbreview/p1..p7) turned
into tests: each failed against the version before the review and passes now."""

import http.client
import io
import json
import os
import socket
import sqlite3
import sys
import tempfile
import threading
import time
import unittest
from contextlib import redirect_stdout
from unittest import mock

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import guestbook as gb  # noqa: E402
import screens as sc  # noqa: E402

ORIGIN = 'https://house.brezgis.com'
RECURSITE = 'https://recursite.brezgis.com'


class Clock:
    def __init__(self, t=1_800_000_000.0):
        self.t = t

    def __call__(self):
        return self.t


def make(tmp, clock=None, mode='review', **kw):
    """A book in a temporary folder. The older tests run in review mode (every note waits for Anna)."""
    cfg = gb.Config(db=os.path.join(tmp, 'notes.db'), salt_file=os.path.join(tmp, 'salt'), origins=[ORIGIN, RECURSITE, 'http://localhost:8791'],
                    clock=clock or Clock(), trust_proxy=kw.get('trust_proxy', 1), mode=mode, notify_log=kw.get('notify_log', ''),
                    words_file=kw.get('words_file', os.path.join(tmp, 'words.txt')))
    return gb.Book(cfg)


def send(book, text='Lovely house.', ip='10.0.0.1', name='Fig', wait=10, **extra):
    """A visitor at ip loads the book (gets a form), waits, and posts."""
    token = book.form_token(ip)
    book.cfg.clock.t += wait
    return book.post({'name': name, 'text': text, 'form': token, **extra}, ip)


def cli(book, *argv):
    out = io.StringIO()
    with redirect_stdout(out):
        code = gb.moderate(list(argv), book.cfg, book)
    return code, out.getvalue()


class Base(unittest.TestCase):
    mode = 'review'

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.log = os.path.join(self.tmp.name, 'notify.log')
        self.book = make(self.tmp.name, mode=self.mode, notify_log=self.log)
        self.n = 0

    def tearDown(self):
        self.tmp.cleanup()

    def post(self, text, ip=None, **kw):
        self.n += 1
        return send(self.book, text, ip or f'10.9.{self.n % 250}.{self.n // 250 + 1}', **kw)

    def visible(self):
        return [n['text'] for n in self.book.page(1)['notes']]


# ---- Cleaning and the screens -------------------------------------------------------------------------
class Cleaning(unittest.TestCase):
    def test_controls_bidi_blanks_and_joiners(self):
        self.assertEqual(sc.clean('a\x00b\x07c\u202ed\u200be', True), 'abcde')
        self.assertEqual(sc.clean('he\u3164llo\u2800 there\uffa0', True), 'hello there')
        self.assertEqual(sc.clean('می\u200cخواهم 👨\u200d👩\u200d👧', True), 'می\u200cخواهم 👨\u200d👩\u200d👧')       # the joiners stay
        self.assertEqual(sc.clean('  one\r\n\r\n\r\n\r\ntwo  ', True), 'one\n\ntwo')
        self.assertEqual(sc.clean('a\nb', False), 'a b')
        self.assertIsNone(sc.clean(42, True))

    def test_line_flood_and_zalgo(self):
        t = sc.clean('\n'.join(str(i) for i in range(40)), True)
        self.assertLessEqual(t.count('\n'), sc.SCREEN['max_lines'])
        self.assertEqual(sc.clean('a\u0336\u0336\u0336\u0336b', True), 'a\u0336\u0336b')

    def test_visible_text_required(self):
        for bad in [{'text': 'ㅤㅤ'}, {'text': '⠀⠀⠀'}, {'text': '!'}, {'text': ' . '}]:
            with self.assertRaises(ValueError):
                sc.validate(bad)
        self.assertEqual(sc.validate({'text': '🌷🌷'}), ('', '🌷🌷'))
        self.assertEqual(sc.validate({'name': 'ㅤ', 'text': 'Hello there'})[0], '')

    def test_html_is_kept_as_text_and_lengths(self):
        self.assertEqual(sc.validate({'text': '<script>alert(1)</script>'})[1], '<script>alert(1)</script>')
        for bad in [{'text': 'x' * 401}, {'name': 'n' * 41, 'text': 'ok ok'}, {'name': 5, 'text': 'ok'}, [], {'text': None}]:
            with self.assertRaises(ValueError):
                sc.validate(bad)


class Screens(unittest.TestCase):
    W = sc.load_words()

    def why(self, text, name=''):
        n, t = sc.validate({'name': name, 'text': text})
        return sc.screen(n, t, self.W)

    def test_scunthorpe_and_friends_pass(self):
        for t in ['Scunthorpe', 'Penistone', 'a cocktail in Sussex', 'Charles Dickens', 'a classic', 'my therapist', 'spicy grapes', 'shiitake',
                  'the assassin', 'Niger and Chad', 'pros and cons', 'cocoons', 'analysis', 'Matsushita', 'skill yourself up', 'Lovely house.']:
            self.assertFalse(sc.bad_words(t, self.W), t)

    def test_disguised_words_are_caught(self):
        for t in ['sh1t', 'S H I T', 'f u u u c k', 'fuuuuck', 'FUCKING', 'bitches', 'KILL yourself', 'kill   your self', '14 88', '1488', 'Sh!t',
                  'you are a fuсk', 'shіt house', 'f*ck you', 'f.u.c.k', 'phuck this', 'fvck you', 'fuk off', 'kill yоurself', 'k i l l y o u r s e l f',
                  'f\u200du\u200dc\u200dk', 'fㅤuㅤcㅤk', 'ｆｕｃｋ', '𝐟𝐮𝐜𝐤', 'kys', 'go die', 'gο die']:
            self.assertTrue(sc.bad_words(sc.clean(t, True), self.W), t)

    def test_words_innocent_in_other_languages(self):
        for t in ['Kys og kram fra København', 'Slut på sommaren, tack för allt!', 'Désolé pour le retard, quelle jolie maison !',
                  'Merci pour la tarte au fromage râpé', 'Привет, красивый дом!', 'Γεια σας, ωραίο σπίτι!']:
            self.assertFalse(sc.bad_words(t, self.W), t)
        self.assertTrue(sc.bad_words('what a slut', self.W))                        # in plain English letters they still count

    def test_extra_word_file(self):
        with tempfile.TemporaryDirectory() as t:
            path = os.path.join(t, 'words.txt')
            with open(path, 'w') as f:
                f.write('# extra\nbadger\nmuch too far\n')
            w = sc.load_words(path)
            self.assertTrue(sc.bad_words('Badgers!', w))
            self.assertTrue(sc.bad_words('that is MUCH too far', w))
            self.assertFalse(sc.bad_words('too far', w))

    def test_links_and_contacts(self):
        for t in ['see https://x.example', 'hxxp://evil/x', 'www.shop', 'buy at cheap-pills.com today', 'example.co.uk', 'mail me at a@b.co',
                  'a [at] b [dot] com', 'x dot com', 'follow @anna_b', 'call 555-123-4567', '+44 20 7946 0958', 'write on WhatsApp', 't.me/spam',
                  'ｅｖｉｌ．ｃｏｍ', 'evil．com', 'evil。com', 'evil[.]com/win', 'evil(.)com', 'cheap pills at farmacia.es', 'my-shop.page/deal',
                  'youtu.be/abc123', 'goo.gl/xyz', 'tinyurl dot com slash abc', 'go to 10.1.2.3/x', 'evil . c o m', 'evil com/x',
                  'insta: annab_x', 'add me on dsc annab#1234']:
            self.assertTrue(sc.has_link(t), t)
        for t in ['In 1996, 12 of us came by.', 'It cost $5.50', 'Lovely house. Thank you!', 'I am 25 years old', 'the year 2026', 'e.g. this, i.e. that',
                  'Mr. Toad', 'Visited on 13.11.2026 with my sister', 'We came by 11/13/2026, loved it', 'on 2026-11-13', 'Fans since 2019 2024 forever',
                  'Love, Fig @ home', 'A lovely house.It was great']:
            self.assertFalse(sc.has_link(t), t)

    def test_markup(self):
        for t in ['<b>hi</b>', '<script>alert(1)</script>', '<script', 'javascript:alert(1)', '<img src=x onerror=alert(1)>', '&#60;', '{{7*7}}',
                  "1' or 1=1", '[url=x]']:
            self.assertTrue(sc.has_markup(t), t)
        for t in ['I <3 this house', '2 < 3 and 5 > 4', 'I love you <so much', '<<< this way']:
            self.assertFalse(sc.has_markup(t), t)

    def test_tricks(self):
        for t in ['x' * 41, '!!!!!!!!!!!!', '#$%&*#$%&*#$%&*', 'THIS IS THE BEST HOUSE IN THE WHOLE WORLD AND I MEAN IT TRULY', 'buy buy buy buy buy buy buy buy now']:
            self.assertTrue(sc.tricks(t), t)
        for t in ['What a lovely house. The honey was excellent 🍯', 'I LOVED the library!', 'so cute!! 💛💛', 'Merci!!! ❤️❤️❤️', '💛💛💛 love it 💛💛💛',
                  'GRÜSSE AUS BERLIN, TOLLES HAUS!!', 'とても素敵なお家ですね。お庭のお花もきれいで、図書室の本もたくさんあって、また遊びに来たいと思いました。ありがとう！',
                  '这个房子真漂亮，花园里的花也很好看，我很喜欢图书室和厨房，谢谢你邀请我们来参观！']:
            self.assertFalse(sc.tricks(t), t)

    def test_sincere_notes_in_many_languages_publish(self):
        sincere = ['Quelle jolie maison ! Merci pour le thé.', 'Schönes Haus! Grüße aus München.', '¡Qué casa tan bonita! Gracias por todo.',
                   'Привет! Очень уютный дом, спасибо!', 'Labas! Labai gražus namas, ačiū!', 'Piękny dom, dziękuję za gościnę!',
                   'とても素敵なお家ですね。また来ます！', '这个房子真漂亮，谢谢！', '정말 예쁜 집이네요! 감사합니다.', 'بيت جميل جدا، شكرا لك',
                   'बहुत सुंदर घर है, धन्यवाद!', 'so cute!! 💛💛', 'Merci!!! ❤️❤️❤️', 'Visited on 13.11.2026 with my sister', 'I <3 the library',
                   'می\u200cخواهم دوباره بیایم', 'from all of us 👨\u200d👩\u200d👧 hello', 'Love, Fig @ home', 'Kys og kram fra København']
        for t in sincere:
            self.assertEqual(self.why(t), [], t)

    def test_held_examples(self):
        self.assertIn('link', self.why('A kind note.', name='farmacia.es'))
        self.assertIn('words', self.why('kill yоurself'))
        self.assertLessEqual(sc.validate({'text': '\n\n'.join('abcdefghijklmnopqrstuvwxyz')})[1].count('\n'), sc.SCREEN['max_lines'])      # a line flood is cleaned, not held


# ---- Posting in review mode ---------------------------------------------------------------------------
class Posting(Base):
    def test_post_is_pending_and_hidden(self):
        self.assertEqual(self.post('Lovely house.', ip='1.2.3.4'), (202, {'ok': True, 'status': 'pending'}))
        self.assertEqual(self.book.page(1)['notes'], [])
        row = self.book.db.execute('SELECT * FROM notes').fetchone()
        self.assertEqual(row['status'], 'pending')
        self.assertNotIn('1.2.3.4', json.dumps(dict(row)))
        self.assertEqual(len(row['ip_hash']), 24)

    def test_honeypot_and_fast_forms_are_dropped_quietly(self):
        self.assertEqual(self.post('Lovely house.', website='http://spam')[0], 202)
        self.assertEqual(self.post('Lovely house again.', wait=1)[0], 202)
        self.assertEqual(self.book.db.execute('SELECT COUNT(*) FROM notes').fetchone()[0], 0)

    def test_forged_stale_or_someone_elses_form(self):
        tok = self.book.form_token('1.1.1.1')
        self.book.cfg.clock.t += 10
        forged = tok[:-1] + ('0' if tok[-1] != '0' else '1')
        self.assertEqual(self.book.post({'text': 'hello there', 'form': forged}, '1.1.1.1'), (400, gb.STALE))
        self.assertEqual(self.book.post({'text': 'hello there', 'form': tok}, '2.2.2.2'), (400, gb.STALE))          # bound to its sender
        self.assertEqual(self.post('stale form', wait=gb.FORM_LIFE + 5)[0], 400)
        self.assertEqual(self.book.post({'text': 'no token here'}, '1.1.1.1')[0], 400)

    def test_rate_limit_per_sender(self):
        codes = [self.post(f'note {i} about the garden', ip='9.9.9.9', wait=5)[0] for i in range(5)]
        self.assertEqual(codes, [202, 202, 202, 429, 429])
        self.assertEqual(self.post('Someone else entirely.', ip='8.8.8.8')[0], 202)
        self.book.cfg.clock.t += 3600
        self.assertEqual(self.post('An hour later, again.', ip='9.9.9.9')[0], 202)

    def test_links_flagged_for_moderation(self):
        self.post('see www.example.com')
        self.assertEqual(self.book.db.execute('SELECT has_link FROM notes').fetchone()[0], 1)


class Moderation(Base):
    def setUp(self):
        super().setUp()
        for i in range(20):
            self.post(f'note number {i} from guest {i}, which is quite a long note', name=f'guest {i}', ip=f'10.1.{i}.1', wait=4)

    def test_flow_and_pagination(self):
        self.assertIn('note number 0', cli(self.book, 'pending')[1])
        self.assertIn('note(s) published', cli(self.book, 'approve', *[str(i) for i in range(1, 19)])[1])
        cli(self.book, 'reject', '19')
        cli(self.book, 'delete', '#20')
        p1 = self.book.page(1)
        self.assertEqual((p1['total'], p1['pages'], len(p1['notes'])), (18, 3, gb.PAGE_SIZE))
        self.assertTrue(p1['notes'][0]['text'].startswith('note number 17'))
        self.assertEqual(set(p1['notes'][0]), {'id', 'name', 'text', 'date', 'at', 'place'})
        self.assertRegex(p1['notes'][0]['at'], r'^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$')
        self.assertEqual(len(self.book.page(3)['notes']), 2)
        last = self.book.page(99)                                             # clamped to the last page
        self.assertEqual((last['page'], len(last['notes'])), (3, 2))
        exported = json.loads(cli(self.book, 'export')[1])
        self.assertEqual(len(exported), 18)
        self.assertNotIn('ip_hash', json.dumps(exported))
        self.assertEqual(len(json.loads(cli(self.book, 'export', '--all')[1])), 19)

    def test_bad_ids(self):
        self.assertIn('No note 999', cli(self.book, 'show', '999')[1])
        self.assertIn('is not a note number', cli(self.book, 'show', "x'; drop")[1])
        self.assertEqual(cli(self.book, 'approve')[0], 2)
        self.assertEqual(cli(self.book, 'frobnicate')[0], 2)

    def test_backup_leaves_out_who(self):
        dest = os.path.join(self.tmp.name, 'copy.db')
        self.assertEqual(cli(self.book, 'backup', dest)[0], 0)
        c = sqlite3.connect(dest)
        self.assertEqual(c.execute('SELECT COUNT(*) FROM notes').fetchone()[0], 20)
        self.assertEqual(c.execute('SELECT COUNT(*) FROM notes WHERE ip_hash IS NOT NULL').fetchone()[0], 0)
        self.assertEqual(c.execute("SELECT COUNT(*) FROM state WHERE key LIKE 'hashkey:%'").fetchone()[0], 0)
        self.assertEqual(oct(os.stat(dest).st_mode & 0o777), '0o600')
        dest2 = os.path.join(self.tmp.name, 'copy2.db')
        cli(self.book, 'backup', dest2, '--with-hashes')
        self.assertEqual(sqlite3.connect(dest2).execute('SELECT COUNT(*) FROM notes WHERE ip_hash IS NOT NULL').fetchone()[0], 20)


# ---- Instant publishing ---------------------------------------------------------------------------------
class Instant(Base):
    mode = 'instant'

    def test_clean_note_appears_at_once(self):
        status, body = self.post('What a lovely house.')
        self.assertEqual((status, body['status']), (202, 'published'))
        self.assertEqual(set(body['note']), {'id', 'name', 'text', 'date', 'at', 'place'})
        self.assertRegex(body['note']['id'], r'^[A-Za-z0-9_-]{8}$')
        self.assertEqual(self.visible(), ['What a lovely house.'])

    def test_each_screen_holds_quietly(self):
        cases = {'link': 'come see my-shop.com', 'words': 'you are a sh1t', 'markup': '<b>hello</b>', 'tricks': 'BEST HOUSE IN THE WHOLE WIDE WORLD EVER AND EVER AND EVER'}
        for why, text in cases.items():
            self.assertEqual(self.post(text), (202, gb.PENDING), why)
            self.assertIn(why, self.book.db.execute('SELECT screen FROM notes ORDER BY id DESC').fetchone()[0])
        self.assertEqual(self.post('A kind note.', name='www.spam.example')[1]['status'], 'pending')
        self.assertEqual(self.visible(), [])

    def test_duplicates_and_repeats(self):
        self.assertEqual(self.post('Thank you so much for the tea and the cake.')[1]['status'], 'published')
        self.assertEqual(self.post('thank you so much, for the TEA and the cake!')[1]['status'], 'pending')     # 20+ letters, another sender
        self.assertEqual(self.post('Thank you!')[1]['status'], 'published')
        self.assertEqual(self.post('Thank you!!')[1]['status'], 'published')                                     # short: never a duplicate
        self.assertEqual(self.post('I came for tea and stayed for cake.', ip='7.7.7.7')[1]['status'], 'published')
        self.assertEqual(self.post('I came for tea and stayed for cakes.', ip='7.7.7.7')[1]['status'], 'pending')

    def test_daily_allowance_of_instant_notes(self):
        got = [self.post(f'Note {i}: the {w} was lovely.', ip='5.5.5.5', wait=1000)[1]['status'] for i, w in enumerate(['tea', 'honey', 'piano'])]
        self.assertEqual(got, ['published', 'published', 'pending'])
        self.book.cfg.clock.t += 86400
        self.assertEqual(self.post('A day later: the bees.', ip='5.5.5.5')[1]['status'], 'published')

    def test_breaker_needs_several_senders_pulls_back_and_resets_itself(self):
        n = gb.BREAKER['notes']
        for i in range(n - 1):
            self.assertEqual(self.post(f'Visitor {i} thinks the {["tea", "honey", "chess", "piano", "bees", "library"][i % 6]} was lovely, {i}.', ip=f'20.0.{i}.1', wait=5)[1]['status'], 'published')
        self.assertEqual(self.post('One more lovely note after all that.', ip='20.0.99.1', wait=5)[1]['status'], 'pending')
        self.assertEqual(self.book.mode()[0], 'review')
        self.assertEqual(self.visible(), [])                                  # the burst is pulled back to held
        self.assertEqual(len([l for l in cli(self.book, 'held')[1].splitlines() if l.startswith('#')]), n)
        self.assertIn('Tripped', cli(self.book, 'breaker')[1])
        self.book.cfg.clock.t += 3600
        self.assertEqual(self.post('Still held, an hour later.', ip='20.0.98.1')[1]['status'], 'pending')
        self.book.cfg.clock.t += gb.BREAKER['quiet']
        self.assertEqual(self.post('After a quiet spell it flows again.', ip='20.0.97.1')[1]['status'], 'published')
        with open(self.log) as f:
            log = f.read()
        self.assertIn('BREAKER tripped', log)
        self.assertIn('reset itself', log)

    def test_breaker_reset_by_hand_and_approved_notes_kept(self):
        for i in range(gb.BREAKER['notes'] - 1):
            pid = self.post(f'Burst note {i}, about the garden and the {i} roses.', ip=f'21.0.{i}.1', wait=5)[1]['note']['id']
            if i == 0:
                cli(self.book, 'approve', pid)                                # Anna's own approval: never pulled back
        self.post('The one that trips it.', ip='21.0.99.1', wait=5)
        self.assertEqual(len(self.visible()), 1)
        self.assertIn('reset', cli(self.book, 'breaker', 'reset')[1])
        self.assertEqual(self.post('And now it flows again.', ip='21.0.98.1')[1]['status'], 'published')

    def test_review_mode_is_the_kill_switch(self):
        with tempfile.TemporaryDirectory() as t:
            b = make(t, mode='review')
            self.assertEqual(send(b, 'A kind and clean note.')[1]['status'], 'pending')
            self.assertEqual(b.page(1)['total'], 0)
            self.assertEqual(b.mode(), ('review', 'GB_MODE=review'))
        with self.assertRaises(SystemExit):
            gb.Config(db=os.path.join(self.tmp.name, 'x.db'), mode='sometimes')

    def test_hide_unhide_delete(self):
        pid = self.post('Please take this one down later.')[1]['note']['id']
        cli(self.book, 'hide', pid)
        self.assertEqual(self.visible(), [])
        cli(self.book, 'unhide', pid)
        self.assertEqual(self.visible(), ['Please take this one down later.'])
        cli(self.book, 'delete', pid)
        self.assertEqual(self.visible(), [])

    def test_block_a_sender(self):
        self.post('Hello from a sender who will be blocked.', ip='6.6.6.6')
        prefix = self.book.ip_hash('6.6.6.6')[:8]
        self.assertIn(prefix, cli(self.book, 'recent')[1])
        cli(self.book, 'block', prefix)
        n = self.book.db.execute('SELECT COUNT(*) FROM notes').fetchone()[0]
        self.assertEqual(self.post('Another, quite different, message entirely.', ip='6.6.6.6')[1]['status'], 'pending')
        self.assertEqual(self.book.db.execute('SELECT COUNT(*) FROM notes').fetchone()[0], n)
        cli(self.book, 'unblock', prefix)
        self.assertEqual(self.post('A third, after being unblocked, about bees.', ip='6.6.6.6')[1]['status'], 'published')
        self.assertEqual(cli(self.book, 'block', 'not-a-hash')[0], 2)

    def test_get_never_shows_held_hidden_or_deleted(self):
        keep = self.post('This one stays.')[1]['note']['id']
        self.post('visit cheap-pills.com')
        gone = self.post('This one is hidden.')[1]['note']['id']
        dead = self.post('This one is deleted.')[1]['note']['id']
        cli(self.book, 'hide', gone)
        cli(self.book, 'delete', dead)
        page = self.book.page(1)
        self.assertEqual([n['id'] for n in page['notes']], [keep])
        blob = json.dumps(page)
        for secret in ('ip_hash', 'screen', '10.9.', 'hidden', 'cheap'):
            self.assertNotIn(secret, blob)

    def test_digest_and_notify_log(self):
        self.assertEqual(cli(self.book, 'digest')[1], '')
        self.post('A clean note for the digest.')
        self.post('a link: www.example.org')
        self.assertIn('1 published, 1 held', cli(self.book, 'digest', '--hours', '1')[1])
        with open(self.log) as f:
            log = f.read()
        self.assertIn('HELD', log)
        self.assertNotIn('10.9.', log)
        self.assertEqual(oct(os.stat(self.log).st_mode & 0o777), '0o600')


# ---- The proofs from the security review ----------------------------------------------------------------
class ProofRotation(Base):
    """p1: one person with an IPv6 /64 (or several addresses) against the whole book."""
    mode = 'instant'

    def test_a_64_is_one_sender(self):
        self.assertEqual(gb.identity('2001:db8:1:2::1'), gb.identity('2001:db8:1:2:ffff::9'))
        self.assertNotEqual(gb.identity('2001:db8:1:2::1'), gb.identity('2001:db8:1:3::1'))
        self.assertEqual(gb.identity('::ffff:203.0.113.7'), '203.0.113.7')
        codes = [self.post(f'Hello from visitor number {i}, the {"abcdefghijkl"[i]} garden is nice', ip=f'2001:db8:1:2::{i + 1:x}', wait=5) for i in range(12)]
        published = [b.get('status') for s, b in codes if s == 202].count('published')
        self.assertLessEqual(published, gb.INSTANT_PER_DAY)
        self.assertEqual([s for s, _ in codes].count(429), 9)
        self.assertNotEqual(self.book.mode()[0], 'review')                   # one sender cannot trip the breaker
        self.assertEqual(self.post('A real visitor, later, saying something kind.', ip='198.51.100.9')[1]['status'], 'published')

    def test_reports_cannot_empty_the_book(self):
        ids = [self.post(f'A kind note number {i} about the {w}.', ip=f'30.0.{i}.1')[1]['note']['id'] for i, w in enumerate(['tea', 'bees', 'piano', 'roses', 'chess', 'swing'])]

        def report(pid, ip, form=True):
            return self.book.report(pid, {'form': self.book.form_token(ip)} if form else {}, ip)
        for i in range(3):                                                    # three addresses in one /64: one reporter
            report(ids[0], f'2001:db8:1:2::bad:{i}')
        self.assertIn(ids[0], [n['id'] for n in self.book.page(1)['notes']])
        for i in range(3):                                                    # no form: never loaded the book; only a flag
            report(ids[1], f'40.0.{i}.1', form=False)
        self.assertIn(ids[1], [n['id'] for n in self.book.page(1)['notes']])
        k = 0
        for pid in ids:                                                       # three real reporters per note, all notes
            for j in range(3):
                k += 1
                report(pid, f'50.{k}.0.1')
        self.assertEqual(self.book.page(1)['total'], len(ids) - gb.AUTO_HIDES_PER_DAY)       # at most 3 hidden a day
        reporter = '60.0.0.1'                                                 # one reporter counts toward one hide a day
        report(ids[-1], reporter)
        self.assertEqual(self.book.db.execute('SELECT counts FROM reports WHERE sender = ?', (self.book.ip_hash(reporter),)).fetchone()[0], 1)
        report(ids[-2], reporter)
        self.assertEqual(self.book.db.execute('SELECT SUM(counts) FROM reports WHERE sender = ?', (self.book.ip_hash(reporter),)).fetchone()[0], 1)

    def test_an_approved_note_is_immune(self):
        pid = self.post('A note Anna has looked at and kept.')[1]['note']['id']
        cli(self.book, 'approve', pid)
        for i in range(5):
            self.book.report(pid, {'form': self.book.form_token(f'70.0.{i}.1')}, f'70.0.{i}.1')
        self.assertIn(pid, [n['id'] for n in self.book.page(1)['notes']])
        self.assertIn('kept by Anna', cli(self.book, 'show', pid)[1])

    def test_a_form_is_good_once(self):
        tok = self.book.form_token('80.0.0.1')
        self.book.cfg.clock.t += 10
        self.assertEqual(self.book.post({'text': 'First use of the form.', 'form': tok}, '80.0.0.1')[1]['status'], 'published')
        self.assertEqual(self.book.post({'text': 'Token replay, yet another note.', 'form': tok}, '80.0.0.1'), (202, gb.PENDING))
        self.assertEqual(self.book.db.execute('SELECT COUNT(*) FROM notes').fetchone()[0], 1)


class ProofPoisoning(Base):
    """p7: held junk must not make sincere notes 'duplicates', and one /64 must not make the book busy for others."""
    mode = 'instant'

    def test_held_junk_does_not_poison_duplicates(self):
        for i, g in enumerate(['Thank you!', 'Lovely house!', 'Привет!', 'So cute!', 'Hello Anna!']):
            self.post(g, name='x.com', ip=f'2001:db8::a:{i}', wait=5)
        self.assertEqual(self.post('Lovely house!!', name='Mia', ip='198.51.100.1')[1]['status'], 'published')

    def test_flooding_from_one_64_does_not_turn_others_away(self):
        for i in range(30):
            self.post(f'held filler {i} at x.com', ip=f'2001:db8::b:{i}', wait=5)
        status, body = self.post('A completely fresh and kind note.', name='Mia', ip='198.51.100.2')
        self.assertEqual((status, body['status']), (202, 'published'))

    def test_global_pace_holds_rather_than_refuses(self):
        with mock.patch.object(self.book, 'everyone', gb.Buckets(1, 0, self.book.cfg.clock)):
            self.assertEqual(self.post('First, published.', ip='1.0.0.1')[1]['status'], 'published')
            self.assertEqual(self.post('Second, held for pace, not refused.', ip='1.0.0.2'), (202, gb.PENDING))

    def test_held_cap_squeezes_repeat_senders_first(self):
        con = self.book.db
        con.execute('BEGIN')
        for i in range(gb.MAX_PENDING):
            con.execute("INSERT INTO notes (text, created_at, status, ip_hash, public_id, norm) VALUES ('junk', '2027-01-01T00:00:00Z', 'pending', ?, ?, '')",
                        ('spammer' if i % 2 else f'one{i}', f'p{i:07d}'))
        con.execute('COMMIT')
        self.assertEqual(self.post('A sincere note while the mailbox is crowded.', ip='1.0.0.3')[0], 202)
        self.assertLess(con.execute("SELECT COUNT(*) FROM notes WHERE ip_hash = 'spammer'").fetchone()[0], gb.MAX_PENDING // 2)


class ProofPrivacy(Base):
    """p4: forgetting happens even if nobody posts; old keys are thrown away."""
    mode = 'instant'

    def test_forgotten_without_a_post(self):
        pid = self.post('Lovely house, thank you.', ip='100.64.12.34')[1]['note']['id']
        self.book.report(pid, {'reason': 'rude\x1b[8m x'}, '100.64.9.9')
        key0 = self.book.get_state('hashkey:' + gb.month(self.book.now()))
        self.book.cfg.clock.t += 60 * 86400                                   # two months pass; people read but nobody posts
        self.book.page(1)
        row = self.book.db.execute('SELECT ip_hash, name, text FROM notes').fetchone()
        self.assertIsNone(row['ip_hash'])
        self.assertEqual(self.book.db.execute('SELECT COUNT(*) FROM reports').fetchone()[0], 0)
        keys = [k for (k,) in self.book.db.execute("SELECT value FROM state WHERE key LIKE 'hashkey:%'")]
        self.assertNotIn(key0, keys)                                          # the old month's key is gone
        self.assertLessEqual(len(keys), 2)

    def test_reads_at_most_hourly_and_never_on_the_hot_path(self):
        self.post('A note.')
        before = self.book.db.total_changes
        self.book.page(1)
        self.assertEqual(self.book.db.total_changes, before)


class ProofSqlite(unittest.TestCase):
    """p5: the schema is set up once; a GET writes nothing; emoji notes have a duplicate key."""

    def test_get_writes_nothing_and_connect_does_no_setup(self):
        with tempfile.TemporaryDirectory() as t:
            b = make(t, mode='instant')
            send(b, '🌷🌷', ip='1.1.1.1')
            self.assertEqual(sc.norm_key('🌷🌷'), '🌷🌷')
            watcher = sqlite3.connect(b.cfg.db)
            dv = watcher.execute('PRAGMA data_version').fetchone()[0]
            with mock.patch.object(gb, 'setup_db', side_effect=AssertionError('setup on a request')):
                srv = gb.Server(('127.0.0.1', 0), gb.make_handler(b))
                threading.Thread(target=srv.serve_forever, daemon=True).start()
                try:
                    for _ in range(5):
                        c = http.client.HTTPConnection('127.0.0.1', srv.server_address[1], timeout=5)
                        c.request('GET', '/notes')
                        self.assertEqual(c.getresponse().status, 200)
                        c.close()
                finally:
                    srv.shutdown()
                    srv.server_close()
            self.assertEqual(watcher.execute('PRAGMA data_version').fetchone()[0], dv)


class Places(Base):
    def test_place_validation(self):
        self.assertEqual(self.post('from the recursite', place='recursite')[0], 202)
        self.assertEqual(self.post('no place given')[0], 202)
        self.assertEqual(self.post('null place', place=None)[0], 202)
        for bad in ['town', 'elsewhere', '', 5, ['house']]:
            with self.assertRaises(ValueError):
                self.post(f'bad place {bad!r}', place=bad)
        self.assertEqual([r[0] for r in self.book.db.execute('SELECT place FROM notes ORDER BY id')], ['recursite', 'house', 'house'])

    def test_filter_and_every_place(self):
        for i, pl in enumerate(['house', 'recursite', 'house', 'recursite', 'recursite']):
            self.post(f'note {i} from somewhere', place=pl)
        self.book.db.execute("UPDATE notes SET status = 'approved'")
        self.assertEqual([n['place'] for n in self.book.page(1)['notes']], ['recursite', 'recursite', 'house', 'recursite', 'house'])
        self.assertEqual(self.book.page(1, 'recursite')['total'], 3)

    def test_cli_place(self):
        self.post('from the house', place='house')
        self.post('from the recursite', place='recursite')
        out = cli(self.book, 'pending', '--place', 'recursite')[1]
        self.assertIn('from the recursite', out)
        self.assertNotIn('from the house', out)
        self.assertEqual(cli(self.book, 'pending', '--place')[0], 2)

    def test_migration_of_an_older_database(self):
        path = os.path.join(self.tmp.name, 'old.db')
        old = sqlite3.connect(path)
        old.executescript("""CREATE TABLE notes (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL DEFAULT '', text TEXT NOT NULL,
            created_at TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', decided_at TEXT, ip_hash TEXT, has_link INTEGER NOT NULL DEFAULT 0);
            CREATE TABLE reports (note_id INTEGER NOT NULL, sender TEXT NOT NULL, reason TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL, UNIQUE (note_id, sender));
            INSERT INTO notes (name, text, created_at, status) VALUES ('Fig', 'An old note.', '2026-11-01T12:00:00Z', 'approved');""")
        old.commit()
        old.close()
        b = gb.Book(gb.Config(db=path, salt_file=os.path.join(self.tmp.name, 'salt2'), clock=Clock(), mode='review'))
        self.assertEqual(b.page(1)['notes'][0]['place'], 'house')
        self.assertEqual(send(b, 'A new note.', place='recursite')[0], 202)
        gb.Book(b.cfg)                                                        # and again: nothing breaks the second time
        self.assertEqual(b.page(1)['total'], 1)

    def test_default_origins_are_both_sites(self):
        cfg = gb.Config(db=os.path.join(self.tmp.name, 'd.db'))
        self.assertTrue({ORIGIN, RECURSITE} <= cfg.origins)


# ---- Over real HTTP ----------------------------------------------------------------------------------------
class Http(unittest.TestCase):
    mode = 'instant'
    trust_proxy = 1

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.book = make(self.tmp.name, mode=self.mode, trust_proxy=self.trust_proxy)
        self.srv = gb.Server(('127.0.0.1', 0), gb.make_handler(self.book))
        self.port = self.srv.server_address[1]
        threading.Thread(target=self.srv.serve_forever, daemon=True).start()
        self._err, sys.stderr = sys.stderr, io.StringIO()

    def tearDown(self):
        sys.stderr = self._err
        self.srv.shutdown()
        self.srv.server_close()
        self.tmp.cleanup()

    def req(self, method, path, body=None, headers=None, ip=None):
        c = http.client.HTTPConnection('127.0.0.1', self.port, timeout=5)
        data = body if isinstance(body, (bytes, type(None))) else json.dumps(body).encode()
        h = {'Origin': ORIGIN, 'Content-Type': 'application/json', **({'X-Real-IP': ip} if ip else {}), **(headers or {})}
        c.request(method, path, body=data, headers={k: v for k, v in h.items() if v is not None})
        r = c.getresponse()
        raw = r.read()
        c.close()
        try:
            raw = json.loads(raw) if raw else None
        except ValueError:
            pass
        return r.status, dict(r.getheaders()), raw

    def raw(self, data, wait=3):
        s = socket.create_connection(('127.0.0.1', self.port))
        s.settimeout(wait)
        s.sendall(data)
        out = b''
        try:
            while True:
                c = s.recv(65536)
                if not c:
                    break
                out += c
        except socket.timeout:
            out += b'<<timeout>>'
        s.close()
        return out

    def sign(self, text, ip, origin=ORIGIN, **extra):
        form = self.req('GET', '/notes', ip=ip)[2]['form']
        self.book.cfg.clock.t += 30
        return self.req('POST', '/notes', {'text': text, 'form': form, **extra}, headers={'Origin': origin}, ip=ip)

    def test_get_and_cors_exact(self):
        s, h, b = self.req('GET', '/notes')
        self.assertEqual((s, h['Access-Control-Allow-Origin'], h['X-Content-Type-Options']), (200, ORIGIN, 'nosniff'))
        self.assertNotIn('Set-Cookie', h)
        for o in ['https://evil.example', 'https://house.brezgis.com/', 'https://house.brezgis.com//', 'HTTPS://HOUSE.BREZGIS.COM', 'null',
                  'https://house.brezgis.com.evil.com', 'http://house.brezgis.com']:
            s, h, _ = self.req('GET', '/notes', headers={'Origin': o})
            self.assertEqual(s, 403, o)
            self.assertNotIn('Access-Control-Allow-Origin', h)
        for o in (ORIGIN, RECURSITE):
            self.assertEqual(self.req('OPTIONS', '/notes', headers={'Origin': o, 'Access-Control-Request-Method': 'POST'})[0], 204)

    def test_trusted_proxy_and_ipv6_senders(self):
        self.assertEqual(self.sign('A note from a household on IPv6.', '2001:db8:5:6::1')[2]['status'], 'published')
        self.assertEqual(self.sign('A second note from the same household.', '2001:db8:5:6::2')[2]['status'], 'published')
        self.assertEqual(self.sign('A third from that household, which waits.', '2001:db8:5:6::3')[2]['status'], 'pending')
        self.assertEqual(self.sign('Someone else on IPv4 is fine.', '192.0.2.44')[2]['status'], 'published')
        form = self.req('GET', '/notes', ip='192.0.2.50')[2]['form']                        # a form fetched for one sender...
        self.book.cfg.clock.t += 30
        self.assertEqual(self.req('POST', '/notes', {'text': 'Posted from elsewhere.', 'form': form}, ip='192.0.2.51')[2]['code'], 'form')

    def test_report_endpoint(self):
        pid = self.sign('Cool site! Signed from 1996.', '192.0.2.60', place='recursite')[2]['note']['id']
        self.assertEqual(self.req('POST', f'/notes/{pid}/report', headers={'Origin': 'https://evil.example'})[0], 403)
        self.assertEqual(self.req('POST', f'/notes/{pid}/report', b'reason=x', headers={'Content-Type': 'text/plain'})[0], 415)
        self.assertEqual(self.req('POST', f'/notes/{pid}/report', None, headers={'Content-Type': None})[0], 202)
        self.assertEqual(self.req('POST', '/notes/../../etc/report')[0], 404)
        log = sys.stderr.getvalue()
        self.assertIn('/notes/*/report', log)
        self.assertNotIn(pid, log)

    def test_refusals_close_the_connection(self):
        smug = b'GET /health HTTP/1.1\r\nHost: x\r\n\r\n'
        out = self.raw(b'POST /notes HTTP/1.1\r\nHost: x\r\nOrigin: https://evil.example\r\nContent-Type: application/json\r\nContent-Length: %d\r\n\r\n' % len(smug) + smug)
        self.assertEqual(out.count(b'HTTP/1.1 '), 1)
        self.assertIn(b'Connection: close', out)

    def test_bad_bodies(self):
        self.assertEqual(self.req('POST', '/notes', b'[' * 2000 + b']' * 2000)[0], 400)
        self.assertEqual(self.req('POST', '/notes', b'{not json')[0], 400)
        self.assertEqual(self.req('POST', '/notes', b'', headers={'Content-Length': '99999999'})[0], 413)
        self.assertEqual(self.req('POST', '/notes', b'5')[0], 400)
        self.assertEqual(self.req('DELETE', '/notes')[0], 405)
        self.assertNotIn('Traceback', sys.stderr.getvalue())

    def test_log_is_clean(self):
        self.raw(b'GET /\x1b]0;PWNED\x07\x1b[2J HTTP/1.1\r\nHost: x\r\n\r\n')
        self.raw(b'G\x1b[31mET /notes HTTP/1.1\r\nHost: x\r\n\r\n')
        self.req('GET', '/notes', ip='203.0.113.99')
        log = sys.stderr.getvalue()
        self.assertFalse(any(ord(ch) < 32 and ch != '\n' or ord(ch) > 126 for ch in log), repr(log))
        self.assertNotIn('203.0.113', log)

    def test_error_path_writes_one_quiet_line(self):
        with mock.patch.object(self.book, 'page', side_effect=RuntimeError('boom at 10.0.0.1')):
            s, _, b = self.req('GET', '/notes')
        self.assertEqual((s, b), (500, {'error': 'Something went wrong. Do try again later.'}))
        log = sys.stderr.getvalue()
        self.assertIn('GET error', log)
        self.assertNotIn('Traceback', log)
        self.assertNotIn('boom', log)
        self.assertNotIn('10.0.0.1', log)

    def test_a_trickling_connection_is_cut_off(self):
        with mock.patch.object(gb, 'REQUEST_DEADLINE', 1.0):
            srv = gb.Server(('127.0.0.1', 0), gb.make_handler(self.book))
            threading.Thread(target=srv.serve_forever, daemon=True).start()
            try:
                s = socket.create_connection(('127.0.0.1', srv.server_address[1]))
                t0 = time.time()
                alive = True
                for ch in b'GET /notes HTTP/1.1\r':
                    try:
                        s.send(bytes([ch]))
                        if s.recv(1, socket.MSG_DONTWAIT) == b'':
                            alive = False
                            break
                    except BlockingIOError:
                        pass
                    except OSError:
                        alive = False
                        break
                    if time.time() - t0 > 4:
                        break
                    time.sleep(0.3)
                s.close()
            finally:
                srv.shutdown()
                srv.server_close()
        self.assertFalse(alive)

    def test_too_many_connections_turned_away_and_recovery(self):
        with mock.patch.object(gb, 'MAX_CONN', 4), mock.patch.object(gb, 'REQUEST_DEADLINE', 1.0):
            srv = gb.Server(('127.0.0.1', 0), gb.make_handler(self.book))
            port = srv.server_address[1]
            threading.Thread(target=srv.serve_forever, daemon=True).start()
            try:
                idle = [socket.create_connection(('127.0.0.1', port)) for _ in range(6)]
                time.sleep(0.3)
                c = socket.create_connection(('127.0.0.1', port))
                c.settimeout(3)
                c.sendall(b'GET /health HTTP/1.1\r\nHost: x\r\n\r\n')
                try:
                    turned_away = c.recv(100) == b''
                except (ConnectionError, socket.timeout):
                    turned_away = True
                c.close()
                for k in idle:
                    k.close()
                time.sleep(1.5)
                c = http.client.HTTPConnection('127.0.0.1', port, timeout=5)
                c.request('GET', '/health')
                self.assertEqual(c.getresponse().status, 200)
                c.close()
            finally:
                srv.shutdown()
                srv.server_close()
        self.assertTrue(turned_away)

    def test_file_descriptors_stay_steady(self):
        fds = lambda: len(os.listdir('/proc/self/fd'))      # noqa: E731
        for _ in range(20):
            self.req('GET', '/notes')
        f0 = fds()
        for _ in range(200):
            self.req('GET', '/notes')
        self.assertLessEqual(fds(), f0 + 5)


class HttpNoProxy(Http):
    """With GB_TRUST_PROXY=0, X-Real-IP is ignored: everyone here is 127.0.0.1."""
    trust_proxy = 0

    def test_trusted_proxy_and_ipv6_senders(self):
        self.assertEqual(self.sign('One note with a header claiming IPv6.', '2001:db8:5:6::1')[2]['status'], 'published')
        self.assertEqual(self.sign('Another, about the bees and the honey.', '192.0.2.44')[2]['status'], 'published')
        self.assertEqual(self.sign('A third: the piano, the chess, the roses.', '192.0.2.45')[2]['status'], 'pending')      # all one sender really: past the allowance


if __name__ == '__main__':
    unittest.main()
