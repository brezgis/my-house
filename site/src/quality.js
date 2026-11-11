// Quality tiers. The house is drawn at one of three levels, chosen before the renderer
// is made (antialiasing cannot be changed afterwards):
//
//   high     big discrete GPUs and the larger Apple chips: everything as designed
//   medium   integrated GPUs (a MacBook Air, Iris Xe): a little less resolution, 2048
//            shadows with the cheaper filter, half-size normal and roughness maps, clutter a few
//            feet nearer
//   low      older or phone GPUs, software rendering: no antialiasing, 1x resolution,
//            half-size textures throughout, three lamps instead of four
//
// ?quality=low|medium|high (or the settings card, window.house.quality) forces a tier. Otherwise the GPU's name decides, and if a
// visit had to drop to the lowest resolution to keep up, the next visit starts a tier
// lower (remembered in localStorage; ?quality=auto clears it).

export const TIERS = {
  high: { name: 'high', ratio: 1.5, antialias: true, shadow: 4096, softShadow: true, tex: 'full', reach: 1, lamps: 4, reachFull: 55, reachBig: 110 },
  medium: { name: 'medium', ratio: 1.25, antialias: true, shadow: 2048, softShadow: false, tex: 'detail', reach: 0.85, lamps: 4, reachFull: 45, reachBig: 90 },
  low: { name: 'low', ratio: 1, antialias: false, shadow: 2048, softShadow: false, tex: 'half', reach: 0.7, lamps: 3, reachFull: 35, reachBig: 70 },
};
const ORDER = ['low', 'medium', 'high'];

export function gpuName() {
  try {
    const c = document.createElement('canvas'), gl = c.getContext('webgl2') || c.getContext('webgl');
    if (!gl) return '';
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const name = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return String(name || '');
  } catch { return ''; }
}

export function guessTier(name) {
  const n = name.toLowerCase();
  if (/swiftshader|llvmpipe|software|mali|adreno|powervr|intel.*(hd|uhd) graphics|gma/.test(n)) return 'low';
  if (/apple m\d+ (pro|max|ultra)|nvidia|geforce|quadro|rtx|gtx|radeon (rx|pro)/.test(n)) return 'high';
  return 'medium';                                              // Apple M1/M2/M3, "Apple GPU" (Safari), Iris Xe, unknown
}

// The visitor's own choice from the settings card (ui.js), kept in localStorage
export const QUALITY_OPTIONS = [{ value: 'auto', label: 'Automatic' }, { value: 'high', label: 'High' }, { value: 'medium', label: 'Medium' }, { value: 'low', label: 'Low (fastest)' }];
export function storedChoice() { try { return localStorage.getItem('qualityChoice'); } catch { return null; } }
export function chooseTier(v) { try { if (v === 'auto' || !TIERS[v]) { localStorage.removeItem('qualityChoice'); localStorage.removeItem('quality'); } else localStorage.setItem('qualityChoice', v); } catch { /* private window */ } }

export function chooseQuality(Q) {
  const forced = Q.get('quality') ?? storedChoice();
  let stored = null;
  try { if (forced === 'auto') localStorage.removeItem('quality'); stored = localStorage.getItem('quality'); } catch { /* private window */ }
  const gpu = gpuName();
  let tier = TIERS[forced] ? forced : guessTier(gpu);
  if (!TIERS[forced] && stored && ORDER.indexOf(stored) < ORDER.indexOf(tier)) tier = stored;
  if (typeof navigator !== 'undefined' && !TIERS[forced] && (navigator.deviceMemory ?? 8) <= 2) tier = 'low';
  return { ...TIERS[tier], gpu, forced: !!TIERS[forced] };
}

// Called by the frame-rate watcher when even the lowest resolution is too slow: the next
// visit starts a tier lower.
export function rememberSlow(tier) {
  const i = ORDER.indexOf(tier);
  if (i > 0) try { localStorage.setItem('quality', ORDER[i - 1]); } catch { /* private window */ }
}
