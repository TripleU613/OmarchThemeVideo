"""Final timing: refined alignment, with the few lines that cross-chorus
structure proved wrong re-aligned inside tight windows (seconds)."""
import json
from pathlib import Path
import refine  # runs the anchored pass and exposes align_window + data

WINDOWS = {
    'c1-04': (92.9, 97.9),    # same beat as c2-04/c3-04 (b24.9); first words had latched onto c1-03's tail
    'c3-03': (251.2, 255.4),  # b17.4 like c1-03/c2-03
    'c3-06': (263.0, 268.6),  # pickup at b39.4 like c1-06/c2-06
    'p2-02': (151.85, 154.0), # pre-chorus spacing (+2.0s after p2-01), vocal onset 151.99
    'v2-07': (140.5, 144.9),  # vocal onset 140.70
}
lines = json.loads((refine.ROOT / 'analysis/lines-refined.json').read_text())
by = {l['id']: l for l in lines}
for lid, (a, b) in WINDOWS.items():
    li = refine.ids.index(lid)
    ws = refine.align_window([li], a, b)[lid]
    known = [w for w in ws if w]
    by[lid].update(words=ws, start=known[0][0], end=known[-1][1], fixed=True)
    print(f'{lid}: {known[0][0]:.3f} -> {known[-1][1]:.3f}  words ' + ' '.join(f'{w[0]:.2f}' if w else '-' for w in ws))
(refine.ROOT / 'analysis/lines.json').write_text(json.dumps(lines, indent=1))
print('wrote analysis/lines.json with', len(lines), 'lines')
