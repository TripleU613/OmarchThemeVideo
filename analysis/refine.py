"""Anchored re-alignment of the lines the two global passes disagree on.

Lines whose mix and vocal-stem alignments agree are anchors. Every run of
disputed lines between two anchors is re-aligned on the vocal stem's cached
emissions, constrained to the window between those anchors, so ad-libs and
held notes elsewhere in the song can no longer pull words away.

Writes analysis/lines-refined.json (timing only).
"""
import json
from pathlib import Path

import numpy as np

from align import ROOT, read_lines, viterbi
import re

AGREE = 0.06  # seconds
FLOOR = {"v1-01": 36.0}  # verse 1 cannot start inside the intro

mix = {l["id"]: l for l in json.loads((ROOT / "analysis/lines-mix.json").read_text())}
voc = {l["id"]: l for l in json.loads((ROOT / "analysis/lines-vocals.json").read_text())}
z = np.load(ROOT / "analysis/vocals.emissions.npz")
lp, spf, vocab = z["lp"], float(z["spf"]), json.loads(str(z["vocab"]))
blank, sep = vocab["<pad>"], vocab["|"]
lines = read_lines()
ids = [l["id"] for l in lines]
anchor = {k: abs(mix[k]["start"] - voc[k]["start"]) < AGREE for k in ids}


def words_of(text):
    return re.sub(r"[^a-z' ]", " ", text.lower().replace("’", "'")).split()


def align_window(group, t0, t1):
    f0, f1 = int(t0 / spf), int(t1 / spf)
    tokens, owner = [], []
    for li in group:
        for wi, w in enumerate(words_of(lines[li]["text"])):
            for ch in w.upper():
                if ch in vocab:
                    tokens.append(vocab[ch])
                    owner.append((li, wi))
            tokens.append(sep)
            owner.append(None)
    path = viterbi(lp[f0:f1], np.array(tokens), blank)
    spans = {}
    for t, s in enumerate(path):
        if s % 2 == 1 and owner[s // 2] is not None:
            o = owner[s // 2]
            a, b = spans.get(o, (t, t))
            spans[o] = (min(a, t), max(b, t))
    out = {}
    for li in group:
        n = len(words_of(lines[li]["text"]))
        ws = []
        for wi in range(n):
            if (li, wi) in spans:
                a, b = spans[(li, wi)]
                ws.append([round((f0 + a) * spf, 3), round((f0 + b + 1) * spf, 3)])
            else:
                ws.append(None)
        out[ids[li]] = ws
    return out


refined = {k: voc[k]["words"] for k in ids}
i = 0
while i < len(ids):
    if anchor[ids[i]]:
        i += 1
        continue
    j = i
    while j < len(ids) and not anchor[ids[j]]:
        j += 1
    group = list(range(i, j))
    t0 = voc[ids[i - 1]]["end"] - 0.05 if i > 0 else 0.0
    t0 = max(t0, FLOOR.get(ids[i], 0.0))
    t1 = voc[ids[j]]["start"] + 0.05 if j < len(ids) else lp.shape[0] * spf
    refined.update(align_window(group, t0, t1))
    print(f"re-aligned {ids[i]}..{ids[j-1]} within [{t0:.2f}, {t1:.2f}]")
    i = j

out = []
for k in ids:
    ws = refined[k]
    known = [w for w in ws if w]
    out.append({"id": k, "section": voc[k]["section"], "start": known[0][0], "end": known[-1][1], "words": ws, "anchor": anchor[k]})
(ROOT / "analysis/lines-refined.json").write_text(json.dumps(out, indent=1))
for l in out:
    if not l["anchor"]:
        m, v = mix[l["id"]]["start"], voc[l["id"]]["start"]
        print(f'{l["id"]:7s} mix {m:8.3f}  voc {v:8.3f}  refined {l["start"]:8.3f} -> {l["end"]:8.3f}  words ' + " ".join(f"{w[0]:.2f}" if w else "-" for w in l["words"]))
