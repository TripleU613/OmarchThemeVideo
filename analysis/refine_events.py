"""Snap the analysis's drum events and beat grid to the real song's attacks.

audiomap.json's events and grid sit on 23 ms analysis frames, and the grid runs
late against the drums. This measures every event again on the song itself
(music-video/assets/audio/song.wav), with 2 ms spectral-flux onset curves per
band, and writes analysis/drums.json:

  kick, snare, hat, perc  [[t, strength], ...]: each event at its measured attack
                          (searched within 40 ms of the analysis time); strength
                          is the analysis energy, 0..1
  beats                   every grid beat at the attack of its hit (within -75..+30
                          ms) when that agrees with the local lead of the grid
                          over the drums, else the grid moved by that lead
  fills                   [[start, end, kind, drum], ...]: real fills and rolls
                          (steady hi-hat patterns are left out)
  risers, stops, surges   times of risers, hard stops, and energy surges/drops

Numpy only. Run from the repo root: python3 analysis/refine_events.py
"""
import json
import wave
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
amap = json.loads((ROOT / "analysis/audiomap.json").read_text())

w = wave.open(str(ROOT / "music-video/assets/audio/song.wav"))
SR = w.getframerate()
x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).reshape(-1, w.getnchannels()).mean(axis=1).astype(np.float32) / 32768

# Band onset curves: positive log-magnitude flux, 2 ms hop, 21 ms window.
NF, HOP = 1024, SR // 500
freqs = np.fft.rfftfreq(NF, 1 / SR)
BANDS = {"low": (30, 150), "mid": (150, 2000), "high": (2000, 12000)}
masks = {k: (freqs >= a) & (freqs < b) for k, (a, b) in BANDS.items()}
win = np.hanning(NF).astype(np.float32)
pad = np.pad(x, NF // 2)
n = (len(pad) - NF) // HOP
flux = {k: np.zeros(n, np.float32) for k in BANDS}
prev = None
for c0 in range(0, n, 20000):
    c1 = min(n, c0 + 20000)
    idx = np.arange(c0, c1)[:, None] * HOP + np.arange(NF)[None, :]
    mag = np.log1p(100 * np.abs(np.fft.rfft(pad[idx] * win, axis=1)).astype(np.float32))
    full = mag if prev is None else np.vstack([prev, mag])
    d = np.maximum(0, np.diff(full, axis=0))
    if prev is None:
        d = np.vstack([np.zeros((1, d.shape[1]), np.float32), d])
    for k, m in masks.items():
        flux[k][c0:c1] = d[:, m].sum(axis=1)
    prev = mag[-1:]
for k in flux:
    flux[k] /= np.percentile(flux[k], 99.5) + 1e-9
t_of = lambda i: i * HOP / SR  # frame i is centred on its time (padded by NF/2)

def attack(t, curve, lo=-0.04, hi=0.04):
    i0, i1 = max(1, int((t + lo) * SR / HOP)), min(n - 1, int((t + hi) * SR / HOP))
    i = i0 + int(np.argmax(curve[i0:i1]))
    return t_of(i), float(curve[i])

curves = {
    "kick": flux["low"] + 0.5 * flux["high"],
    "snare": flux["mid"] + flux["high"],
    "hihat": flux["high"],
    "perc": flux["mid"] + flux["high"],
}
r3 = lambda v: round(float(v), 3)
out = {k: [] for k in ("kick", "snare", "hat", "perc")}
moved = []
for e in amap["events"]:
    t, peak = attack(e["t"], curves[e["drum"]])
    moved.append(t - e["t"])
    out["hat" if e["drum"] == "hihat" else e["drum"]].append([r3(t), round(e["energy"], 2)])
for k in out:
    out[k].sort()

beat_curve = flux["low"] + flux["mid"] + flux["high"]
grid = amap["grid"]["beats_sec"]
hits, plain = [], []
for b in grid:
    t, peak = attack(b, beat_curve, -0.075, 0.03)
    hits.append((t, peak))
lead = float(np.median([b - t for b, (t, p) in zip(grid, hits) if p > 0.35]))
# Each beat takes its measured attack only when it agrees (within 15 ms) with the
# local lead (median over 9 beats); otherwise it takes that local lead.
offs = np.array([b - t for b, (t, p) in zip(grid, hits)])
beats = []
for i, b in enumerate(grid):
    local = float(np.median(offs[max(0, i - 4):i + 5]))
    t, p = hits[i]
    beats.append(r3(t if p > 0.35 and abs((b - t) - local) <= 0.015 else b - local))
out["beats"] = beats

keep = lambda r: r["kind"] in ("fill", "accel-roll") or (r["kind"] == "sustained-fill" and r["drum"] in ("snare", "kick"))
out["fills"] = [[r3(r["start"]), r3(r["end"]), r["kind"], r["drum"]] for r in amap["rolls"] if keep(r)]
out["risers"] = [r3(e["t"]) for e in amap["events"] if e["special"] == "riser"]
out["stops"] = sorted({r3(e["t"]) for e in amap["events"] if e["special"] == "hard_stop"})
out["surges"] = [[m["t"], m["kind"]] for m in amap["key_moments"]]
out["lead"] = r3(lead)

(ROOT / "analysis/drums.json").write_text(json.dumps(out, separators=(",", ":")))
mv = np.array(moved) * 1000
print(f"events: {len(moved)} moved median {np.median(mv):+.1f} ms, p10 {np.percentile(mv,10):+.1f}, p90 {np.percentile(mv,90):+.1f}")
strong = sum(p > 0.35 for t, p in hits)
print(f"beats: {strong}/{len(grid)} on a measured hit; grid leads measured hits by {lead*1000:.1f} ms (median)")
print(f"fills kept {len(out['fills'])} of {len(amap['rolls'])}; risers {len(out['risers'])}; stops {len(out['stops'])}")
