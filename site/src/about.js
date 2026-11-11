// "About this house": what the house is modelled on, and where everything in
// it comes from. Opened with the I key, the link on the invitation and in the
// help card, or by reading a label in the house (the framed drawings in the hall).
// Set like the end matter of a book: paper, Goudy, hanging-indent citations.

const PLAN_SHEETS = [
  ['First floor plan', 'Sheet no. 2, 16 July 1906', 'NYDA.1960.001.00286'],
  ['Second floor plan', 'Sheet no. 3, 16 July 1906', 'NYDA.1960.001.00287'],
  ['West and front (east) elevations', 'Sheet no. 4, 16 July 1906', 'NYDA.1960.001.00288'],
  ['South and north elevations', 'Sheet no. 5, 16 July 1906', 'NYDA.1960.001.00289'],
  ['Half-inch scale details', 'Sheet no. 6, 16 July 1906', 'NYDA.1960.001.00290'],
];

// The garden's animals, carried over from the owner's village project (assets/models/CATALOG_garden.md)
const ANIMALS = [
  ['Mallard', 'Poly by Google', 'https://poly.pizza/m/frSLi6b6Vid', 'CC BY 3.0'],
  ['Jackrabbit (the hare in the lettuces)', 'Poly by Google', 'https://poly.pizza/m/biNOm96olTH', 'CC BY 3.0'],
  ['Squirrel', 'Poly by Google', 'https://poly.pizza/m/caxos24uWC9', 'CC BY 3.0'],
  ['Dragonfly', 'Poly by Google', 'https://poly.pizza/m/0myA_BOcZrD', 'CC BY 3.0'],
  ['Blue jay', 'jeremy', 'https://poly.pizza/m/dWfeVtr7M49', 'CC BY 3.0'],
  ['Frog', 'AssetQuest', 'https://poly.pizza/m/yK6MyLkuob', 'CC0 1.0'],
];
const CC_BY = 'https://creativecommons.org/licenses/by/3.0/';

const css = `
#about .paper { width: min(700px, 100%); padding: 34px 44px 30px; font-size: 16.5px; line-height: 1.6; }
#about .lede { margin: 0 0 8px; font-size: 17.5px; line-height: 1.6; max-width: 36em; }
#about .lede::first-letter { float: left; font-size: 3.5em; line-height: .82; padding: 6px 8px 0 0; color: var(--teak); }
#about nav { display: flex; flex-wrap: wrap; gap: 4px 18px; margin: 18px 0 4px; padding: 10px 0; border-top: 1px solid rgba(122, 75, 42, .22); border-bottom: 1px solid rgba(122, 75, 42, .22); font-size: 15px; }
#about nav a { color: var(--teak); text-decoration: none; }
#about nav a:hover { text-decoration: underline; text-underline-offset: 3px; }
#about section { margin-top: 26px; scroll-margin-top: 12px; }
#about h3 { margin: 0 0 8px; font-size: 21px; }
#about p { margin: 0 0 10px; max-width: 38em; }
#about ul { list-style: none; margin: 0; padding: 0; }
#about .cite li { margin: 0 0 8px; padding-left: 1.4em; text-indent: -1.4em; font-size: 15.5px; line-height: 1.5; }
#about .cite li::before { content: ''; display: inline-block; width: 4px; height: 4px; margin: 0 calc(1.4em - 4px) .2em 0; background: var(--ink); vertical-align: middle; text-indent: 0; }
#about small, #about .src { font-size: 13.5px; color: var(--ink-soft); }
#about a { color: var(--verdigris); text-decoration-thickness: 1px; text-underline-offset: 3px; text-decoration-color: rgba(61, 97, 81, .45); }
#about a:hover { text-decoration-color: currentColor; }
#about .sub { font-style: italic; color: var(--teak); font-size: 16px; margin: 14px 0 6px; }
#about .colophon { margin-top: 28px; padding-top: 14px; border-top: 1px solid rgba(122, 75, 42, .22); font-size: 14px; font-style: italic; color: var(--ink-soft); }
@media (max-width: 560px) {
  #about .paper { padding: 26px 22px calc(26px + env(safe-area-inset-bottom)); font-size: 16px; }
  #about .lede { font-size: 16.5px; }
}
`;

export let aboutPanel = null;

export function makeAbout() {
  const style = document.createElement('style'); style.textContent = css; document.head.appendChild(style);
  const wrap = document.createElement('div'); wrap.id = 'about'; wrap.className = 'sheet';
  wrap.setAttribute('role', 'dialog'); wrap.setAttribute('aria-modal', 'true'); wrap.setAttribute('aria-labelledby', 'about-title');
  wrap.innerHTML = `<article class="paper" tabindex="-1">
    <button class="close" type="button" aria-label="Close">×</button>
    <h2 id="about-title">About this house</h2>
    <svg class="rule" aria-hidden="true"><use href="#cloudlift"/></svg>
    <p class="lede">This is an imagined home built on a real one: the house Charles and Henry Greene designed in Pasadena, California, in 1906 for Louise and John Bentz, with the sleeping porch they added in 1910. The walls, windows, stair and roof here were laid out from the architects' own drawings. The furnishing, the garden and everyone who lives here are invented. The real house is a private home; please admire it from here.</p>
    <nav aria-label="Sources"><a href="#about-house">The house</a><a href="#about-plans">The drawings</a><a href="#about-art">Pictures</a><a href="#about-music">Music</a><a href="#about-things">Furniture and garden</a></nav>

    <section id="about-house"><h3>The house</h3>
    <ul class="cite">
      <li>Greene &amp; Greene, architects. <i>Residence for Mrs. Louise Bentz at Pasadena, Cal.</i> (job no. 262), 1906; addition, 1910.</li>
      <li>National Park Service. <i>Louise C. Bentz House</i>, National Register of Historic Places Inventory–Nomination Form, 1977 (reference no. 77000299), with photographs by William Cross. Room sizes, materials and finishes follow its description.</li>
      <li>Photographs of the exterior on Wikimedia Commons were used as reference for the shingles, pergola and porch.</li>
    </ul></section>

    <section id="about-plans"><h3>The drawings framed in the hall</h3>
    <p class="cite-p">Greene &amp; Greene. Drawings for the residence of Mrs. Louise Bentz, Pasadena, 1906. Greene &amp; Greene Architectural Records and Papers Collection, Avery Architectural &amp; Fine Arts Library, Columbia University, made public through the <a href="https://www.columbia.edu/cu/libraries/inside/projects/greene_and_greene/" target="_blank" rel="noopener">Greene &amp; Greene Virtual Archives</a>. The sheets shown:</p>
    <ul class="cite">${PLAN_SHEETS.map(([t, s, id]) => `<li>${t}. ${s}. <small>${id}</small></li>`).join('')}</ul></section>

    <section id="about-art"><h3>Pictures on the walls</h3>
    <p>All are works in the public domain, reproduced from museum open-access images.</p>
    <ul class="cite" id="about-art-list"><li>Gathering the list…</li></ul></section>

    <section id="about-music"><h3>Music and sound</h3>
    <p class="sub">On the gramophone</p>
    <ul class="cite" id="about-music-list"><li>Gathering the list…</li></ul>
    <p class="sub">The sounds of the house</p>
    <ul class="cite" id="about-sound-list"><li>Gathering the list…</li></ul>
    <p class="sub">Through YouTube</p>
    <ul class="cite">
      <li>Flo Rida's <i>My House</i> (2015), in a piano cover by Pianistmiri, is the first record on when you come in. It plays through YouTube's embedded player, shown as a small card while it plays.</li>
      <li>The television in the upstairs bedroom plays videos from the owner's own list, also through YouTube's embedded player.</li>
      <li>The welcome tune, "Come On In", and the piano you can play were written for this house.</li>
    </ul></section>

    <section id="about-things"><h3>Furniture, garden and sky</h3>
    <ul class="cite">
      <li>Collected furniture, plants and objects: public-domain (CC0) 3D models, mostly from <a href="https://polyhaven.com" target="_blank" rel="noopener">Poly Haven</a>; surface textures from Poly Haven and <a href="https://ambientcg.com" target="_blank" rel="noopener">ambientCG</a> (CC0). Full lists are in the project's credits files.</li>
      <li>Every spine on the bookshelves is a real book. The list begins with the owner's own shelf.</li>
      <li>The sky, clouds and stars are adapted from the owner's village project. Built with <a href="https://threejs.org" target="_blank" rel="noopener">three.js</a>.</li>
      <li>Everything else, including the rugs, the built furniture, the trees and the staff, was made for this house.</li>
    </ul>
    <p class="sub">Animals in the garden</p>
    <p>Carried over from the owner's village project, from <a href="https://poly.pizza" target="_blank" rel="noopener">Poly Pizza</a>.</p>
    <ul class="cite">${ANIMALS.map(([what, who, url, lic]) => `<li>${what}, by ${who}. <span class="src"><a href="${url}" target="_blank" rel="noopener">source</a>; ${lic === 'CC BY 3.0' ? `<a href="${CC_BY}" target="_blank" rel="noopener">Creative Commons Attribution 3.0</a>` : 'CC0 1.0, public domain'}</span></li>`).join('')}</ul>
    </section>

    <p class="colophon">Set in Sorts Mill Goudy, Barry Schwartz's revival of Frederic Goudy's Oldstyle of 1915, under the SIL Open Font License.</p>
  </article>`;
  document.body.appendChild(wrap);
  const article = wrap.querySelector('article');

  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const src = a => `<span class="src">${a.source_url ? `<a href="${esc(a.source_url)}" target="_blank" rel="noopener">source</a>; ` : ''}${esc(a.licence)}</span>`;
  fetch('assets/art/manifest.json').then(r => r.json()).then(list => {
    list.sort((a, b) => a.artist.localeCompare(b.artist));
    wrap.querySelector('#about-art-list').innerHTML = list.map(a => `<li>${esc(a.artist)}, <i>${esc(a.title)}</i>${a.year ? ', ' + esc(a.year) : ''}. ${src(a)}</li>`).join('');
  }).catch(() => { wrap.querySelector('#about-art-list').innerHTML = '<li>The list could not be read just now.</li>'; });
  fetch('assets/audio/manifest.json').then(r => r.json()).then(list => {
    const line = a => `<li>${a.composer ? esc(a.composer) + ', ' : ''}<i>${esc(a.title)}</i>${a.performer ? ', played by ' + esc(a.performer) : ''}. ${src(a)}</li>`;
    wrap.querySelector('#about-music-list').innerHTML = list.filter(a => a.kind === 'music').map(line).join('');
    wrap.querySelector('#about-sound-list').innerHTML = list.filter(a => a.kind !== 'music').map(line).join('') || '<li>None yet.</li>';
  }).catch(() => { for (const id of ['#about-music-list', '#about-sound-list']) wrap.querySelector(id).innerHTML = '<li>The list could not be read just now.</li>'; });

  let onToggle = () => {}, back = null;
  const api = {
    get open() { return wrap.classList.contains('on'); },
    show(section) {
      if (!api.open) back = document.activeElement;
      for (const s of document.querySelectorAll('.sheet.on')) if (s !== wrap) s.classList.remove('on');
      wrap.classList.add('on'); document.exitPointerLock?.();
      const target = section && wrap.querySelector('#about-' + section);
      article.scrollTop = 0; if (target) target.scrollIntoView({ block: 'start' });
      wrap.querySelector('.close').focus({ preventScroll: true });
      onToggle(true);
    },
    hide() {
      if (!api.open) return;
      wrap.classList.remove('on'); onToggle(false);
      if (back?.isConnected && back !== document.body && back.offsetParent) back.focus({ preventScroll: true }); else document.activeElement?.blur?.();
    },
    toggle() { api.open ? api.hide() : api.show(); },
    set onToggle(f) { onToggle = f; },
  };
  wrap.addEventListener('click', e => {
    if (e.target === wrap || e.target.closest('.close')) return api.hide();
    const a = e.target.closest('nav a');                               // contents links scroll within the page
    if (a) { e.preventDefault(); wrap.querySelector(a.getAttribute('href'))?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }); }
  });
  wrap.addEventListener('keydown', e => {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); api.hide(); return; }
    if (e.code !== 'KeyI') e.stopPropagation();                         // the house does not walk while you read (I still closes)
    if (e.key !== 'Tab') return;                                         // keep Tab inside the panel
    const f = [...wrap.querySelectorAll('button, a[href]')].filter(x => x.offsetParent);
    if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f.at(-1).focus(); }
    else if (!e.shiftKey && document.activeElement === f.at(-1)) { e.preventDefault(); f[0].focus(); }
  });
  // The link on the invitation (index.html); made here if the page has none
  let btn = document.getElementById('aboutBtn');
  if (!btn) { btn = document.createElement('button'); btn.id = 'aboutBtn'; btn.className = 'link'; btn.textContent = 'About this house & sources'; document.getElementById('welcome')?.appendChild(btn); }
  btn.addEventListener('click', () => api.show());
  aboutPanel = api;
  return api;
}
