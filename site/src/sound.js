import { shuffle } from './shuffle.js';
// Sound: quiet music as if someone had put a record on, and the small noises
// of a lived-in house - birds outside, the fire, a clock. Nothing plays until
// the visitor steps in (browsers require a gesture). M mutes. The piano is a
// little synthesiser, so anyone can pick out a tune.

export function makeSound() {
  let ctx = null, started = false, muted = false, master = null, house = null, houseAim = 0;
  let vol = 1;      // ui.js hook: overall volume 0..1 from the settings card
  const tracks = [], loops = {};
  let music = null, trackNo = 0;

  let starting = null;
  function start() { return (starting ??= begin()); }
  async function begin() {
    started = true;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain(); master.gain.value = vol; master.connect(ctx.destination);
    house = ctx.createGain(); house.gain.value = 0; house.connect(master);
    let manifest = [];
    try { manifest = await (await fetch('assets/audio/manifest.json')).json(); } catch { /* no audio gathered yet */ }
    for (const m of manifest) {
      if (m.kind === 'music') tracks.push(m);
      else {
        const name = /wind|breeze|leaves/i.test(m.file) ? 'wind' : /bird/i.test(m.file) ? 'birds' : /fire|crackl/i.test(m.file) ? 'fire' : /clock|tick/i.test(m.file) ? 'clock' : /rain/i.test(m.file) ? 'rain' : /cricket|night/i.test(m.file) ? 'night' : null;
        if (!name || loops[name]) continue;
        const ogg = new Audio().canPlayType('audio/ogg; codecs=vorbis');
        const el = new Audio(`assets/audio/${!ogg && m.alt_file ? m.alt_file : m.file}`); el.loop = true; el.volume = 0; el.play().catch(() => {}); loops[name] = el;
      }
    }
    tracks.push({ youtube: 'Cw-IjuVAVk0', title: 'My House, piano cover', composer: 'Pianistmiri (YouTube)', seconds: 215 });
    // "My House" is always the first record on when a guest comes in; after it the crate is shuffled,
    // and reshuffled each time it has been played through (never the same record twice running)
    order = [tracks.find(t => t.youtube === 'Cw-IjuVAVk0'), ...shuffled(tracks.filter(t => t.youtube !== 'Cw-IjuVAVk0'))]; trackNo = 0; nextTrack();
  }
  // "Come On In": the house's own welcome tune, written for it. A bright, bouncy
  // piano piece at 97 beats a minute in B-flat major (written in G, played up a minor third).
  let nowTitle = '', timer = null, tube = null, ducked = false;
  // Lift the needle and put the next record on
  function next() {
    if (!started || !ctx) return '';
    clearTimeout(timer); music?.pause(); music = null;
    house.disconnect(); house = ctx.createGain(); house.gain.value = houseAim; house.connect(master);
    nextTrack(); return nowTitle || music?.title || '';
  }
  // Drums and bass for the mix: a kick, a clap, hats and a long sliding 808
  function hit(kind, when, vol = 0.5) {
    const t = ctx.currentTime + when, g = ctx.createGain(); g.connect(house);
    if (kind === 'kick' || kind === 'sub') {
      const o = ctx.createOscillator(), len = kind === 'sub' ? 0.9 : 0.28; o.type = 'sine';
      o.frequency.setValueAtTime(kind === 'sub' ? vol : 150, t); o.frequency.exponentialRampToValueAtTime(kind === 'sub' ? vol * 0.94 : 42, t + (kind === 'sub' ? len : 0.12));
      g.gain.setValueAtTime(kind === 'sub' ? 0.5 : 0.9, t); g.gain.exponentialRampToValueAtTime(0.001, t + len); o.connect(g); o.start(t); o.stop(t + len + 0.05);
      return;
    }
    const len = kind === 'clap' ? 0.16 : 0.04, buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * len), ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, kind === 'clap' ? 1.5 : 3);
    const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(); src.buffer = buf; f.type = kind === 'clap' ? 'bandpass' : 'highpass'; f.frequency.value = kind === 'clap' ? 1400 : 7000;
    g.gain.value = vol; src.connect(f); f.connect(g); src.start(t);
  }
  function comeOnIn(trunk = false) {
    const beat = 60 / 97, UP = 3, CH = [[43, 50, 59], [38, 45, 54], [40, 47, 55], [36, 43, 52]];          // G, D, Em, C
    const A = [[74, 0, 1], [71, 1, 0.5], [74, 1.5, 0.5], [76, 2, 1], [74, 3, 1]], B = [[78, 0, 1.5], [76, 1.5, 0.5], [74, 2, 1], [69, 3, 1]];
    const C = [[79, 0, 1], [78, 1, 1], [76, 2, 0.5], [74, 2.5, 0.5], [71, 3, 1]], D = [[72, 0, 1], [71, 1, 1], [69, 2, 2]];
    const E = [[83, 0, 0.5], [81, 0.5, 0.5], [79, 1, 1], [78, 2, 0.5], [76, 2.5, 0.5], [74, 3, 1]], F = [[67, 0, 2], [71, 2, 1], [74, 3, 1]];
    const form = [null, null, null, null, A, B, C, D, A, B, E, D, F, B, C, D, A, B, E, D, E, B, C, D, F, null, null, null];
    form.forEach((mel, bar) => {
      const t0 = bar * 4 * beat, ch = CH[bar % 4], soft = bar < 4 || bar > 24;
      const note = (n, ...rest) => playNote(n + UP, ...rest);
      ch.forEach((n, i) => note(n, t0 + i * beat * 0.5, 2.4, soft ? 0.07 : 0.1, house));          // rolled left hand
      [ch[1] + 12, ch[2] + 12, ch[1] + 12].forEach((n, i) => note(n, t0 + (2 + i * 0.5) * beat, 1.4, 0.06, house));
      if (!soft && bar % 2) note(ch[0] + 12, t0 + 3.5 * beat, 0.8, 0.05, house);                  // a little push into the next bar
      for (const [n, at, len] of mel ?? []) note(n, t0 + at * beat, len * beat + 0.9, 0.15, house);
      if (trunk && bar >= 2 && bar < form.length - 1) {
        const root = 440 * Math.pow(2, (ch[0] + UP - 12 - 69) / 12);
        for (const b of [0, 2.5]) { hit('kick', t0 + b * beat); hit('sub', t0 + b * beat, root); }
        if (bar % 2) hit('kick', t0 + 3.5 * beat);
        for (const b of [1, 3]) hit('clap', t0 + b * beat, 0.4);
        for (let h = 0; h < 8; h++) hit('hat', t0 + h * 0.5 * beat, h % 2 ? 0.12 : 0.2);
        if (bar % 4 === 3) for (let h = 0; h < 6; h++) hit('hat', t0 + (3 + h / 6) * beat, 0.14);          // a roll into the turnaround
      }
    });
    playNote(55 + UP, form.length * 4 * beat, 4, 0.1, house); playNote(67 + UP, form.length * 4 * beat + 0.05, 4, 0.08, house); playNote(74 + UP, form.length * 4 * beat + 0.1, 4, 0.08, house);
    return form.length * 4 * beat + 4;
  }
  // A licensed stream: YouTube's own player, shown as a small card (it must stay visible).
  // Driven through YouTube's player API so that it starts by itself, at a gentle volume,
  // and the next record follows when it ends. If the browser refuses to start it, the
  // visitor is told to press play on the card.
  let ytReady = null;
  const ytApi = () => (ytReady ??= new Promise(ok => {
    if (window.YT?.Player) return ok();
    const prev = window.onYouTubeIframeAPIReady; window.onYouTubeIframeAPIReady = () => { prev?.(); ok(); };
    const sc = document.createElement('script'); sc.src = 'https://www.youtube.com/iframe_api'; document.head.appendChild(sc);
  }));
  function playTube(t) {
    const holder = document.createElement('div'); holder.id = 'record-card';      // ui.js hook: styled and labelled by ui.css
    holder.style.cssText = 'position:fixed;left:16px;bottom:64px;width:256px;height:144px;border-radius:3px;overflow:hidden;box-shadow:0 6px 24px rgba(0,0,0,.5);z-index:5';
    const slot = document.createElement('div'); holder.appendChild(slot); document.body.appendChild(holder); tube = holder;
    let playing = false;
    ytApi().then(() => {
      if (tube !== holder) return;
      const player = new window.YT.Player(slot, {
        width: 256, height: 144, videoId: t.youtube, host: 'https://www.youtube-nocookie.com',
        playerVars: { autoplay: 1, rel: 0, playsinline: 1, modestbranding: 1 },
        events: {
          onReady: e => { e.target.setVolume(muted ? 0 : 28 * vol); e.target.playVideo(); },
          onStateChange: e => { if (e.data === 1) playing = true; if (e.data === 0 && tube === holder) { timer = setTimeout(nextTrack, 4000); } },
          onError: () => { if (tube === holder) { onNote('that record will not play here; putting on the next'); nextTrack(); } },
        },
      });
      holder.player = player;
      setTimeout(() => { if (tube === holder && !playing) { document.exitPointerLock?.(); onNote('press play on the little player to start the music'); } }, 6000);
    });
  }
  let onNote = () => {};
  let order = [];
  const shuffled = list => shuffle([...list]);
  function nextTrack() {
    tube?.remove(); tube = null;
    if (trackNo >= order.length) { const last = order.at(-1); do order = shuffled(tracks); while (tracks.length > 1 && order[0] === last); trackNo = 0; }
    const t = order[trackNo++];
    if (t.synth) { music = null; nowTitle = `${t.title} · ${t.composer}`; timer = setTimeout(nextTrack, (comeOnIn(t.synth === 'trunk') + 6) * 1000); return; }
    if (t.youtube) { music = null; nowTitle = `${t.title} · ${t.composer}`; playTube(t); return; }
    nowTitle = '';
    music = new Audio(`assets/audio/${t.file}`); music.volume = 0; music.title = `${t.title}${t.composer ? ' · ' + t.composer : ''}`;
    music.addEventListener('ended', () => { timer = setTimeout(nextTrack, 6000); });
    music.play().catch(() => {});
  }

  // where: 'in' | 'half' | 'out'; light: 0 night .. 1 day; near: distances in feet to things that make noise
  function update(dt, { where, light, near }) {
    if (!started) return;
    const ease = (el, v) => { if (el) el.volume += ((muted ? 0 : Math.max(0, Math.min(1, v * vol))) - el.volume) * Math.min(1, dt * 2); };
    const inside = (where === 'in' ? 1 : where === 'half' ? 0.55 : 0.22) * (ducked ? 0 : 1);
    if (tube?.player?.setVolume) tube.player.setVolume(muted || ducked ? 0 : 28 * vol);
    ease(music, 0.11 * inside);
    houseAim = muted ? 0 : 0.3 * inside; if (house) house.gain.value += (houseAim - house.gain.value) * Math.min(1, dt * 2);
    ease(loops.birds, (where === 'in' ? 0.04 : where === 'half' ? 0.14 : 0.22) * light);
    ease(loops.night, (where === 'in' ? 0.04 : 0.3) * (1 - light));
    ease(loops.wind, where === 'in' ? 0 : 0.018);      // a breath of air, never a gale
    ease(loops.fire, 0.28 / (1 + Math.pow((near.fire ?? 99) / 9, 2)));
    ease(loops.clock, 0.16 / (1 + Math.pow((near.clock ?? 99) / 8, 2)));
  }

  // A soft struck-string voice
  const playNote = (...a) => note(...a);
  function note(midi, when = 0, len = 1.6, vol = 0.22, out = null) {
    if (!ctx || muted) return;
    const t = ctx.currentTime + when, f = 440 * Math.pow(2, (midi - 69) / 12), g = ctx.createGain();
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0008, t + len); g.connect(out ?? master);
    for (const [mult, amp, type] of [[1, 1, 'triangle'], [2, 0.32, 'sine'], [3, 0.12, 'sine'], [4.02, 0.05, 'sine']]) {
      const o = ctx.createOscillator(), a = ctx.createGain(); o.type = type; o.frequency.value = f * mult; a.gain.value = amp; o.connect(a); a.connect(g); o.start(t); o.stop(t + len + 0.05);
    }
  }
  // Phrases to play when someone touches the keys: the opening of Satie's first Gymnopedie
  const PHRASES = [
    [[55, 0, 2.6], [62, 0.9, 2], [66, 0.9, 2], [71, 0.9, 2], [50, 1.9, 2.6], [57, 2.8, 2], [61, 2.8, 2], [66, 2.8, 2]],
    [[78, 0, 1.2], [81, 0.95, 1.2], [79, 1.9, 1.2], [78, 2.85, 1.2], [73, 3.8, 1.2], [71, 4.75, 1.2], [73, 5.7, 1.2], [74, 6.65, 1.2], [69, 7.6, 3]],
    [[55, 0, 2.6], [62, 0.9, 2], [66, 0.9, 2], [71, 0.9, 2], [66, 1.9, 1.2], [69, 2.85, 1.2], [71, 3.8, 1.2], [73, 4.75, 1.2], [74, 5.7, 2.6]],
  ];
  let phrase = 0;
  function playPhrase() { for (const [m, w, l] of PHRASES[phrase++ % PHRASES.length]) note(m, w, l); }
  const SCALE = [62, 64, 66, 67, 69, 71, 73, 74, 76, 78];
  const key = n => note(SCALE[n % SCALE.length], 0, 1.8);

  // Running water, for the taps (taps.js): a quiet loop of filtered noise, made when a tap is turned on and
  // stopped when the last one is turned off. v: 0 (off) to 1 (standing at the basin).
  let wet = null;
  function water(v) {
    if (!ctx || (!wet && v <= 0)) return;
    if (!wet) {
      const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      const src = ctx.createBufferSource(), hp = ctx.createBiquadFilter(), lp = ctx.createBiquadFilter(), g = ctx.createGain();
      src.buffer = buf; src.loop = true; hp.type = 'highpass'; hp.frequency.value = 1100; lp.type = 'lowpass'; lp.frequency.value = 5200; g.gain.value = 0;
      src.connect(hp); hp.connect(lp); lp.connect(g); g.connect(master); src.start(); wet = { src, g, v: -1 };
    }
    const aim = muted || ducked ? 0 : v * 0.04;
    if (Math.abs(aim - wet.v) > 0.001 || v <= 0) { wet.v = aim; wet.g.gain.setTargetAtTime(aim, ctx.currentTime, 0.12); }
    if (v <= 0) { const w = wet; wet = null; setTimeout(() => { w.src.stop(); w.g.disconnect(); }, 900); }
  }
  return { water, start, update, playPhrase, key, note, next, setDuck: v => { ducked = v; }, toggleMute: () => { muted = !muted; tube?.player?.setVolume?.(muted ? 0 : 28 * vol); return muted; },
    isMuted: () => muted, volume: () => vol, setVolume: v => { vol = Math.max(0, Math.min(1, v)); if (master) master.gain.value = vol; },      // ui.js hook: the settings card
    set onNote(f) { onNote = f; }, nowPlaying: () => nowTitle || (music && !music.paused ? music.title : '') };
}
