# Real-time walk-and-turn trace. Opens the house in headless Chrome (GPU, real time, as tools/stats.py),
# walks a path given as keyframes and logs, for every frame drawn: frame time, where the eye is, the
# zones the visibility code shows, outdoors.visible, exposure, the lamp pool's lights, draw calls,
# triangles, programs, and the picture's mean brightness (whole frame and a 4x3 grid, read back from the
# canvas). Then prints the frame-to-frame discontinuities.
#   tools/trace.sh <out.json> <path-name|keyframes-json> ["<query>"]
# keyframes: [[seconds, x, z, yaw, pitch], ...] (feet height follows the floor). Environment:
#   START=1 traces from the first frame instead of waiting for the house to settle (start-up hitches);
#   SNAPAT=12,13 saves those frames as JPEGs (frames that turn largely pure black are saved anyway, up to SNAPMAX);
#   CPU=4 throttles the main thread 4x (CDP), W/H the window, SHOTS=dir saves a screenshot at each flagged frame.
import sys, json, time, os, math
from playwright.sync_api import sync_playwright
PI = math.pi
PATHS = {
  # the top of the stairs: turn round on the landing, go down half the flight, turn, come back up, into the hall
  'stair': [[0, 4, -18.5, PI, -0.15], [6, 4, -18.5, 3 * PI, -0.15], [7, 4, -17.6, 3 * PI, -0.3], [10, 4, -11.5, 3 * PI, -0.3], [15, 4, -11.5, 5 * PI, -0.1],
            [18, 4, -17.6, 5 * PI, 0], [19, 4, -19.3, 5.5 * PI, -0.05], [22, -0.5, -19.3, 5.5 * PI, -0.05], [26, -0.5, -19.3, 7.5 * PI, -0.05], [28, 4, -18.5, 7 * PI, -0.6], [31, 4, -18.5, 9 * PI, -0.6]],
  # in at the front door, through the hall into the living room and back, out to the porch
  'ground': [[0, 0.13, -3.2, 0, -0.05], [3, 0.13, -9, 0, -0.05], [5, 0.13, -9, PI / 2, -0.05], [8, -8, -9, PI / 2, -0.05], [12, -8, -9, 2.5 * PI, -0.05], [15, 0.13, -9, 2.5 * PI, -0.05], [17, 0.13, -9, 3 * PI, 0], [20, 0.13, -1.5, 3 * PI, 0]],
  # along the garden path from the street to the porch, then round the lawn
  'garden': [[0, 2, 75, 0, 0.02], [8, 2, 20, 0, 0.02], [12, 2, 20, 2 * PI, 0.02], [18, -40, 20, 2.5 * PI, 0], [24, -40, 20, 4.5 * PI, 0]],
}
out, path = sys.argv[1], sys.argv[2]
if path == 'analyse': rep = json.load(open(out))
else:
    keys = PATHS.get(path) or json.loads(path)
    q = sys.argv[3] if len(sys.argv) > 3 else ''
    url = os.environ.get('HOUSE_URL', 'http://127.0.0.1:8791') + '/?' + q
    args = ['--no-sandbox', '--use-gl=angle', '--use-angle=' + os.environ.get('ANGLE', 'gl-egl'), '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']
    HOOK = r"""
    (keys) => new Promise(done => {
      const H = window.__house, C = window.house.ctx, r = H.renderer, gl = r.getContext(), scene = H.scene, W = C.walker;
      const outdoors = scene.getObjectByName('outdoors'), lights = []; scene.traverse(o => { if (o.isPointLight) lights.push(o); });
      let sun = null; scene.traverse(o => { if (o.isDirectionalLight && o.castShadow) sun = o; });
      const log = [], GX = 4, GY = 3, snaps = [], maxSnaps = SNAPMAX; let px = null, prevBlack = 0;
  const snapAt = new Set(SNAPAT); const snapWhen = (f, black, lum) => { const hit = snapAt.has(f) || (black > 0.12 && black > prevBlack + 0.1); prevBlack = black; return hit; }; let shadowSets = 0, ratioSets = [], last = performance.now();
      const sp = r.setPixelRatio.bind(r); r.setPixelRatio = v => { ratioSets.push([log.length, v]); sp(v); };
      const orig = r.render.bind(r); let t0 = null, frame = 0, tStart = 0;
      const wu = W.update.bind(W); W.update = dt => { tStart = performance.now(); wu(dt); };
      const at = t => { let i = 0; while (i < keys.length - 2 && keys[i + 1][0] <= t) i++; const a = keys[i], b = keys[i + 1], k = Math.min(1, Math.max(0, (t - a[0]) / (b[0] - a[0]))); return a.map((v, j) => v + (b[j] - v) * k); };
      r.render = (s, c) => {
        const target = r.getRenderTarget();
        if (target || s !== scene) return orig(s, c);
        const now = performance.now(); if (t0 === null) t0 = now; const t = (now - t0) / 1000;
        const shadowDue = sun?.shadow.needsUpdate;
        const c0 = performance.now(); orig(s, c); const cpu = performance.now() - c0, own = c0 - tStart;
        // brightness: the whole frame read back once, averaged in a 4x3 grid (every 6th pixel)
    const w = gl.drawingBufferWidth, h = gl.drawingBufferHeight, lum = [];
    if (!px || px.length !== w * h * 4) px = new Uint8Array(w * h * 4);
    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
    let black = 0;
    for (let j = 0; j < GY; j++) for (let i = 0; i < GX; i++) {
      let sum = 0, cnt = 0, zero = 0; const x0 = Math.floor(i * w / GX), x1 = Math.floor((i + 1) * w / GX), y0 = Math.floor(j * h / GY), y1 = Math.floor((j + 1) * h / GY);
      for (let y = y0; y < y1; y += 6) for (let x = x0; x < x1; x += 6) { const k = (y * w + x) * 4, l = 0.3 * px[k] + 0.59 * px[k + 1] + 0.11 * px[k + 2]; sum += l; cnt++; if (px[k] + px[k + 1] + px[k + 2] === 0) zero++; }
      lum.push(+(sum / cnt).toFixed(1)); black += zero / cnt / 12;
    }
    if (snapWhen(frame, black, lum) && snaps.length < maxSnaps) snaps.push([frame, r.domElement.toDataURL('image/jpeg', 0.8)]);
    const v = H.vis.state;
        log.push({ t: +t.toFixed(3), ms: +(now - last).toFixed(1), cpu: +cpu.toFixed(1), own: +own.toFixed(2), p: [W.pos.x, W.pos.y, W.pos.z, W.yaw, W.pitch].map(x => +x.toFixed(2)), here: v.here.join('+'), seen: [...v.seen].map(([k, s]) => k.slice(2) + '/' + s.level).sort().join(','), out: outdoors.visible, exp: +r.toneMappingExposure.toFixed(3),
          L: lights.map(l => +l.intensity.toFixed(2)), LP: lights.map(l => Math.round(l.position.x) + ',' + Math.round(l.position.y) + ',' + Math.round(l.position.z)), black: +black.toFixed(3), calls: r.info.render.calls, tris: r.info.render.triangles, prog: r.info.programs.length, tex: r.info.memory.textures, shadow: !!shadowDue, lum, w });
        last = now; frame++;
        const end = keys[keys.length - 1][0];
        if (t >= end) { r.render = orig; done({ log, ratioSets, snaps }); return; }
        const k = at(t + 0.016);
        const f = W.floorAt(k[1], k[2], W.pos.y + 0.5); W.place(k[1], f, k[2], k[3], k[4]);
      };
    })
    """
    with sync_playwright() as p:
        b = p.chromium.launch(channel='chrome', headless=True, args=args)
        pg = b.new_page(viewport={'width': int(os.environ.get('W', 1280)), 'height': int(os.environ.get('H', 760))})
        errs = []
        pg.on('pageerror', lambda e: errs.append('PAGEERROR ' + str(e)))
        throttle = lambda: os.environ.get('CPU') and pg.context.new_cdp_session(pg).send('Emulation.setCPUThrottlingRate', {'rate': float(os.environ['CPU'])})
        if os.environ.get('START'): throttle()
        pg.goto(url)
        if os.environ.get('START'):      # trace from the first frame: the start-up hitches (models arriving, shadow redraws)
            pg.wait_for_function('window.__house && window.house && window.house.ctx.walker', timeout=120000)
        else:
            pg.wait_for_function('window.__ready === true', timeout=120000)
            for i in range(240):
                if pg.evaluate('window.__house.pending()') == 0: break
                time.sleep(0.5)
        k0 = keys[0]
        pg.evaluate("k => { const H = window.__house; H.setView({ walk: [k[1], %s, k[2], k[3], k[4]] }); const W = window.house.ctx.walker; W.place(k[1], W.floorAt(k[1], k[2], %s), k[2], k[3], k[4]); }" % (os.environ.get('Y0', '10.8'), os.environ.get('Y0', '10.8')), k0)
        if not os.environ.get('START'): time.sleep(float(os.environ.get('SETTLE', 6))); throttle()
        rep = pg.evaluate(HOOK.replace('SNAPMAX', os.environ.get('SNAPMAX', '8')).replace('SNAPAT', '[' + os.environ.get('SNAPAT', '') + ']'), keys)
    import base64
    for f, url in rep.pop('snaps', []):
        open(out.replace('.json', '') + '_f%d.jpg' % f, 'wb').write(base64.b64decode(url.split(',', 1)[1])); print('snapshot of frame', f)
        b.close()

    for e in errs[:5]: print(e[:300])
    json.dump(rep, open(out, 'w'))
L = rep['log']; n = len(L)
ms = sorted(f['ms'] for f in L[2:]); cpu = sorted(f['cpu'] for f in L[2:])
pc = lambda a, q: a[min(len(a) - 1, int(len(a) * q))]
print(f"{n} frames; frame ms median {pc(ms, .5)} p95 {pc(ms, .95)} p99 {pc(ms, .99)} max {ms[-1]}; render() CPU ms median {pc(cpu, .5)} p95 {pc(cpu, .95)} max {cpu[-1]}; ratio changes {rep['ratioSets']}")
own = sorted(f['own'] for f in L[2:]); print(f"own code before render() ms: median {pc(own, .5)} p95 {pc(own, .95)} max {own[-1]}")
print('calls', min(f['calls'] for f in L), '..', max(f['calls'] for f in L), 'ktris', min(f['tris'] for f in L) // 1000, '..', max(f['tris'] for f in L) // 1000, 'programs', L[0]['prog'], '->', L[-1]['prog'], 'textures', L[0]['tex'], '->', L[-1]['tex'])
ev = []
for i in range(1, n):
    a, c = L[i - 1], L[i]; why = []
    ma, mc = sum(a['lum']) / 12, sum(c['lum']) / 12
    # a flash: most of the picture's blocks leave their own surrounding level, the same way, for a frame or two
    dev = []
    for j in range(12):
        med = sorted(L[min(n - 1, max(0, q))]['lum'][j] for q in range(i - 3, i + 4))[3]
        d = c['lum'][j] - med; dev.append(0 if abs(d) < max(5, 0.15 * med) else (1 if d > 0 else -1))
    if abs(sum(dev)) >= 8: why.append(f"FLASH {'brighter' if sum(dev) > 0 else 'darker'} in {abs(sum(dev))}/12 blocks ({ma:.0f}->{mc:.0f})")
    elif abs(mc - ma) > max(10, 0.3 * ma): why.append(f"brightness step {ma:.0f}->{mc:.0f}")
    if a['out'] != c['out']: why.append(f"outdoors {a['out']}->{c['out']}")
    if a['seen'] != c['seen']: why.append('zones ' + ' '.join(sorted(set(c['seen'].split(',')) ^ set(a['seen'].split(',')))))
    if abs(c['exp'] - a['exp']) > 0.03: why.append(f"exposure {a['exp']}->{c['exp']}")
    if c['LP'] != a['LP']: why.append('lamp moved')
    if max(abs(x - y) for x, y in zip(a['L'], c['L'])) > 3: why.append(f"lamp level jump {a['L']}->{c['L']}")
    if c.get('black', 0) > 0.12 and c['black'] > a.get('black', 0) + 0.1: why.append(f"BLACK {c['black']:.0%} of the picture is pure black (was {a.get('black', 0):.0%})")
    if c['shadow']: why.append('shadow map redrawn')
    if c['ms'] > 50: why.append(f"hitch {c['ms']} ms")
    if c['prog'] != a['prog']: why.append(f"programs {a['prog']}->{c['prog']}")
    if why: ev.append((i, c['t'], why))
flash = [e for e in ev if any('FLASH' in w for w in e[2])]
import collections
kinds = collections.Counter(w.split(' ')[0] for e in ev for w in e[2])
print(len(ev), 'events;', len(flash), 'full-picture flashes;', dict(kinds))
if os.environ.get('QUIET'): ev = [e for e in ev if any(w.split(' ')[0] in ('FLASH', 'BLACK', 'brightness', 'outdoors', 'hitch', 'shadow', 'lamp', 'exposure') for w in e[2])]
for i, t, why in ev[:int(os.environ.get('MAXEV', 80))]: print(f"  f{i} t={t:6.2f} p={L[i]['p']} : " + '; '.join(why))
