# Driven by tools/stats.sh (which holds the render lock). Opens the house with ?statsdump in
# headless Chrome (real time, GPU through ANGLE), waits for perf.js to finish, saves and prints the table.
import sys, json, time, os
from playwright.sync_api import sync_playwright

out, q = sys.argv[1], sys.argv[2]
if 'statsdump' not in q and 'eval=' not in q and not os.environ.get('SHOT'): q = 'statsdump&' + q
url = os.environ.get('HOUSE_URL', 'http://127.0.0.1:8791') + '/?' + q
args = ['--no-sandbox', '--use-gl=angle', '--use-angle=' + os.environ.get('ANGLE', 'gl-egl'), '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']
with sync_playwright() as p:
    b = p.chromium.launch(channel='chrome', headless=True, args=args)
    pg = b.new_page(viewport={'width': int(os.environ.get('W', 1280)), 'height': int(os.environ.get('H', 760))})
    errs = []
    pg.on('console', lambda m: errs.append(m.text) if m.type in ('error', 'warning') else None)
    pg.on('pageerror', lambda e: errs.append('PAGEERROR ' + str(e)))
    if os.environ.get('PAGE'): url = url.replace('8791/?', '8791/' + os.environ['PAGE'] + '.html?')
    pg.goto(url)
    if os.environ.get('SHOT'):
        try: pg.wait_for_function('window.__ready === true', timeout=120000)
        except Exception: print('not ready:', errs[:10])
        time.sleep(float(os.environ.get('SETTLE', 6)))
        pg.screenshot(path=os.environ['SHOT']); print('\n'.join(e[:300] for e in errs[:8])); b.close(); sys.exit(0)
    if 'eval=' in q:
        expr = [kv.split('=', 1)[1] for kv in q.split('&') if kv.startswith('eval=')][0]
        from urllib.parse import unquote
        try: pg.wait_for_function('window.__ready === true', timeout=120000)
        except Exception as e: print('not ready:', errs[:10])
        time.sleep(float(os.environ.get('SETTLE', 8)))
        print(json.dumps(pg.evaluate(unquote(expr)), indent=1)); b.close(); sys.exit(0)
    t0 = time.time()
    while True:
        if pg.evaluate("document.title") == 'statsdump done': break
        bad = [e for e in errs if e.startswith('PAGEERROR')]
        if bad or time.time() - t0 > 560:
            print('\n'.join(e[:400] for e in errs[:12])); print('progress:', pg.evaluate("document.getElementById('statsdump')?.textContent")); b.close(); sys.exit(1)
        time.sleep(1)
    txt = pg.eval_on_selector('#statsdump', 'e => e.textContent')
    b.close()
for e in errs[:10]: print('console:', e[:300])
open(out, 'w').write(txt)
d = json.loads(txt)
print('startup', d['startup'], 'total', d.get('totalMs'))
print(f"{'view':26} {'calls':>6} {'ktris':>7} {'tex':>5} {'geo':>5} {'texMB':>6} {'geoMB':>6} {'visMs':>6}")
for k, v in d['views'].items():
    print(f"{k:26} {v['calls']:>6} {v['tris']/1000:>7.0f} {v['textures']:>5} {v['geometries']:>5} {v['texMB']:>6} {v['geoMB']:>6} {str(v['visMs']):>6}")
