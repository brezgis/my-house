#!/usr/bin/env python3
"""The module preload list in site/index.html.

  python3 tools/preload.py           rewrite the list between the <!-- preload --> markers
  python3 tools/preload.py --check   exit 1 if the list is out of date (tools/check.sh runs this)

Without it the browser finds the modules a level at a time: main.js names twenty, those name thirty more, and so on
five deep, each level a round trip to the server before the next can be asked for. Listed in the page, every module
the start-up imports is asked for at once. (Modules loaded later with import() are left out: nothing waits for them.)
The same file is in the house, the town and the lab.
"""
import os, re, sys

SITE = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'site')
IMP = re.compile(r"""^\s*import\s+(?:[^'"]*?from\s+)?['"]([^'"]+)['"]""", re.M)


def modules():
    def res(frm, spec):
        if spec == 'three': return os.path.join(SITE, 'vendor/three/three.module.js')
        if spec.startswith('three/addons/'): return os.path.join(SITE, 'vendor/three/addons', spec[len('three/addons/'):])
        return os.path.normpath(os.path.join(os.path.dirname(frm), spec))
    root = os.path.normpath(os.path.join(SITE, 'src', 'main.js')); depth = {root: 0}; q = [root]
    while q:
        f = q.pop(0)
        for spec in IMP.findall(open(f).read()):
            g = res(f, spec)
            if g not in depth and os.path.exists(g): depth[g] = depth[f] + 1; q.append(g)
    # deepest first is not needed: the browser takes them all at once; listed by depth, then name, so the diff stays calm
    return [os.path.relpath(f, os.path.normpath(SITE)) for f in sorted(depth, key=lambda f: (depth[f], f)) if f != root]


def block():
    return '<!-- preload: tools/preload.py writes this list -->\n' + ''.join(f'<link rel="modulepreload" href="{m}">\n' for m in modules()) + '<!-- /preload -->\n'


def main():
    p = os.path.join(SITE, 'index.html'); s = open(p).read(); b = block()
    m = re.search(r'<!-- preload: [^\n]*-->\n.*?<!-- /preload -->\n', s, re.S)
    cur = m.group(0) if m else None
    if '--check' in sys.argv:
        if cur != b: print('preload list out of date: run python3 tools/preload.py'); sys.exit(1)
        print('preload list current'); return
    if m: s = s[:m.start()] + b + s[m.end():]
    else:
        at = s.index('<script type="importmap">'); at = s.index('</script>', at) + len('</script>\n')
        s = s[:at] + b + s[at:]
    open(p, 'w').write(s); print('preload list written:', b.count('modulepreload'), 'modules')


if __name__ == '__main__':
    main()
