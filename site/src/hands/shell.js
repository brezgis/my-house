// The little shell on the office monitors. Pure: text in, lines out (node tests every command).
// env supplies what it may know about the house, all optional:
//   hour() the house's clock (0-24) · next() puts on the next record, returns its title ·
//   robots() [{ who, room, task }] · books() titles taken down this visit · guests() guest-book lines ·
//   held() what is in the visitor's hand

const FILES = {
  'README': ['This is the office machine. It is called "samovar-the-lesser".', 'It does very little, cheerfully. Type help, or click a command below.', 'Nothing typed here leaves this room.'],
  'todo.txt': ['[x] feed the sourdough', '[x] ring the piano tuner', '[ ] chapter 3 (the one with the parser)', '[ ] reply to the Professor', '[ ] reply to the Professor, properly', '[ ] ask Fig to stop renaming my branches', '[ ] oat milk!', '[ ] git push'],
  'recipe.txt': ['LEMON TART, as made in this kitchen', '', 'Shell: 200 g flour, 100 g cold butter, 2 tbsp sugar, 1 yolk, a little', 'cold water. Rest it, roll it, bake it blind until it is pale gold.', 'Filling: 4 eggs, 150 g sugar, the juice and zest of 4 lemons,', '150 ml cream. Whisk, strain, pour into the warm shell.', 'Bake low, until it only just trembles. Let it cool. This is the hard part.'],
  'house.txt': ['Built 1906, in the Arts and Crafts manner: redwood, clinker brick, art glass.', 'The sleeping porch came in 1910. The island came later and nobody will say how.', 'No overhead lights are ever lit. Lamps, candles, the fire.', 'The door is not locked. It has no lock. It has never needed one.'],
  'robots.txt': ['User-agent: *', 'Allow: /kitchen', 'Allow: /garden', 'Disallow: /cellar        # there is no cellar', 'Crawl-delay: one cup of tea', '', '# The butlers ask it to be noted that they hover, and do not crawl.'],
  'thesis/abstract.txt': ['We present a system. It works on the examples in this paper.', 'Future work: the other examples.'],
  'thesis/advisor_feedback.txt': ['"Interesting!"  (p. 2)', '"?"  (p. 5)', '"See me."  (p. 9)', '"Did the robot write this section? It is the clearest."  (p. 14)'],
  'thesis/chapter3.tex': ['% TODO', '% TODO (for real)', '\\section{The Parser}', 'It parses.'],
  '.diary': ['Tuesday. Wrote four hundred words and deleted five hundred. Net progress: tart.'],
};
const FORTUNES = [
  'You will find what you were looking for in the last book you take down.',
  'A parser that never fails has never been shown a real sentence.',
  'There is cake. There is always cake. This is not a metaphor.',
  'Time flies like an arrow; fruit flies like a banana.',
  'The treebank giveth, and the annotation guidelines taketh away.',
  'Buffalo buffalo Buffalo buffalo buffalo buffalo Buffalo buffalo. Go and lie down.',
  'Somebody in this house is thinking of putting the kettle on. Be that somebody.',
  'All grammars leak. Bring a towel.',
  'The old man the boats. Read it again; it is fine.',
  'You are exactly as far along as you are supposed to be. (The committee may differ.)',
];
const UNKNOWN = [
  c => `${c}: not a thing this machine does. It does not do most things.`,
  c => `${c}? Mortimer has been asked. Mortimer says no.`,
  c => `${c}: command not found. It may be in the garden; things end up there.`,
  c => `I do not know "${c}". Try help, or a cup of tea.`,
];

// ---- toys for a linguist ---------------------------------------------------------------------
export function tokenize(s) { return s.match(/[A-Za-zÀ-ÿ0-9]+(?:['’][A-Za-z]+)?|[^\sA-Za-zÀ-ÿ0-9]/g) ?? []; }
const LEX = {
  D: 'the a an this that these those my your her his its our their every some no'.split(' '),
  P: 'in on at by with to from of under over near behind beside through for'.split(' '),
  V: 'is are was were has have had brings bring brought sleeps sleep slept eats eat ate reads read sees see saw likes like liked rides ride plays play makes make made opens open hovers hover sings sing sang parses parse loves love man'.split(' '),
  A: 'old green colorless colourless small big little warm quiet pink good sassy furious tall lazy brown quick'.split(' '),
  Adv: 'furiously quietly slowly well badly often never always'.split(' '),
  Pro: 'i you he she it we they'.split(' '),
};
const tagOf = w => { const l = w.toLowerCase(); for (const t in LEX) if (LEX[t].includes(l)) return t; if (/ly$/.test(l)) return 'Adv'; return 'N'; };
// A toy: NP = (D) A* N+ | Pro ; PP = P NP ; S = NP V (NP) PP* (Adv). It is wrong about plenty, like its betters.
export function parse(s) {
  const words = tokenize(s).filter(w => /\w/.test(w)); if (!words.length) return null;
  let tags = words.map(tagOf), i = 0;
  const np = () => {
    const st = i; let out = [];
    if (tags[i] === 'Pro') { out.push(`[Pro ${words[i++]}]`); return `[NP ${out.join(' ')}]`; }
    if (tags[i] === 'D') out.push(`[D ${words[i++]}]`);
    while (tags[i] === 'A' && i < words.length - 1 && (tags[i + 1] === 'A' || tags[i + 1] === 'N')) out.push(`[A ${words[i++]}]`);
    let n = 0; while (tags[i] === 'N') { out.push(`[N ${words[i++]}]`); n++; }
    if (!n) { i = st; return null; }
    return `[NP ${out.join(' ')}]`;
  };
  const pps = () => { const out = []; while (tags[i] === 'P') { const st = i, p = words[i++], n = np(); if (!n) { i = st; break; } out.push(`[PP [P ${p}] ${n}]`); } return out; };
  const go = () => {
    i = 0; const subj = np(); if (!subj) return null; const sp = pps();
    if (tags[i] !== 'V') return null;
    const vp = [`[V ${words[i++]}]`]; const obj = np(); if (obj) vp.push(obj); vp.push(...pps()); while (tags[i] === 'Adv') vp.push(`[Adv ${words[i++]}]`);
    if (i < words.length) return null;
    return `[S ${[subj, ...sp].join(' ')} [VP ${vp.join(' ')}]]`;
  };
  let tree = go();
  if (!tree) {                      // a garden path: let an adjective be the noun, and the next noun-or-verb the verb ("the old man the boats")
    const a = tags.indexOf('A');
    if (a >= 0 && a + 1 < tags.length) { tags = tags.slice(); tags[a] = 'N'; tags[a + 1] = 'V'; tree = go(); if (tree) tree += '   (garden path; took the long way round)'; }
  }
  return tree;
}
export function plural(w) {
  const l = w.toLowerCase();
  if (l === 'wug') return ['wugs  /wʌgz/', 'Correct. You are at least four years old.'];
  if (/(s|z|x|ch|sh)$/.test(l)) return [`${w}es  /-ɪz/`, 'after a sibilant'];
  if (/[^aeiou]y$/.test(l)) return [`${w.slice(0, -1)}ies  /-z/`, 'after a voiced sound'];
  if (/(p|t|k|f|th)$/.test(l)) return [`${w}s  /-s/`, 'after a voiceless sound'];
  return [`${w}s  /-z/`, 'after a voiced sound'];
}

// ---- the shell ---------------------------------------------------------------------------------
// The commands offered as buttons under the screen (each is also typed in the ordinary way).
export const MENU = ['help', 'ls', 'cat todo.txt', 'cat recipe.txt', 'cat house.txt', 'cat robots.txt', 'date', 'whoami', 'fortune', 'play', 'robots', 'books', 'guests', 'tokenize', 'parse', 'wug', 'clear', 'exit'];

export function makeShell(env = {}) {
  let nf = 0, nu = 0;
  const hist = [];
  const clock = () => { const h = ((env.hour?.() ?? 12) % 24 + 24) % 24, hh = Math.floor(h), mm = Math.floor((h % 1) * 60); return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`; };
  const part = () => { const h = env.hour?.() ?? 12; return h < 5 ? 'the small hours' : h < 12 ? 'morning' : h < 17 ? 'afternoon' : h < 21 ? 'evening' : 'night'; };
  const ls = all => { const top = new Set(); for (const f in FILES) { const d = f.split('/')[0]; if (all || !d.startsWith('.')) top.add(f.includes('/') ? d + '/' : d); } return [...top].sort(); };
  const C = {
    help: () => ['Things this machine will do:', '  ls [-a] [dir]      what is here', '  cat <file>         read something', '  date               the hour, by the house clock', '  whoami             a fair question', '  fortune            one free', '  play               put on the next record', '  robots             what the butlers are up to', '  books              what you have taken down from the shelves', '  guests             the guest book (it lives on the pink computer)', '  tokenize <text>    cut a sentence into tokens', '  parse <sentence>   draw its tree, more or less', '  wug | plural <w>   a test you passed at four', '  clear, exit', 'Other things may answer too.'],
    ls: a => { const all = a.includes('-a'), dir = a.find(x => !x.startsWith('-'))?.replace(/\/$/, ''); if (!dir || dir === '.') return [ls(all).join('   ')]; const inside = Object.keys(FILES).filter(f => f.startsWith(dir + '/')).map(f => f.slice(dir.length + 1)); return inside.length ? [inside.join('   ')] : [`ls: ${dir}: nothing by that name`]; },
    cat: a => { if (!a.length) return ['cat: which file? (try ls)']; const out = []; for (const f of a) { const k = f.replace(/^\.\//, ''); if (k === 'guestbook.txt') out.push(...C.guests()); else if (FILES[k]) out.push(...FILES[k]); else if (Object.keys(FILES).some(x => x.startsWith(k.replace(/\/$/, '') + '/'))) out.push(`cat: ${f}: is a directory, and a messy one`); else out.push(`cat: ${f}: no such file. This house has no cats either.`); } return out; },
    date: () => [`${clock()}, ${part()}, by the house clock. The year is not this machine's business.`],
    time: () => C.date(),
    whoami: () => ['guest', 'A welcome one. The door was open on purpose.'],
    pwd: () => ['/house/office'],
    cd: () => ['You are already home.'],
    fortune: () => [FORTUNES[nf++ % FORTUNES.length]],
    play: () => { const t = env.next?.(); return [t ? `Now playing: ${t}` : 'The record player does not answer. Try the one in the living room.']; },
    next: () => C.play(),
    robots: () => { const r = env.robots?.() ?? []; return r.length ? r.map(x => `${String(x.who).padEnd(12)} ${String(x.room ?? '-').padEnd(22)} ${x.task ?? ''}`.trimEnd()) : ['No butler answers. They are either very busy or pretending to be.']; },
    ps: () => ['  PID  WHO          DOING', ...C.robots().map((l, i) => `  ${String(1906 + i).padEnd(4)} ${l}`)],
    top: () => C.ps(),
    books: () => { const b = env.books?.() ?? []; return b.length ? ['Taken down this visit:', ...b.map(t => '  ' + t)] : ['You have not taken a book down yet. The shelves are patient.']; },
    guests: () => { const g = env.guests?.() ?? []; return g.length ? g : ['The guest book is empty. It is on the pink computer.']; },
    tokenize: a => { if (!a.length) a = ["Don't", 'panic,', "it's", 'only', 'morphology.']; const t = tokenize(a.join(' ')); return [t.map(x => `[${x}]`).join(' '), `${t.length} tokens. (Tokens are not words. See the sticky note.)`]; },
    parse: a => { const s = a.length ? a.join(' ') : 'the old butler brings warm tea to the porch'; const t = parse(s); return t ? [t] : [`*${s}`, 'No parse. The grammar has nine rules and feels bad about it.']; },
    wug: () => ['This is a wug.', 'Now there is another one. There are two of them.', 'There are two ____ .       (try: plural wug)'],
    plural: a => (a.length ? plural(a[0]) : ['plural: of what?']),
    colorless: () => ['[S [NP [A colorless] [A green] [N ideas]] [VP [V sleep] [Adv furiously]]]', 'Grammatical. Meaningless. Carry on.'],
    echo: a => [a.join(' ')],
    history: () => hist.map((h, i) => `  ${i + 1}  ${h}`),
    man: a => [a.length ? `No manual for ${a[0]}. Nobody here reads manuals; ask a butler.` : 'What manual page do you want? (There are none.)'],
    sudo: () => ['Mortimer has been informed. He is not impressed.'],
    rm: () => ['Nothing in this house is thrown away.'],
    vim: () => ['You are now inside vim.', '…', 'Only joking. You may leave. Here, uniquely, you may leave.'],
    emacs: () => ['There is already one operating system on this machine.'],
    git: a => (a[0] === 'push' ? ['Everything up-to-date. (The sticky note may now be removed.)'] : a[0] === 'log' ? ['a1b2c3d  fix typo', 'd4e5f6a  fix fix', '9f8e7d6  Fig: renamed branch to "thesis-final-FINAL-2"'] : ['On branch thesis', 'nothing to commit, working tree anxious']),
    make: a => [`make: *** No rule to make target '${a[0] ?? 'tea'}'. Ask Bartholomew.`],
    python: () => ['>>> import tart', "ModuleNotFoundError: it is in the kitchen"],
    ssh: () => ['No network here. The house keeps to itself.'],
    ping: () => C.ssh(), curl: () => C.ssh(), wget: () => C.ssh(),
    uptime: () => ['up since 1906, one user, load average: a cup of tea'],
    hello: () => ['Hello. Mind the cables.'], hi: () => C.hello(),
    held: () => [env.held?.() ? `You are holding the ${env.held()}. Do not put it on the keyboard.` : 'Your hands are empty. The fruit is in the dining room.'],
    clear: () => [], exit: () => ['Goodbye. Mind the step.'], logout: () => C.exit(), quit: () => C.exit(),
  };
  return {
    files: Object.keys(FILES), commands: Object.keys(C),
    run(line) {
      line = String(line ?? '').trim().slice(0, 200); if (!line) return { out: [] };
      hist.push(line);
      const [cmd, ...args] = line.split(/\s+/), k = cmd.toLowerCase();
      if (!Object.hasOwn(C, k)) return { out: [UNKNOWN[nu++ % UNKNOWN.length](cmd)] };
      return { out: C[k](args), clear: k === 'clear', exit: k === 'exit' || k === 'logout' || k === 'quit' };
    },
  };
}
