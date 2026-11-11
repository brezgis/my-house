# Z-fighting search. Opens the house in headless Chrome (real time, like tools/stats.py), serving a
# copy of src/builder.js that remembers which code emitted every piece (nothing in the site changes),
# then runs tools/zfight_page.js in the page: pairs of near-coplanar overlapping faces of different
# pieces. Writes the raw report as JSON and prints a summary grouped by the code that made them.
#   tools/zfight.sh <out.json> ["<query>"]      (holds the render lock; see tools/stats.sh)
import sys, json, time, os, re, collections
from playwright.sync_api import sync_playwright
here = os.path.dirname(os.path.abspath(__file__))
out = sys.argv[1]; q = sys.argv[2] if len(sys.argv) > 2 else ''
base = os.environ.get('HOUSE_URL', 'http://127.0.0.1:8791')
url = base + '/?at=aerial&time=13&staff=0&friends=0&cull=0&' + q
src = open(os.path.join(here, '..', 'site', 'src', 'builder.js')).read()
tag = """{ const st = new Error().stack.split('\\n').slice(2).map(l => (/src\\/([\\w\\/.]+\\.js):(\\d+)/.exec(l) || [])).filter(m => m[1] && m[1] !== 'builder.js').map(m => m[1] + ':' + m[2]); g.userData.src = st.slice(0, 5).join(' < '); }
    this.batches.get(key).list.push(g);"""
assert 'this.batches.get(key).list.push(g);' in src
src = src.replace('this.batches.get(key).list.push(g);', tag)
mk = 'const mesh = new THREE.Mesh(mergeGeometries(list, false), m);'
assert mk in src
src = src.replace(mk, mk + ' mesh.userData.pieces = list.map(g => [g.userData.src, g.attributes.position.count]);')
src = 'Error.stackTraceLimit = 30;\n' + src
args = ['--no-sandbox', '--use-gl=angle', '--use-angle=' + os.environ.get('ANGLE', 'gl-egl'), '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']
with sync_playwright() as p:
    b = p.chromium.launch(channel='chrome', headless=True, args=args)
    pg = b.new_page(viewport={'width': 800, 'height': 500})
    pg.route('**/src/builder.js', lambda r: r.fulfill(body=src, content_type='text/javascript'))
    errs = []
    pg.on('pageerror', lambda e: errs.append('PAGEERROR ' + str(e)))
    pg.goto(url)
    pg.wait_for_function('window.__ready === true', timeout=120000)
    for i in range(120):
        if pg.evaluate('window.__house.pending()') == 0: break
        time.sleep(0.5)
    time.sleep(float(os.environ.get('SETTLE', 6)))
    pg.evaluate("window.__house.ctx = window.house.ctx")
    fn = open(os.path.join(here, 'zfight_page.js')).read()
    fn = fn[fn.index('(opts) =>'):]
    rep = pg.evaluate(fn, json.loads(os.environ.get('ZOPTS', '{}')))
    b.close()
for e in errs[:5]: print(e[:300])
json.dump(rep, open(out, 'w'))
print({k: rep[k] for k in ('nMesh', 'nTri', 'nPieces', 'nFaces', 'tested')}, 'pairs', len(rep['pairs']), 'skipped', rep['skipped'][:8])
