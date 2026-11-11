# Open the house in headless Chrome (GPU, real time), wait for it to settle, evaluate a JavaScript file
# (an expression or an async arrow function; promises are awaited) and print the result as JSON.
#   tools/evaljs.sh <file.js> ["<query>"]        SETTLE=6 seconds after loading; START=1 does not wait for models
import sys, json, time, os
from playwright.sync_api import sync_playwright
js = open(sys.argv[1]).read(); q = sys.argv[2] if len(sys.argv) > 2 else ''
url = os.environ.get('HOUSE_URL', 'http://127.0.0.1:8791') + '/?' + q
args = ['--no-sandbox', '--use-gl=angle', '--use-angle=' + os.environ.get('ANGLE', 'gl-egl'), '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']
with sync_playwright() as p:
    b = p.chromium.launch(channel='chrome', headless=True, args=args)
    pg = b.new_page(viewport={'width': int(os.environ.get('W', 1280)), 'height': int(os.environ.get('H', 760))})
    errs = []
    pg.on('pageerror', lambda e: errs.append('PAGEERROR ' + str(e)))
    pg.on('console', lambda m: errs.append(m.text) if m.type in ('error',) or m.text.startswith('Q:') else None)
    pg.goto(url)
    pg.wait_for_function('window.__house && window.house', timeout=120000)
    if not os.environ.get('START'):
        pg.wait_for_function('window.__ready === true', timeout=120000)
        for i in range(240):
            if pg.evaluate('window.__house.pending()') == 0: break
            time.sleep(0.5)
    time.sleep(float(os.environ.get('SETTLE', 6)))
    res = pg.evaluate(js)
    if os.environ.get('SHOT'): pg.screenshot(path=os.environ['SHOT'])
    b.close()
for e in errs[:12]: print('page:', e[:400])
print(res if isinstance(res, str) else json.dumps(res, indent=1))
