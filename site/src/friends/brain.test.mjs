// The conversation engine's tests. No browser needed:  node site/src/friends/brain.test.mjs  (Node 22 or newer)
import { makeBrain, CAST, ORDER, BANTER } from './brain.js';
let pass = 0, fail = 0;
const ok = (c, msg) => { if (c) pass++; else { fail++; console.log('FAIL', msg); } };
const rng = seed => { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; };
const fresh = (seed = 7) => makeBrain({ rnd: rng(seed) });
const main = r => r.lines.find(l => l.kind === 'main');

// 1. every keyword group, for every character
const COMMON = { 'hello there': 'greet', 'how are you?': 'howareyou', 'who are you?': 'who', 'are you the real one?': 'real', 'what do you think of the house?': 'house', 'have you seen the garden?': 'garden',
  'what do you make of the house robots?': 'staff', 'tell me about Barty': 'barty', 'and mortimer?': 'mort', 'is fig nice': 'fig', 'what about the vacuum': 'reggie', 'do you know Bramble': 'gardeners',
  'who lives here?': 'owner', 'fancy a coffee?': 'drink', 'shall I make tea': 'drink', 'I am hungry, any snacks': 'food', 'what music do you like?': 'music', 'shall we dance?': 'dance', "let's boogie": 'dance',
  "you're so funny": 'compliment', 'thank you!': 'thanks', 'you are boring': 'insult', 'tell me a joke': 'joke', "I'm feeling a bit sad": 'feelingBad', 'I had a rough day': 'feelingBad', "I'm really happy today": 'feelingGood',
  'I love you': 'loveyou', 'but why?': 'why', 'how does that work': 'how', 'what do you think?': 'opinion', 'yes': 'yes', 'nope': 'no', 'hahaha': 'laugh', 'my name is Anna': 'nameIntro', "I'm Zoya": 'nameIntro',
  'I really like knitting': 'likes', 'sorry about that': 'sorry', 'what can I ask you?': 'help', 'lovely weather today': 'weather', "it's so dark": 'night', 'goodbye!': 'bye', 'see you later': 'bye',
  'time to go home': 'gohome', 'asdf qwerty zxcv': 'fallback', 'look at the moon': 'night', 'flurble the wug?': 'opinion' };
for (const id of ORDER) {
  for (const [text, want] of Object.entries(COMMON)) {
    const b = fresh(), r = b.reply(id, text, { present: [id], music: true, hour: 14 });
    const own = CAST[id].subjects.some(s => s.id === r.topic);
    ok(r.topic === want || (own && ['how', 'opinion', 'compliment', 'night', 'weather'].includes(want)), `${id}: "${text}" -> ${r.topic}, wanted ${want}`);
    ok(main(r) && main(r).text.length > 3 && !/[{}]/.test(main(r).text), `${id}: "${text}" gives a clean line: ${main(r)?.text}`);
  }
  for (const s of CAST[id].subjects) {
    if (s.chip) { const r = fresh().reply(id, s.chip, { present: [id] }); ok(r.topic === s.id, `${id}: chip "${s.chip}" -> ${r.topic}, wanted ${s.id}`); }
    if (s.more) { const r = fresh().reply(id, s.more, { present: [id] }); ok(r.topic === s.id, `${id}: more "${s.more}" -> ${r.topic}`); }
  }
  for (const c of CAST[id].chips) { const r = fresh().reply(id, c, { present: [id] }); ok(r.topic !== 'fallback' && r.topic !== 'opinion', `${id}: opener "${c}" -> ${r.topic}`); }
}
// own subjects by keyword
const SUBJ = { feyn: { 'do you play the drums': 'bongos', 'can you pick a lock': 'safes', 'what is an electron': 'quantum', 'tell me about gravity': 'physics', 'i wonder about things': 'curiosity', 'use the blackboard': 'teach', 'can you sketch me': 'art', 'do you play chess': 'puzzle', 'why is the sky blue?': 'sky', 'you are a genius': 'genius' },
  gigi: { 'spill the tea': 'gossip', 'i went on a date': 'romance', 'nice pearls': 'fashion', 'i need a face mask': 'selfcare', 'any good rom coms': 'shows', 'mercury is in retrograde': 'astrology', 'i baked croissants': 'brunch', 'should i text him': 'advice' },
  nano: { 'will ai take over': 'future', 'what is backprop': 'training', 'what is a transformer': 'nets', 'teach me to code': 'scratch', 'what are tokens': 'data', 'how many gpus': 'gpu', 'nice imac': 'computers', 'what sci-fi do you like': 'books' } };
for (const id of ORDER) for (const [t, want] of Object.entries(SUBJ[id])) { const r = fresh().reply(id, t, { present: [id] }); ok(r.topic === want, `${id}: "${t}" -> ${r.topic}, wanted ${want}`); }

// 2. no repeats until a pool is used up; then no immediate repeat
for (const id of ORDER) for (const s of CAST[id].subjects) {
  const b = fresh(3), seen = [];
  for (let i = 0; i < s.lines.length; i++) seen.push(main(b.reply(id, s.chip ?? s.lines[0], { present: [id] }))?.text);
  const viaChip = !!s.chip;
  if (viaChip) ok(new Set(seen).size === s.lines.length, `${id}.${s.id}: ${s.lines.length} asks gave ${new Set(seen).size} different lines`);
  if (viaChip) { const next = main(b.reply(id, s.chip, { present: [id] })).text; ok(next !== seen[seen.length - 1], `${id}.${s.id}: no immediate repeat after reshuffle`); }
}
{ const b = fresh(5), seen = new Set(); for (let i = 0; i < 4; i++) seen.add(main(b.reply('gigi', 'xyzzy plugh', { present: ['gigi'] })).text); ok(seen.size >= 3, 'fallback varies: ' + seen.size); }

// 3. memory: name, likes, call-backs, "again", told by the others
{ const b = fresh(11); b.reply('gigi', 'my name is anna', { present: ['gigi'] }); ok(b.mem.name === 'Anna', 'name remembered');
  let named = false; for (let i = 0; i < 6; i++) if (/Anna/.test(main(b.reply('gigi', 'hello', { present: ['gigi'] })).text)) named = true; ok(named, 'greets by name later');
  let other = false; for (let i = 0; i < 6; i++) if (/Anna/.test(main(b.reply('nano', 'hi', { present: ['nano'] })).text)) other = true; ok(other, 'the others know the name too'); }
{ const b = fresh(2); const r = b.reply('feyn', 'I love gardening a lot', { present: ['feyn'] }); ok(b.mem.like === 'gardening', 'like remembered: ' + b.mem.like + ' / ' + r.topic);
  ok(b.reply('feyn', "I'm tired", { present: ['feyn'] }).topic === 'feelingBad' && b.mem.name === '', '"I\'m tired" is not a name'); }
{ let back = 0, like = 0; for (let seed = 1; seed < 40; seed++) { const b = fresh(seed); b.reply('feyn', 'tell me about the bongos', { present: ['feyn'] }); b.reply('feyn', 'how do you crack a safe', { present: ['feyn'] }); b.reply('feyn', 'i like trains', { present: ['feyn'] });
    for (let i = 0; i < 3; i++) { const t = main(b.reply('feyn', 'blorp fnord', { present: ['feyn'] })).text; if (/the bongos|safecracking/.test(t)) back++; if (/trains/.test(t)) like++; } }
  ok(back > 8, 'refers back to an earlier subject on a fallback: ' + back); ok(like > 3, 'refers back to a like: ' + like); }
{ const b = fresh(4); const texts = []; for (let i = 0; i < 3; i++) texts.push(b.reply('nano', 'what do you think of the house?', { present: ['nano'] }).lines.map(l => l.text).join(' | '));
  ok(/again|Back to/.test(texts[2]), 'third time on a topic is noticed: ' + texts[2]); }
{ let shared = 0; for (let seed = 1; seed < 30; seed++) { const b = fresh(seed); b.reply('gigi', 'have you seen the garden', { present: ['gigi', 'nano'], quiet: true }); const r = b.reply('nano', 'have you seen the garden', { present: ['gigi', 'nano'] }); if (r.lines.some(l => l.kind === 'pre' && /Geneva/.test(l.text))) shared++; }
  ok(shared > 8, '"Geneva told me you talked about the garden": ' + shared + '/29'); }

// 4. group dynamics
{ let reacts = 0, specific = 0, two = 0; for (let seed = 1; seed < 60; seed++) { const b = fresh(seed); const r = b.reply('gigi', 'any gossip?', { present: ['gigi', 'feyn', 'nano'] }); const rs = r.lines.filter(l => l.kind === 'react');
    if (rs.length) reacts++; if (rs.length > 1) two++; if (rs.some(l => /gripped|sources|tulip|Delphine|no data/.test(l.text))) specific++; ok(rs.every(l => l.who !== 'gigi'), 'reactions come from the others'); }
  ok(reacts > 30 && reacts < 59, 'others react to gossip often, not always: ' + reacts + '/59'); ok(specific > 20, 'with topic-specific lines: ' + specific); ok(two > 2, 'sometimes both: ' + two); }
{ const b = fresh(9); const r = b.reply('gigi', 'what do you make of Feynbot?', { present: ['gigi', 'feyn'] }); ok(r.topic === 'others' && r.about === 'feyn', 'asks about another guest'); 
  let heard = 0; for (let s = 1; s < 20; s++) if (fresh(s).reply('gigi', 'what do you make of Feynbot?', { present: ['gigi', 'feyn'] }).lines.some(l => l.who === 'feyn')) heard++; ok(heard > 12, 'the one talked about pipes up: ' + heard); }
{ const r = fresh().reply('gigi', 'what do you think of nano?', { present: ['gigi'] }); ok(r.topic === 'absent' && /Nano/.test(main(r).text) && /phone|Ring/i.test(main(r).text), 'absent friend: suggests ringing: ' + main(r).text); }
{ const r = fresh().reply('gigi', 'Nano, how does a neural net learn?', { present: ['gigi', 'nano'] }); ok(r.to === 'nano' && r.topic === 'nets' && main(r).who === 'nano', 'a question addressed by name is answered by the one named'); }
{ const r = fresh().reply('feyn', 'how is everyone?', { present: ['gigi', 'nano', 'feyn'] }); ok(new Set(r.lines.map(l => l.who)).size === 3, 'everyone answers a question to the room: ' + r.lines.length); }
{ const r = fresh().reply('feyn', 'hello everybody, my name is anna', { present: ['gigi', 'nano', 'feyn'] }); ok(r.lines.filter(l => /Anna/.test(l.text)).length >= 2, 'everyone greets a new name'); }
{ const r = fresh().reply('nano', 'shall we dance?', { present: ['gigi', 'nano', 'feyn'], music: false }); ok(r.act === 'dance' && r.lines.length === 3 && /record|count|hum|beat/i.test(main(r).text), 'dance: everyone joins, and asks for a record when it is quiet: ' + main(r).text);
  const r2 = fresh().reply('nano', 'shall we dance?', { present: ['nano'], music: true }); ok(!/record would help/.test(main(r2).text), 'dance with music on'); }
{ const r = fresh().reply('gigi', 'fancy a coffee?', { present: ['gigi'] }); ok(r.act === 'coffee', 'Geneva heads for the coffee bar'); ok(fresh().reply('feyn', 'play the bongos', { present: ['feyn'] }).act === 'drum', 'Feynbot drums'); }
{ const r = fresh().reply('gigi', "I'm feeling sad", { present: ['gigi', 'feyn', 'nano'] }); ok(r.lines.filter(l => l.kind === 'react').length >= 1, 'the room rallies round'); }
ok(fresh().reply('feyn', 'goodbye', { present: ['feyn'] }).act === 'close' && fresh().reply('feyn', 'you should go home now', { present: ['feyn'] }).act === 'leave', 'goodbye closes; go home sends home');

// 5. overheard banter
{ const b = fresh(8), seen = new Set(); let okWho = true;
  for (let i = 0; i < 5; i++) { const s = b.banter(['feyn', 'nano']); seen.add(s.lines[0].text); if (s.lines.some(l => !['feyn', 'nano'].includes(l.who))) okWho = false; }
  ok(seen.size === 5 && okWho, 'pair banter: five different scripts, only those two speak');
  ok(b.banter(['feyn']) === null, 'nobody talks to themselves');
  const c = fresh(8), all = new Set(); let trio = 0; for (let i = 0; i < 21; i++) { const s = c.banter(['feyn', 'nano', 'gigi']); all.add(s.lines[0].text); if (s.who.length === 3) trio++; }
  ok(all.size === 21, 'with three over, all ' + BANTER.length + ' scripts come up before any repeats: ' + all.size); ok(trio === 6, 'including the six for all three'); }
for (const s of BANTER) ok(s.lines.every(([w]) => s.who.includes(w)) && s.who.every(w => s.lines.some(([x]) => x === w)), 'banter script speakers match');

// 6. every line everywhere: no stray braces, fits a bubble
let n = 0, longest = '';
const check = (t, where) => { n++; if (t.length > longest.length) longest = t; ok(typeof t === 'string' && t.length > 1 && t.length <= 190, `${where}: length ${t.length}: ${t}`); ok(!/\{(?!,? ?(name|Name|other|Other|topic|Topic|like|Like|time)\})/.test(t), `${where}: unknown token: ${t}`); };
for (const id of ORDER) { const C = CAST[id];
  for (const [k, l] of Object.entries(C.pools)) l.forEach(t => check(t, `${id}.${k}`));
  for (const s of C.subjects) s.lines.forEach(t => check(t, `${id}.${s.id}`));
  for (const grp of ['others', 'staffNear', 'drift', 'atSpot']) for (const [k, l] of Object.entries(C[grp])) l.forEach(t => check(t, `${id}.${grp}.${k}`));
  for (const [k, l] of Object.entries(C.react)) (k === 'topics' ? Object.values(l).flat() : l).forEach(t => check(t, `${id}.react.${k}`));
  for (const need of ['phone', 'phoneAgain', 'arrive', 'arriveAlone', 'greet', 'howareyou', 'who', 'real', 'house', 'garden', 'staff', 'barty', 'mort', 'fig', 'reggie', 'gardeners', 'owner', 'drink', 'food', 'music', 'dance', 'danceQuiet', 'danceJoin', 'compliment', 'thanks', 'insult', 'joke', 'feelingBad', 'feelingGood', 'loveyou', 'why', 'how', 'opinion', 'yes', 'no', 'laugh', 'nameIntro', 'likes', 'sorry', 'help', 'weather', 'night', 'fallback', 'callback', 'likeback', 'repeat', 'shared', 'absent', 'heard', 'handoff', 'bye', 'follow', 'upstairs', 'waitOutside', 'welcomeBack', 'idle', 'seated', 'sentHome', 'leave', 'hum'])
    ok(C.pools[need]?.length >= 1, `${id} has a "${need}" pool`);
  for (const k of ['greet', 'howareyou', 'house', 'garden', 'drink', 'music', 'compliment', 'joke', 'why', 'opinion', 'fallback']) ok(C.pools[k].length >= 3 || (k === 'compliment' && C.pools[k].length >= 3), `${id}.${k} has several variants (${C.pools[k].length})`);
}
BANTER.forEach((s, i) => s.lines.forEach(([, t]) => check(t, 'banter' + i)));
{ const b = fresh(); ok(b.say('gigi', 'staffNear:barty').length > 3 && b.say('feyn', 'drift:chalkboard').length > 3 && b.say('nano', 'atSpot:desk').length > 3, 'place and staff remarks'); ok(!/[{}]/.test(b.say('gigi', 'greet')), 'pet name when the name is unknown: ' + b.say('gigi', 'greet')); }
// 7. suggestions always lead somewhere
for (const id of ORDER) { const b = fresh(12); let world = { present: ORDER }; let chips = b.chips(id, world); const seen = new Set();
  for (let i = 0; i < 30; i++) { ok(chips.length >= 3 && chips.length <= 4, `${id}: ${chips.length} suggestions`); const c = chips[i % chips.length]; seen.add(c); const r = b.reply(id, c, world); ok(r.topic !== 'fallback' && !(r.topic === 'opinion' && !/think/.test(c)), `${id}: suggestion "${c}" -> ${r.topic}`); chips = r.chips; }
  ok(seen.size >= 9, `${id}: suggestions move on (${seen.size} different in 30 turns)`); }
// a little conversation, for the eye
{ const b = fresh(21), W = { present: ['gigi', 'feyn', 'nano'], music: false, hour: 15 };
  for (const [to, t] of [['gigi', 'hi! my name is Anna'], ['gigi', 'any gossip?'], ['gigi', 'I love tulips'], ['feyn', 'why is the sky blue?'], ['feyn', 'Nano, what is a training curve?'], ['nano', 'what do you make of Geneva?'], ['gigi', 'hmm, florp'], ['feyn', 'shall we dance?'], ['gigi', 'bye for now']]) {
    const r = b.reply(to, t, W); console.log(`\n  you -> ${CAST[to].short}: ${t}   [${r.topic}${r.act ? ', ' + r.act : ''}]`); for (const l of r.lines) console.log(`     ${CAST[l.who].short}${l.kind === 'react' ? ' (joins in)' : ''}: ${l.text}`); console.log('     chips:', r.chips.join(' | ')); } }
console.log(`\n${n} lines checked; longest ${longest.length} chars`);
console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
