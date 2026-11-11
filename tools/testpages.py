# Run the quick check pages (walktest, stafftest, gardentest, friendtest) in headless Chrome and print what they report.
#   tools/testpages.sh [page ...]
import sys, os, time
from playwright.sync_api import sync_playwright
base = os.environ.get('HOUSE_URL', 'http://127.0.0.1:8791'); pages = sys.argv[1:] or ['walktest', 'stafftest', 'gardentest', 'friendtest']
args = ['--no-sandbox', '--use-gl=angle', '--use-angle=gl-egl', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']
def run(b, url):
    pg = b.new_page(viewport={'width': 900, 'height': 600}); errs = []
    pg.on('pageerror', lambda e: errs.append('PAGEERROR ' + str(e)))
    pg.goto(url); last = ''; t0 = time.time()
    while time.time() - t0 < 90:
        time.sleep(2); txt = pg.evaluate("document.body.innerText")
        if txt == last and 'running' not in txt[:40]: break
        last = txt
    pg.close(); return last + ('\n' + '\n'.join(errs) if errs else '')
with sync_playwright() as p:
    b = p.chromium.launch(channel='chrome', headless=True, args=args)
    for name in pages:
        after = run(b, f'{base}/{name}.html')
        print(f'==== {name} ({len(after.splitlines())} lines)'); print(after[:int(os.environ.get('MAXC', 2500))])
    b.close()
