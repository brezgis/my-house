// How the friends talk: keyword and pattern matching over what the visitor types,
// with a little memory. Pure logic (no three.js, no DOM, no network), so it can be
// tested with node:  see site/friendtest.html and the notes in friends.js.
//
//   const brain = makeBrain({ rnd });
//   brain.reply('gigi', 'any gossip?', { present: ['gigi', 'feyn'], music: true, hour: 14 })
//     -> { to, topic, lines: [{ who, text, expr, kind }], act, chips }
//   brain.banter(['gigi', 'feyn'])   -> { lines: [{ who, text }] }   (overheard conversations)
//   brain.say('gigi', 'arrive')      -> a line from one of her pools, never the same twice running
//
// Memory, for the length of the visit: the visitor's name and something they said they
// like (shared by everyone, as friends do), what each guest has already been asked, and
// a shuffled bag per pool so nobody repeats themselves until they have run out.

import { CAST, ORDER, BANTER } from './cast.js';
import { shuffle } from '../shuffle.js';

export const norm = s => String(s ?? '').toLowerCase().replace(/[’'`]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const cap = s => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const words = s => (s ? s.split(' ').length : 0);

// What everybody can be asked about. [id, priority, pattern]; the highest priority that
// matches wins, earlier entries win ties. Each guest's own subjects sit at priority 6.
const COMMON = [
  ['gohome', 9, /\b(go home|head home|time (for you )?to (go|leave)|you (should|can|may) (go|leave)( now)?$|please leave|off you go)\b/],
  ['dance', 8, /\b(danc\w*|boogie|twirl|shimmy|waltz|tango|disco|bust a move|groove)\b/],
  ['real', 8, /\b(are you|youre|you are|r u)\b.*\b(real|actual|actually|really him|the real|a person|human|a robot)\b|\b(richard|feynman|andrej|karpathy)\b/],
  ['barty', 7, /\b(barty|bartholomew|butlers?|top hat)\b/],
  ['mort', 7, /\b(mort|mortimer)\b/],
  ['fig', 7, /\bfig\b/],
  ['reggie', 7, /\b(reggie|reginald|vacuum|roomba|hoover)\b/],
  ['gardeners', 7, /\b(bramble|thistle|gardeners?)\b/],
  ['loveyou', 7, /\bi (really |do |just )?(love|adore|like) (you|u)\b|\byoure my (favou?rite|best friend|bestie)\b|\blove (you|u|ya)\b/],
  ['staff', 5, /\b(robots?|staff|servants?|bots|household)\b/],
  ['owner', 5, /\b(auntie|aunt|owner|madame|anna|who lives here|whose house|lady of the house|hostess)\b/],
  ['garden', 5, /\b(garden\w*|flowers?|roses?|trees?|pond|koi|fish|bees?|hives?|swing|outside|outdoors|terrace|porch|island|plants?|telescope|stars?)\b/],
  ['drink', 5, /\b(coffees?|lattes?|espresso|cappuccino|tea|drinks?|thirsty|cocoa|wine|juice|lemonade|kettle|cuppa|mocha|matcha|water)\b/],
  ['food', 5, /\b(food|eat\w*|hungry|snacks?|cakes?|cookies?|pantry|dinner|lunch|breakfast|cheese|chocolate|pizza|crackers?)\b/],
  ['music', 5, /\b(music|songs?|records?|piano|sing\w*|playlists?|tunes?|jazz|band|album|listen\w*)\b/],
  ['joke', 5, /\b(jokes?|(something|anything) funny|make me laugh|puns?)\b/],
  ['feelingBad', 5, /\b(im|i am|i feel|feeling|ive been|been) (so |really |very |a bit |kind of |kinda |pretty |a little |quite )?(sad|tired|down|lonely|stressed|anxious|upset|bad|awful|terrible|exhausted|sick|depressed|worried|overwhelmed|nervous|not (ok|okay|good|great|well))\b|\b(bad|rough|hard|long|terrible|awful) (day|week|time|night)\b|\bi miss\b|\bnot (so )?(great|good)\b/],
  ['feelingGood', 5, /\b(im|i am|i feel|feeling) (so |really |very |pretty |quite )?(happy|good|great|fine|excited|wonderful|amazing|well|fantastic|ok|okay|cosy|cozy)\b/],
  ['howareyou', 5, /\bhow (are|r) (you|u|ya|things)\b|\bhows it going\b|\bhows (life|everything|your day|things)\b|\bhow have you been\b|\bhow do you do\b|\bwhats up\b|\bwassup\b|\byou (ok|okay|alright)\b|\bhow you doing\b|\bhow are we\b/],
  ['who', 5, /\bwho (are|r) (you|u)\b|\bwhat are you\b|\byour name\b|\babout (yourself|you)\b|\bintroduce\b|\bwhat do you do\b|\bwho is this\b/],
  ['compliment', 5, /\b(you are|youre|ur|you look|thats|that is|what a|you two are|you guys are) (so |really |very |such a |pretty |all )?(great|nice|sweet|funny|smart|clever|cute|lovely|awesome|amazing|cool|brilliant|wonderful|adorable|kind|beautiful|pretty|the best|fun|charming|gorgeous|good|delightful|hilarious|sweetheart)\b|\bi (love|like) your\b|\b(well done|good job|nice one|love it|love that|bravo)\b/],
  ['thanks', 5, /\b(thanks|thank you|thx|cheers|much appreciated)\b/],
  ['insult', 5, /\b(stupid|dumb|idiot|shut up|hate you|youre (boring|annoying|ugly|bad|awful|the worst|wrong|useless)|boring|go away|you suck|loser)\b/],
  ['house', 5, /\b(house|home|bungalow|rooms?|place|architecture|decor|furniture|lamps?|beams?|woodwork|fireplace|upstairs|kitchen|hall|sofa|cosy|cozy)\b/],
  ['weather', 4, /\b(weather|sunny|rain\w*|sky|sunset|sunrise|what time|the time|oclock|morning|afternoon|evening)\b/],
  ['night', 4, /\b(night|dark|late|midnight|moon)\b/],
  ['sorry', 4, /\b(sorry|apolog\w+|my bad|oops)\b/],
  ['help', 4, /\b(help|what can (i|we) (say|ask|do|talk about)|what (should|shall) (i|we) (say|ask|talk about)|options|topics)\b/],
  ['opinion', 3, /\bwhat do you (think|reckon|make of)\b|\byour (opinion|thoughts|take)\b|\bdo you (like|love|enjoy|think|believe|agree)\b|\bfavou?rite\b|\bthoughts\b/],
  ['why', 3, /\bwhy\b|\bhow come\b|\bwhat for\b/],
  ['how', 3, /\bhow (do|does|did|can|could|would|should|to|is|are)\b|\bexplain\b/],
  ['greet', 2, /^(hi+|hey+|hello+|hiya|howdy|yo|heya|good (morning|afternoon|evening|day)|greetings|hola|bonjour|oh hi|well hello)\b|\b(hello|hi there|hey there|nice to (meet|see) you|lovely to (meet|see) you|good to see you)\b/],
  ['yes', 1, /^(yes|yeah|yep|yup|sure|ok|okay|of course|definitely|absolutely|totally|please|lets|i do|i did|i am|true|right|exactly|agreed|mhm|indeed)\b/],
  ['no', 1, /^(no|nope|nah|not really|never|i dont|i didnt|im not|no way|no thanks)\b/],
  ['laugh', 1, /\b(ha(ha)+|hehe+|lol|lmao|rofl|hah|heh)\b|^ha$/],
];
const BYE = /\b(bye|goodbye|good bye|see (you|ya)|cya|good ?night|night night|farewell|gotta go|got to go|i (must|should|have to|better) go|im off|talk (to you )?later|later|thats all|ttyl|so long)\b/;
const EVERYONE = /\b(everyone|everybody|you all|yall|all of you|you guys|guys|both of you|you two|you three|all three|the three of you|gang|folks)\b/;
const THE_OTHERS = /\b(the others?|everyone else|your friends?|other guests?|the other (two|one|guests?)|who else)\b/;
const NOT_NAMES = new Set(('tired sad happy fine good great ok okay hungry bored back here sorry home lost new late ready sure glad well not so very really just a an the in at on off going trying looking thinking feeling ' +
  'excited stressed lonely sick done cold hot thirsty curious confused serious joking kidding only also still always never too your you').split(' '));
const LABEL = { house: 'the house', garden: 'the garden', staff: 'the house robots', barty: 'Bartholomew', mort: 'Mortimer', fig: 'Fig', reggie: 'Sir Reginald', gardeners: 'the gardeners',
  owner: 'the lady of the house', drink: 'coffee', food: 'snacks', music: 'music', dance: 'dancing', weather: 'the weather', night: 'the night' };
const REACT_KEY = { barty: 'staff', mort: 'staff', fig: 'staff', reggie: 'staff', gardeners: 'staff', food: 'drink', loveyou: 'compliment' };
const EXPR = { greet: 'happy', joke: 'wink', compliment: 'love', loveyou: 'love', feelingBad: 'neutral', feelingGood: 'happy', fallback: 'surprised', insult: 'sass', dance: 'happy', nameIntro: 'happy',
  thanks: 'happy', bye: 'happy', laugh: 'happy', yes: 'happy', real: 'wink', who: 'happy', why: 'focus', how: 'focus', opinion: 'sass', gohome: 'happy' };
const QUIET_TOPICS = new Set(['yes', 'no', 'laugh', 'greet', 'bye', 'gohome', 'thanks', 'sorry', 'help', 'fallback', 'who', 'real', 'howareyou', 'likes', 'opinion', 'why', 'how', 'insult', 'absent', 'weather', 'night', 'owner', 'feelingGood']);
const COMMON_CHIPS = [['dance', 'Shall we dance?'], ['house', 'What do you think of the house?'], ['staff', 'What do you make of the house robots?'], ['joke', 'Tell me a joke'], ['garden', 'Have you seen the garden?'], ['howareyou', 'How are you?'], ['music', 'What music do you like?']];
const NUM = ['twelve', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven'];
export function timeWords(hour = 12) {
  const h = ((Math.round(hour) % 24) + 24) % 24;
  return `${NUM[h % 12]} ${h < 5 ? 'at night' : h < 12 ? 'in the morning' : h < 17 ? 'in the afternoon' : h < 21 ? 'in the evening' : 'at night'}`;
}

const ALIAS = {}, ALIAS_ALL = {}, VOCATIVE = {};
for (const id of ORDER) {
  ALIAS[id] = new RegExp(`\\b(?:${CAST[id].alias})\\b`); ALIAS_ALL[id] = new RegExp(`\\b(?:${CAST[id].alias})\\b`, 'g');
  VOCATIVE[id] = new RegExp(`^(?:(?:hey|hi|hello|ok|okay|so|and|oh|um|yo|well) )?(?:${CAST[id].alias})\\b`);
}

// The pulse of each record in the crate, to dance to (party.js sets the beat from it; it lives here because
// it is pure, and so is tested with the rest of this file). sound.js tells us only the title of what is on
// (nowPlaying), so the tempo is looked up here by title. These are felt tempos for swaying to, by ear and
// from the usual markings, not metronome readings (the classical records are played with plenty of rubato);
// the second number is how much bounce the music has (1 a proper dance, 0.5 a slow sway). A record not in
// the list gets a middling 84 and a gentle sway. If sound.js ever says the record's bpm (nowTrack().bpm),
// that wins.
const TEMPI = [
  [/my house/i, 94, 1], [/come on in/i, 97, 1], [/gymnop/i, 68, 0.5], [/goldberg.*variation 13/i, 66, 0.55], [/goldberg.*: aria/i, 60, 0.45],
  [/op\. 9 no\. 2/i, 56, 0.45], [/72 no\. 1/i, 66, 0.5], [/prelude no\. 1 /i, 70, 0.7], [/prelude no\. 9/i, 60, 0.6], [/prelude no\. 17/i, 104, 0.85],
  [/träumerei|traumerei/i, 60, 0.45], [/am kamin|fireside/i, 100, 0.85], [/foreign lands/i, 96, 0.75], [/moonlight/i, 54, 0.4], [/k\. 333/i, 64, 0.55],
  [/romance an[oó]nimo|spanish romance/i, 72, 0.55], [/cello suite/i, 76, 0.7],
];
export function tempoFor(title, bpm = null) {
  const hit = TEMPI.find(([re]) => re.test(title ?? ''));
  if (+bpm > 30) return { bpm: +bpm, feel: hit ? hit[2] : +bpm > 85 ? 1 : 0.6 };
  return hit ? { bpm: hit[1], feel: hit[2] } : { bpm: 84, feel: 0.6 };
}

export function makeBrain({ rnd = Math.random } = {}) {
  const mem = { name: '', like: '', turns: 0, danced: 0, by: {}, bags: new Map(), banter: new Set(), lastBanter: -1 };
  for (const id of ORDER) mem.by[id] = { count: {}, labels: [], last: null, lastBack: -9, sharedSaid: new Set(), turns: 0, asked: {} };

  // A shuffled bag per pool: nothing repeats until everything has been said once
  function bag(key, list) {
    if (!list || !list.length) return '';
    let b = mem.bags.get(key);
    if (!b || b.i >= b.order.length || b.order.length !== list.length) {
      const last = b ? b.order[b.order.length - 1] : -1;
      const order = shuffle(list.map((_, i) => i), rnd);
      if (order.length > 1 && order[0] === last) order.push(order.shift());
      b = { order, i: 0 }; mem.bags.set(key, b);
    }
    return list[b.order[b.i++]];
  }
  function fill(text, who, vars = {}) {
    const C = CAST[who], name = mem.name;
    return text.replace(/\{(,? ?)(\w)(\w*)\}/g, (_, pre, a, b) => {
      const k = (a + b).toLowerCase();
      if (k === 'name' && pre) return name ? pre + name : '';
      let v = k === 'name' ? (name || C.call) : k === 'time' ? timeWords(vars.hour) : k === 'like' ? (vars.like ?? mem.like) : (vars[k] ?? '');
      if (a !== a.toLowerCase() || (k === 'name' && name)) v = cap(v);
      return pre + v;
    });
  }
  const say = (who, pool, vars) => { const C = CAST[who], list = C.pools[pool] ?? C[pool.split(':')[0]]?.[pool.split(':')[1]]; return list ? fill(bag(`${who}.${pool}`, list), who, vars) : ''; };
  const line = (who, text, kind = 'main', expr = null) => ({ who, text, kind, expr });

  // Which rule does this text hit for this guest?
  function match(C, text) {
    let best = null, bp = 0;
    for (const s of C.subjects) if (6 > bp && s.re.test(text)) { best = s.id; bp = 6; }
    for (const [id, p, re] of COMMON) if (p > bp && re.test(text)) { best = id; bp = p; }
    if (BYE.test(text)) { const p = words(text) <= 6 ? 9 : 4; if (p > bp) { best = 'bye'; bp = p; } }
    return { topic: best, p: bp };
  }

  function reply(toId, raw, world = {}) {
    const present = (world.present?.length ? world.present : [toId]).filter(id => CAST[id]);
    const isQ = /\?/.test(String(raw));
    let text = norm(raw), to = toId, handoff = null;
    const vars = { hour: world.hour ?? 12 };
    // "Nano, how does ..." said to somebody else: the one named answers
    for (const id of present) if (id !== toId && VOCATIVE[id].test(text) && words(text.replace(VOCATIVE[id], '').trim()) >= 2) { handoff = toId; to = id; text = text.replace(VOCATIVE[id], '').trim(); break; }
    const C = CAST[to], M = mem.by[to];
    const named = ALIAS[to].test(text);
    text = text.replace(ALIAS_ALL[to], ' ').replace(/ +/g, ' ').trim();
    const others = present.filter(id => id !== to);
    const all = others.length > 0 && EVERYONE.test(text);
    mem.turns++; M.turns++;

    // Things worth remembering
    let topic = null, p = 0, about = null;
    const okName = n => n.length > 1 && !NOT_NAMES.has(n) && !/(ing|ed|ly)$/.test(n) && !ORDER.some(id => new RegExp(`^(?:${CAST[id].alias})$`).test(n));
    const nm = /\b(?:my name is|my names|call me|i am called|im called|they call me) ([a-z]+)/.exec(text), nm2 = /^(?:im|i am|its|this is) ([a-z]+)$/.exec(text);
    if (nm && okName(nm[1])) { mem.name = cap(nm[1]); topic = 'nameIntro'; p = 8; }
    const lk = /\bi (?:really |also |just |do |totally )?(?:love|like|adore|enjoy|am into|m into)\b (?!you\b|u\b|your\b|it\b|that\b|this\b|them\b|him\b|her\b)(?:to )?([a-z0-9 ]+)/.exec(text.replace(/\bim into\b/, 'i am into'));
    if (lk) { const like = lk[1].replace(/\b(too|a lot|so much|very much|as well|though|really|and|but)\b.*$/, '').trim().split(' ').slice(0, 4).join(' '); if (like) { mem.like = like; if (p < 4) { topic = 'likes'; p = 4; } } }
    // Somebody else by name, here or not
    for (const id of ORDER) {
      if (id === to) continue;
      if (ALIAS[id].test(text) && p < 7) { about = id; topic = present.includes(id) ? 'others' : 'absent'; p = 7; }
    }
    if (!about && THE_OTHERS.test(text) && p < 7) {
      about = others.length ? others[Math.floor(rnd() * others.length)] : ORDER.find(id => id !== to && !present.includes(id)) ?? null;
      if (about) { topic = others.length ? 'others' : 'absent'; p = 7; }
    }
    const m = match(C, text);
    if (m.p > p) { topic = m.topic; p = m.p; about = null; }
    if (p < 4.5 && nm2 && okName(nm2[1])) { mem.name = cap(nm2[1]); topic = 'nameIntro'; p = 8; about = null; }      // "I'm Anna" (but not "I'm tired")
    if (!topic) topic = !text ? 'greet' : isQ ? 'opinion' : named && words(text) < 2 ? 'greet' : 'fallback';

    // The answer
    const subj = C.subjects.find(s => s.id === topic), label = subj?.label ?? LABEL[topic] ?? null;
    const out = { to, asked: toId, topic, lines: [], act: null, chips: [], about };
    const count = M.count[topic] ?? 0;
    let pool = topic, main = '';
    if (topic === 'dance') { pool = world.music ? 'dance' : 'danceQuiet'; out.act = 'dance'; mem.danced++; }
    else if (topic === 'gohome') { pool = 'sentHome'; out.act = 'leave'; }
    else if (topic === 'bye') out.act = 'close';
    else if (topic === 'night' && !C.pools.night) pool = 'weather';
    if (subj?.act) out.act = subj.act;
    if (to === 'gigi' && topic === 'drink') out.act = 'coffee';
    if ((topic === 'fallback' || (topic === 'opinion' && !isQ) || (topic === 'opinion' && rnd() < 0.3)) && mem.turns - M.lastBack > 3) {
      const earlier = M.labels.filter(l => l !== M.labels[M.labels.length - 1] || M.labels.length === 1);
      if (earlier.length && rnd() < 0.55) { main = fill(bag(`${to}.callback`, C.pools.callback), to, { ...vars, topic: earlier[Math.floor(rnd() * earlier.length)] }); M.lastBack = mem.turns; }
      else if (mem.like && rnd() < 0.5) { main = say(to, 'likeback', vars); M.lastBack = mem.turns; }
    }
    if (!main) {
      if (subj) main = fill(bag(`${to}.s.${topic}`, subj.lines), to, vars);
      else if (topic === 'others') main = fill(bag(`${to}.o.${about}`, C.others[about]), to, vars);
      else if (topic === 'absent') main = say(to, 'absent', { ...vars, other: CAST[about].short });
      else main = say(to, pool, vars) || say(to, 'fallback', vars);
    }
    if (handoff && rnd() < 0.6) out.lines.push(line(handoff, say(handoff, 'handoff', { other: C.short }), 'pre'));
    if (label) {
      // "we keep coming back to this" / "the others told me you talked about this"
      const told = ORDER.find(id => id !== to && mem.by[id].labels.includes(label));
      if (count >= 2 && count % 2 === 0) out.lines.push(line(to, say(to, 'repeat', { topic: label }), 'pre'));
      else if (told && count === 0 && !M.sharedSaid.has(label) && rnd() < 0.6) { M.sharedSaid.add(label); out.lines.push(line(to, say(to, 'shared', { topic: label, other: CAST[told].short }), 'pre')); }
      const i = M.labels.indexOf(label); if (i >= 0) M.labels.splice(i, 1); M.labels.push(label);
    }
    out.lines.push(line(to, main, 'main', EXPR[topic] ?? null));
    M.count[topic] = count + 1; M.last = topic; if (topic === 'others') M.asked[about] = (M.asked[about] ?? 0) + 1;

    // The rest of the room
    const rk = subj?.rk ?? REACT_KEY[topic] ?? topic;
    const react = (id, force) => {
      const R = CAST[id].react, specific = R.topics[rk];
      if (specific && (force || rnd() < 0.8)) return fill(bag(`${id}.r.${rk}`, specific), id, vars);
      return R[to] ? fill(bag(`${id}.r.${to}`, R[to]), id, vars) : '';
    };
    const spoke = new Set(out.lines.map(l => l.who));
    if (topic === 'dance') for (const id of others) out.lines.push(line(id, say(id, 'danceJoin'), 'react', 'happy'));
    else if (topic === 'others' && present.includes(about)) { if (rnd() < 0.85) out.lines.push(line(about, say(about, 'heard'), 'react', 'sass')); }
    else if (all) {
      for (const id of others) {
        const t = subj ? react(id, true) : topic === 'nameIntro' ? react(id, true) : topic === 'bye' ? say(id, 'bye', vars) : (CAST[id].pools[pool] ? say(id, pool, vars) : react(id, true));
        if (t) out.lines.push(line(id, t, 'react', EXPR[topic] ?? null));
      }
    } else if (others.length && !QUIET_TOPICS.has(topic) && !world.quiet) {
      const order = shuffle(others.slice(), rnd);
      const chance = topic === 'feelingBad' || topic === 'nameIntro' ? 1 : subj ? 0.7 : 0.55;
      order.forEach((id, i) => { if (spoke.has(id)) return; if (rnd() < (i === 0 ? chance : chance * 0.35)) { const t = react(id, topic === 'feelingBad' || topic === 'nameIntro'); if (t) out.lines.push(line(id, t, 'react')); } });
    }
    out.chips = chips(to, { ...world, present });
    return out;
  }

  // A few things to say, for people who would rather not type
  function chips(who, world = {}) {
    const C = CAST[who], M = mem.by[who], out = [];
    const present = world.present ?? [who], others = present.filter(id => id !== who);
    if (!M.turns) return [...C.chips, 'Shall we dance?'];
    const lastSubj = C.subjects.find(s => s.id === M.last);
    if (lastSubj?.more && (M.count[lastSubj.id] ?? 0) < lastSubj.lines.length) out.push(lastSubj.more);
    const shown = M.shown ??= {}, rank = (id, chip) => (M.count[id] ?? 0) * 10 + (shown[chip] ?? 0);
    const subs = C.subjects.filter(s => s.chip && s.id !== M.last).sort((a, b) => rank(a.id, a.chip) - rank(b.id, b.chip) || C.chips.indexOf(b.chip) - C.chips.indexOf(a.chip));
    for (const s of subs) { if (out.length >= 2) break; out.push(s.chip); }
    if (others.length) { const o = others.slice().sort((a, b) => (M.asked[a] ?? 0) - (M.asked[b] ?? 0))[0]; out.push(`What do you make of ${CAST[o].short}?`); }
    const common = COMMON_CHIPS.filter(([id]) => id !== M.last).sort((a, b) => rank(a[0], a[1]) - rank(b[0], b[1]));
    for (const [, text] of common) { if (out.length >= 4) break; out.push(text); }
    for (const c of out) shown[c] = (shown[c] ?? 0) + 1;
    return out;
  }

  // A conversation among the guests for the visitor to overhear
  function banter(present) {
    const fits = BANTER.map((b, i) => [b, i]).filter(([b]) => b.who.every(id => present.includes(id)));
    if (!fits.length) return null;
    let fresh = fits.filter(([, i]) => !mem.banter.has(i));
    if (!fresh.length) { for (const [, i] of fits) mem.banter.delete(i); fresh = fits.filter(([, i]) => i !== mem.lastBanter); if (!fresh.length) fresh = fits; }
    const big = fresh.filter(([b]) => b.who.length === present.length && present.length > 2);
    const pickFrom = big.length && rnd() < 0.6 ? big : fresh;
    const [b, i] = pickFrom[Math.floor(rnd() * pickFrom.length)];
    mem.banter.add(i); mem.lastBanter = i;
    return { who: b.who, lines: b.lines.map(([who, text]) => ({ who, text: fill(text, who) })) };
  }

  return { reply, chips, banter, say, mem, timeWords,
    setName: n => { mem.name = cap(norm(n).split(' ')[0] ?? ''); } };
}

export { CAST, ORDER, BANTER };
