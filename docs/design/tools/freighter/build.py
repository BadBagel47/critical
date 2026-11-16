# Builds docs/design/prototypes/freighter.html (the design test for D-249) from the four parts in this folder.
# Lines marked //@@ a-b are taken from docs/design/prototypes/interior-pirate-base.html, so that file must not change
# without these numbers being checked. The ship pictures come from assets/sprites. Run: python3 build.py
import re, base64, os
HERE = os.path.dirname(os.path.abspath(__file__)) + '/'
ROOT = os.environ.get('CRITICAL_ROOT') or os.path.abspath(HERE + '../../../..') + '/'
W = HERE
src = open(ROOT + 'docs/design/prototypes/interior-pirate-base.html').read().split('\n')
out = []
for part in ['f1.html', 'f2.html', 'f3.html', 'f4.html']:
    for line in open(W + part).read().split('\n'):
        m = re.match(r'\s*//@@ (\d+)-(\d+)\s*$', line)
        if m:
            a, b = int(m.group(1)), int(m.group(2))
            out.extend(src[a - 1:b])
        else:
            out.append(line)
s = '\n'.join(out)
for name in ['frigate']:
    b64 = base64.b64encode(open(ROOT + 'assets/sprites/%s.png' % name, 'rb').read()).decode()
    s = s.replace("'//@@IMG:%s'" % name, "'data:image/png;base64,%s'" % b64)
PATCH = [
    ("K = Math.floor(R() * 4);", "K = 0; R();"),
    ("occluders = D.wallSegs.slice();", "occluders = (D.visSegs || D.wallSegs).slice();"),
    ("const cone = (x, y, a, w, r, fill) => { vg.fillStyle = fill; vg.beginPath(); vg.moveTo(x, y); vg.arc(x, y, r, a - w, a + w); vg.closePath(); vg.fill(); };",
     "buildOccluders(); const cone = (x, y, a, w, r, fill) => { const p = visPoly(x, y, r); vg.save(); vg.beginPath(); vg.moveTo(p[0], p[1]); for (let k = 2; k < p.length; k += 2) vg.lineTo(p[k], p[k + 1]); vg.closePath(); vg.clip(); vg.fillStyle = fill; vg.beginPath(); vg.moveTo(x, y); vg.arc(x, y, r, a - w, a + w); vg.closePath(); vg.fill(); vg.restore(); };"),
    ("const s = d.kind === 'arch' ? 4 : d.kind === 'slide' || d.kind === 'alarm' ? 6 : 8;", "const s = d.kind === 'arch' ? 4 : ['slide', 'alarm', 'staff'].includes(d.kind) ? 6 : 8;"),
    ("if (!['atrium', 'cave', 'hall', 'power'].includes(r.kind)) goals.push", "if (!['concourse', 'hold', 'command', 'power', 'drones', 'yard', 'breaker'].includes(r.kind)) goals.push"),
    ("if (!r.n || ['boss', 'lift', 'stairs', 'ladder'].includes(r.kind)) continue;", "if (!r.n || ['boss', 'lift', 'stairs', 'ladder', 'command'].includes(r.kind)) continue;"),
    ("if (f.fire > 0) pose.fire = 1;", "if (f.fire > 0) pose.fire = 1; if (f.docker && f.at === 1 && f.moving) pose.carry = 1;"),
    ("decks = [gen1(), gen2(), gen3()];", "decks = [genF()]; finalize();"),
    ("d.wallSegs = []; buildWalls(); d.built = {};", "d.wallSegs = []; finalizeDeck(); buildWalls(); d.built = {};"),
    ("const c = d.kind === 'alarm' ? '#e0b040' : null;", "const c = d.kind === 'alarm' ? '#e0b040' : d.base === 'staff' ? '#c8b040' : null;"),
]
for a, b in PATCH:
    n = s.count(a)
    if n != 1: print('PATCH COUNT', n, a[:60]); 
    s = s.replace(a, b)
open(os.environ.get('OUT_FILE') or ROOT + 'docs/design/prototypes/freighter.html', 'w').write(s)
print('ok', len(s))
