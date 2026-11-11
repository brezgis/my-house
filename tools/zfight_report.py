# Summarise a tools/zfight.sh report: pairs grouped by the code (or model) on each side.
#   python3 tools/zfight_report.py <report.json> [same|opp|all] [maxdd] [filter-regex]
import sys, json, re, collections
rep = json.load(open(sys.argv[1])); mode = sys.argv[2] if len(sys.argv) > 2 else 'same'
maxdd = float(sys.argv[3]) if len(sys.argv) > 3 else 0.012; filt = re.compile(sys.argv[4]) if len(sys.argv) > 4 else None
P = rep['pieces']
def short(p):
    s = p['src']
    if s.startswith('mesh:'): return re.sub(r'#\d+$', '', s)[:70]
    fr = [f for f in s.split(' < ') if not re.match(r'(kit\.js:(39|[4-6]\d|7[0-2])|house\.js:6[4-6]|main\.js:\d+|furnish\.js:29|garden\.js:\d+)$', f)] or s.split(' < ')[:1]
    return ' < '.join(fr[:3])
def visible_pair(pr, a, b):
    fa, fb = a['f'], b['f']
    if pr['same']: return True
    return fa['ds'] or fb['ds']
groups = collections.defaultdict(list)
for pr in rep['pairs']:
    a, b = P[str(pr['a'])], P[str(pr['b'])]
    if pr['dd'] > maxdd: continue
    if 'hidden' not in mode and not pr.get('exposed', 1): continue
    if 'ident' not in mode and pr.get('ident'): continue
    if (a['f']['po'] or b['f']['po']) and 'decal' not in mode: continue
    if 'opp' not in mode and 'all' not in mode and not visible_pair(pr, a, b): continue
    if 'opp' in mode and pr['same']: continue
    ka, kb = sorted([short(a) + ' [' + a['mesh'] + ']', short(b) + ' [' + b['mesh'] + ']'])
    if filt and not filt.search(ka + kb): continue
    groups[(ka, kb)].append(pr)
rows = sorted(groups.items(), key=lambda kv: -sum(p['over'] for p in kv[1]))
print(len(rows), 'groups,', sum(len(v) for v in groups.values()), 'pairs')
for (ka, kb), v in rows[:int(sys.argv[5]) if len(sys.argv) > 5 else 400]:
    ex = max(v, key=lambda p: p['over']); a, b = P[str(ex['a'])], P[str(ex['b'])]
    fl = lambda p: ''.join(k for k in ('po', 'ds', 'tr') if p['f'][k]) + ('' if p['f']['dw'] else 'nodw')
    dds = sorted(p['dd'] for p in v)
    print(f"{len(v):4d}x area {sum(p['over'] for p in v):8.2f} dd {dds[0]:.4f}..{dds[-1]:.4f} {'same' if ex['same'] else 'opp '} n={ex['n']} at {ex.get('c')} exp {sum(p.get('exposed',0) for p in v)}/{sum(p.get('ns',0) for p in v)} z={a.get('zone','')}/{b.get('zone','')} {fl(a)}/{fl(b)}\n      A {ka}\n      B {kb}")
