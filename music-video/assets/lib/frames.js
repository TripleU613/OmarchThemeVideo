// Frame effects: a page-wide layer above the scenes and below the captions that
// draws only in a 40px band along the frame's edges, and only while that band
// is empty in the scene underneath (assets/lib/frame-need.js, measured by
// scripts/edge-need.mjs). One idea per section, synced to the kicks, snares and
// the corrected beat grid, each with its own way in and out. Every pixel is a
// pure function of song time T: the on/off schedule is fixed at load, and the
// envelope is 0 at every edge of an on stretch, so nothing steps at a cut.
(() => {
  const N = window.OM_FRAME_NEED;
  if (!N || !OM.T) return;
  /** The beat grid runs 46 ms late against the drums. Set to 0 once the grid is fixed upstream. */
  const BEAT_FIX = 0.046;
  const W = 1920, H = 1080, C = 10, DEPTH = 4, B = C * DEPTH, P = 2 * (W + H);
  const MIN_RUN = 1.5; // hysteresis: on and off stretches last at least this long
  const SPB = OM.SPB;
  const clamp = OM.clamp, E = OM.ease;
  const beats = OM.T.beats.map((b) => b - BEAT_FIX), downs = OM.T.downbeats.map((b) => b - BEAT_FIX);
  const KICK = N.kick.map((e) => e[0]), KICK_E = N.kick.map((e) => e[1]);
  const SNARE = N.snare.map((e) => e[0]), HAT = N.hihat.map((e) => e[0]);

  // ---------- music ----------
  /** Index of the last x <= t, or -1. */
  const last = (xs, t) => {
    let lo = 0, hi = xs.length - 1, r = -1;
    while (lo <= hi) {
      const m = (lo + hi) >> 1;
      if (xs[m] <= t) { r = m; lo = m + 1; } else hi = m - 1;
    }
    return r;
  };
  const pulse = (xs, t, half = 0.12) => {
    const i = last(xs, t);
    return i < 0 ? 0 : Math.pow(0.5, (t - xs[i]) / half);
  };
  /** Continuous beat number on the corrected grid. */
  const beatPos = (t) => {
    const i = last(beats, t);
    if (i < 0) return (t - beats[0]) / SPB;
    const a = beats[i], b = i + 1 < beats.length ? beats[i + 1] : a + SPB;
    return i + (t - a) / (b - a);
  };
  const first = (xs, t) => { const i = last(xs, t - 1e-6) + 1; return i < xs.length ? xs[i] : null; }; // first x >= t
  const lastAt = (xs, t) => { const i = last(xs, t); return i >= 0 ? xs[i] : null; }; // last x <= t

  // ---------- band geometry ----------
  // Perimeter columns clockwise from the top-left corner; each holds DEPTH cells, d 0 outermost.
  const COLS = [];
  const col = (side, cx, cy, nx, ny, tx, ty, s, u) => {
    const top = side % 2 === 0;
    const c = { side, s, u, nx, ny, tx, ty, i: COLS.length, dc: top ? Math.min(cx, W - cx) : Math.min(cy, H - cy), dm: top ? Math.abs(cx - W / 2) : Math.abs(cy - H / 2), cells: [] };
    for (let d = 0; d < DEPTH; d++) {
      const x = cx - nx * d * C, y = cy - ny * d * C;
      c.cells.push({ cx: x, cy: y, d, side, s, u, nx, ny, tx, ty, h: OM.hash(x | 0, y | 0, 7), h2: OM.hash(x | 0, y | 0, 11), r: Math.max(0, (Math.hypot(x - W / 2, y - H / 2) - H / 2) / (Math.hypot(W / 2, H / 2) - H / 2)) });
    }
    COLS.push(c);
  };
  const NT = W / C, NS = (H - 2 * B) / C; // 192 and 100
  for (let i = 0; i < NT; i++) { const x = i * C + C / 2; col(0, x, C / 2, 0, -1, 1, 0, x, x / W); }
  for (let j = 0; j < NS; j++) { const y = B + j * C + C / 2; col(1, W - C / 2, y, 1, 0, 0, 1, W + y, y / H); }
  for (let i = NT - 1; i >= 0; i--) { const x = i * C + C / 2; col(2, x, H - C / 2, 0, 1, -1, 0, W + H + W - x, (W - x) / W); }
  for (let j = NS - 1; j >= 0; j--) { const y = B + j * C + C / 2; col(3, C / 2, y, -1, 0, 0, -1, 2 * W + H + H - y, (H - y) / H); }
  const NC = COLS.length; // 584
  const BOTTOM0 = NT + NS; // first bottom column (at the right end)

  // ---------- inks ----------
  const F = OM.fieldInks('tokyo-night'), TH = OM.theme('tokyo-night');
  const DIM = 0, MID = 1, LIT = 2, HOVER = 3, CREST = 4, LAV = 5, GRAD = 6, NG = 16;
  const COLORS = [F.dim, F.mid, F.lit, F.hover, F.crest, TH.text];
  // A Hyprland-style active border gradient, in Tokyo Night inks, periodic around the frame.
  for (let g = 0; g < NG; g++) COLORS.push(g < NG / 2 ? OM.mix(TH.text, F.lit, g / (NG / 2)) : OM.mix(F.lit, TH.text, (g - NG / 2) / (NG / 2)));
  const LV = 16; // alpha levels: fine enough that motion, not quantisation, is what changes frame to frame
  const FILL = [], BUCKET = [];
  COLORS.forEach((hex) => {
    const [r, g, b] = OM.rgb(hex);
    for (let l = 0; l < LV; l++) { FILL.push(`rgba(${r},${g},${b},${((l + 1) / LV).toFixed(3)})`); BUCKET.push([]); }
  });

  // ---------- drawing ----------
  // put() runs a cell through the current transition mask (M) into an ink/alpha bucket.
  const M = { a: 1, s: 1, x: 0, y: 0, k: -1 };
  let mask = null, prog = 1, fade = 1, gain = 1, peak = 0;
  // Subtle rims: inks sit a step softer and 40% dimmer, except in each beat's brief peak flash.
  const soft = (ink) => (peak > 0.5 || ink > CREST ? ink : ink === DIM ? DIM : ink - 1);
  const put = (c, ink, alpha, sc = 1, dx = 0, dy = 0) => {
    M.a = 1; M.s = 1; M.x = 0; M.y = 0; M.k = -1;
    if (mask) mask(c, prog);
    const a = alpha * M.a * fade * gain; // fade: 0 at a transition's first and last instant, so nothing steps at a cut
    if (a < 0.06) return;
    const z = (C - 2) * sc * M.s;
    if (z < 0.6) return;
    BUCKET[soft((M.k >= 0 ? M.k : ink)) * LV + Math.min(LV - 1, Math.max(0, Math.ceil(a * LV) - 1))].push(c.cx + dx + M.x - z / 2, c.cy + dy + M.y - z / 2, z);
  };

  // ---------- the ideas, one per section ----------
  // Each: draw(T, phase, p, sec) with p 0..1 the transition's visibility; mask.in / mask.out per cell.
  const kickStep = new Set(KICK.map((t) => Math.floor(beatPos(t) * 4)));
  const snareStep = new Set(SNARE.map((t) => Math.floor(beatPos(t) * 4)));
  const sideOf = (side, i) => [0, NT, BOTTOM0, BOTTOM0 + NT][side] + i;

  const IDEAS = {
    // Workspace ticker: the top bar's nine workspace dots; the active one hops on every beat and stands tall on kicks.
    intro: {
      mask: {
        in: (c, p) => { const l = clamp(p * 1.4 - (c.cx / W) * 0.4); M.s = l > 0 ? E.outBack(l) : 0; M.a = clamp(l * 3); }, // pop in left to right
        out: (c, q) => { M.s = E.outCubic(q); M.a = clamp(q * 3); }, // every cell shrinks to a dot
      },
      draw(T) {
        const bi = last(beats, T), ws = ((bi % 9) + 9) % 9, was = (ws + 8) % 9;
        const hop = E.outCubic(clamp((T - (bi >= 0 ? beats[bi] : 0)) / 0.14));
        const kp = pulse(KICK, T, 0.12);
        for (let g = 0; g < 9; g++) {
          const mid = (g + 0.5) * (NT / 9), act = g === ws;
          const w = 3 + (act ? 6 * hop : g === was ? 6 * (1 - hop) : 0);
          for (let i = Math.round(mid - w / 2); i < Math.round(mid + w / 2); i++) {
            const top = COLS[i], bot = COLS[BOTTOM0 + NT - 1 - i];
            const ink = act ? CREST : MID;
            put(top.cells[1], ink, 1); put(top.cells[2], ink, 1);
            if (act && kp > 0.08) { put(top.cells[0], CREST, kp); put(top.cells[3], HOVER, kp); }
            put(bot.cells[1], ink, 0.35); put(bot.cells[2], ink, 0.35); // its dim reflection along the bottom
          }
        }
      },
    },
    // Terminal cursor: a block cursor types round the frame a cell per 16th; kicks and snares type bright glyphs.
    v1: {
      draw(T, ph, p, sec) {
        const L = 72, st = Math.floor(beatPos(T) * 4), st0 = Math.floor(beatPos(sec.a) * 4);
        const back = ph === 'out' ? (1 - p) * L : 0; // backspace: the trail is deleted from the cursor back
        const reach = ph === 'in' ? p * L : L; // drawn on behind the cursor as it appears
        for (let k = Math.floor(back); k < reach; k++) {
          const abs = st - k;
          if (abs < st0) break;
          if (OM.hash(abs, 1, 3) < 0.17) continue; // a space
          const c = COLS[(((abs - st0) % NC) + NC) % NC], tall = 1 + Math.floor(OM.hash(abs, 2, 3) * 3);
          const ink = kickStep.has(abs) ? CREST : snareStep.has(abs) ? HOVER : k < 4 ? LIT : MID;
          const a = 1 - (k / L) * 0.8;
          for (let d = DEPTH - 1; d >= DEPTH - tall; d--) put(c.cells[d], ink, a);
        }
        const head = COLS[(((st - Math.round(back) - st0) % NC) + NC) % NC];
        const blink = ph === 'on' || ph === 'out' ? 0.55 + 0.45 * pulse(KICK, T, 0.15) : 1;
        for (let d = 0; d < DEPTH; d++) put(head.cells[d], LAV, blink * (ph === 'in' ? clamp(p * 4) : 1));
      },
    },
    // Tiling guides: rulers on every edge split one level finer every second kick, like a dwindle layout subdividing.
    p1: {
      mask: {
        in: (c, p) => { const e = 1 - E.outCubic(p); M.x = c.nx * e * B * 1.2; M.y = c.ny * e * B * 1.2; }, // slide in from outside
        out: (c, q) => { const e = E.inCubic(1 - q); M.x = c.tx * e * 700; M.y = c.ty * e * 700; M.a = clamp(q * 2); }, // slide away clockwise
      },
      draw(T, ph, p, sec) {
        const ki = last(KICK, T), kc = Math.max(0, ki - last(KICK, sec.a));
        const lvl = Math.min(6, 1 + Math.floor(kc / 2)), fresh = kc > 0 && kc % 2 === 0;
        const pop = ki >= 0 ? E.outBack(clamp((T - KICK[ki]) / 0.16)) : 1, kp = pulse(KICK, T, 0.1);
        for (let side = 0; side < 4; side++) {
          const n = side % 2 ? NS : NT;
          for (let i = 0; i < n; i++) put(COLS[sideOf(side, i)].cells[0], kp > 0.3 ? LIT : DIM, 0.7);
          for (let l = 1; l <= lvl; l++) {
            const len = Math.max(1, 5 - l), newest = l === lvl;
            for (let k = 1; k < 1 << l; k += 2) {
              const c = COLS[sideOf(side, Math.min(n - 1, Math.round((k / (1 << l)) * n - 0.5)))];
              for (let d = 1; d <= Math.min(DEPTH - 1, len); d++) put(c.cells[d], newest ? (kp > 0.3 ? CREST : LIT) : MID, 1, newest && fresh ? pop : 1);
            }
          }
        }
      },
    },
    // Hyprland active border: a lavender-to-green gradient that turns an eighth of the way round on every beat.
    c1: {
      mask: {
        in: (c, p) => { const dc = c.side % 2 === 0 ? Math.min(c.cx, W - c.cx) / (W / 2) : Math.min(c.cy, H - c.cy) / (H / 2); M.a = clamp((E.outCubic(p) * 1.05 - dc) / 0.05); }, // drawn on from the four corners
        out: (c, q) => { M.a = clamp((q * 1.05 - c.s / P) / 0.05); }, // the arc winds away clockwise
      },
      draw(T) {
        const bp = beatPos(T), fb = bp - Math.floor(bp);
        const rot = (Math.floor(bp) + E.outExpo(clamp(fb / 0.35))) / 8;
        const kp = pulse(KICK, T, 0.11), sp = pulse(SNARE, T, 0.09);
        for (const c of COLS) {
          const g = GRAD + Math.floor((((c.s / P + rot) % 1) + 1) % 1 * NG) % NG;
          put(c.cells[1], g, 1, 1.2);
          if (kp > 0.06) { put(c.cells[0], g, kp * 0.85, 1.2); put(c.cells[2], g, kp * 0.5, 1.2); }
          if (sp > 0.1) put(c.cells[1], CREST, sp * 0.6, 1.2);
        }
      },
    },
    // Edge equalizer: the song's 16 bands as lattice bars growing in from all four edges, mirrored, with peak caps.
    v2: {
      mask: {
        in: (c, p) => { M.a = clamp((E.outCubic(p) * 1.08 - Math.abs(c.u - 0.5) * 2) / 0.08); }, // unfolds from the middle of each edge
        out: (c, q) => { M.a = clamp(q * DEPTH - c.d); }, // folds back into the edge
      },
      draw(T) {
        const now = OM.audio(T).bands, pk = new Float32Array(16), kp = pulse(KICK, T, 0.1);
        for (let k = 1; k <= 6; k++) { const b = OM.audio(T - k * 0.07).bands; for (let i = 0; i < 16; i++) pk[i] = Math.max(pk[i], b[i] * (1 - k * 0.05)); }
        for (const c of COLS) {
          const f = Math.abs(c.u - 0.5) * 32;
          if (f % 1 > 0.8) continue; // gap between bars
          const b = Math.min(15, Math.floor(f));
          const h = clamp(now[b] * 1.2 + (b < 3 ? kp * 0.2 : 0)) * DEPTH;
          for (let d = 0; d < Math.ceil(h); d++) put(c.cells[d], [MID, LIT, HOVER, CREST][d], Math.min(1, h - d));
          const pd = Math.min(DEPTH - 1, Math.floor(clamp(pk[b] * 1.2) * DEPTH));
          if (pd >= Math.ceil(h)) put(c.cells[pd], CREST, 0.6);
        }
      },
    },
    // Install progress: a package-manager bar fills round the frame a step per beat, a packet running down it each beat.
    p2: {
      mask: {
        in: (c, p) => { M.a = clamp((p * 1.1 - c.h) / 0.1); }, // pixel dissolve
        out: (c, q) => { const v = q * 1.1 - c.h2; M.a = clamp(v / 0.1); if (v > 0 && v < 0.1) M.k = CREST; }, // dissolves, each cell flashing as it goes
      },
      draw(T, ph, p, sec) {
        const b0 = beatPos(sec.a), nb = Math.max(1, Math.round(beatPos(sec.e) - b0)), bp = beatPos(T) - b0;
        const k = Math.floor(bp), fill = (NC * (k + E.outExpo(clamp((bp - k) / 0.3)))) / nb;
        const pk = (bp - k) * fill, kp = pulse(KICK, T, 0.12), bt = pulse(beats, T, 0.15);
        for (let i = 0; i < NC; i++) {
          const c = COLS[i];
          if (i < fill) {
            const hot = Math.abs(i - pk) < 6;
            put(c.cells[1], hot ? HOVER : LIT, 0.75 + 0.25 * kp); put(c.cells[2], hot ? HOVER : LIT, 0.75 + 0.25 * kp);
          } else if (i % 2 === 0) put(c.cells[2], DIM, 0.8);
        }
        const head = COLS[Math.min(NC - 1, Math.floor(fill))];
        for (let d = 0; d < DEPTH; d++) put(head.cells[d], CREST, 0.6 + 0.4 * bt);
      },
    },
    // Lattice marquee: theatre bulbs chasing round on 16ths, reversing every bar; kicks light every bulb.
    c2: {
      mask: {
        in: (c, p) => { M.a = clamp((E.outCubic(p) * 1.08 - c.r) / 0.08); }, // iris opens from the middle of the edges
        out: (c, q) => { M.a = clamp((c.r - (1 - q * 1.08)) / 0.08); }, // iris closes; the corners hold last
      },
      draw(T) {
        const bp = beatPos(T), step = Math.floor(bp * 4), dir = Math.floor(bp / 4) % 2 ? -1 : 1;
        const kp = pulse(KICK, T, 0.12), sp = pulse(SNARE, T, 0.1);
        for (let i = 0; i < NC; i++) {
          const c = COLS[i];
          put(c.cells[0], sp > 0.3 ? HOVER : MID, 0.35 + sp * 0.6); put(c.cells[3], sp > 0.3 ? HOVER : MID, 0.35 + sp * 0.6);
          const j = i >> 1, on = ((((j + dir * step) % 4) + 4) % 4) === 0; // 292 bulbs, so a period of 4 has no seam
          const a = on ? 1 : Math.max(0.8, kp);
          put(c.cells[1], on ? CREST : kp > 0.4 ? LIT : DIM, a); put(c.cells[2], on ? CREST : kp > 0.4 ? LIT : DIM, a);
        }
      },
    },
    // Voice wave: a line that rides round the frame half a cycle per beat, its height the vocal; snares send ripples.
    b: {
      draw(T, ph, p) {
        const bp = beatPos(T), A = OM.audio(T);
        let vox = 0;
        for (let k = 0; k < 5; k++) vox += (k ? OM.audio(T - k * 0.05) : A).vocal / 5; // smoothed over 0.2 s
        let amp = 0.3 + 0.7 * clamp(vox * 1.3), al = 1;
        if (ph === 'in') { amp *= E.outCubic(p); al = clamp(p * 3); } // swells up from a flat line
        if (ph === 'out') { amp *= clamp(p * 2 - 1); al = clamp(p * 2); } // flatlines, then fades
        const si = last(SNARE, T), rip = [];
        for (let j = si; j > si - 2 && j >= 0; j--) { const age = T - SNARE[j]; if (age < 1.2) rip.push([OM.hash(j, 5, 9) * P, age * 1500, (1 - age / 1.2) * amp]); }
        for (const c of COLS) {
          const phi = (c.s / 480) * 2 * Math.PI - bp * Math.PI;
          let y = Math.sin(phi) * amp;
          for (const [o, f, a] of rip) { let dd = Math.abs(c.s - o); dd = Math.min(dd, P - dd); y += a * Math.exp(-(((dd - f) / 90) ** 2)); }
          const lv = 1.5 + 1.5 * clamp(y, -1, 1), lv2 = 1.5 + 1.5 * Math.sin(phi * 0.5 + bp * 0.5 + 1.3) * amp * 0.6;
          for (let d = 0; d < DEPTH; d++) {
            const w = 1 - Math.abs(d - lv), w2 = 1 - Math.abs(d - lv2);
            if (w > 0) put(c.cells[d], w > 0.5 ? HOVER : LIT, w * al);
            else if (w2 > 0) put(c.cells[d], MID, w2 * 0.55 * al);
          }
        }
      },
    },
    // Tile shuffle: little Hyprland windows tiled round the edge re-tile on every kick; a snare moves the focus.
    x: {
      draw(T, ph, p, sec) {
        const n = 6 + Math.floor(clamp((T - sec.a) / (sec.e - sec.a)) * 8), ki = last(KICK, T);
        const blend = ki >= 0 ? E.outCubic(clamp((T - KICK[ki]) / 0.18)) : 1, focus = ((last(SNARE, T) % n) + n) % n;
        const kp = pulse(KICK, T, 0.1);
        const at = (k, i) => ({ s: OM.hash(k, 3, 17) * NC + i * (NC / n) + OM.hash(i, k, 19) * (NC / n - 13), len: 4 + Math.floor(OM.hash(i, k, 21) * 7) });
        for (let i = 0; i < n; i++) {
          const a = at(ki - 1, i), b = at(ki, i);
          let ds = (((b.s - a.s) % NC) + NC * 1.5) % NC - NC / 2; // shortest way round
          const s0 = a.s + ds * blend, len = Math.round(a.len + (b.len - a.len) * blend);
          let pi = 1, dx = 0, dy = 0;
          if (ph === 'in') pi = clamp(p * 1.6 - (i / n) * 0.6); // tiles drop in from outside, one after another
          if (ph === 'out') pi = clamp(p * 1.6 - ((n - 1 - i) / n) * 0.6); // tiles scatter along the edges
          if (pi <= 0) continue;
          for (let k = 0; k < len; k++) {
            const c = COLS[((Math.round(s0) + k) % NC + NC) % NC];
            if (ph === 'in') { const e = 1 - E.outBack(pi); dx = c.nx * e * B * 1.5; dy = c.ny * e * B * 1.5; }
            if (ph === 'out') { const e = E.inCubic(1 - pi) * 600 * (c.u < 0.5 ? -1 : 1); dx = c.tx * e; dy = c.ty * e; }
            const edge = k === 0 || k === len - 1, ink = i === focus ? HOVER : edge ? LIT : MID;
            const al = (i === focus ? 1 : edge ? 0.9 : 0.65) * (0.8 + 0.2 * kp) * clamp(pi * 4);
            put(c.cells[1], ink, al, 1, dx, dy); put(c.cells[2], ink, al, 1, dx, dy);
          }
        }
      },
    },
    // Shockwave crown (the biggest): kicks fire waves from the corners, snares from the middle of each edge,
    // hats sparkle, the whole band breathes on downbeats.
    c3: {
      inBeats: 4, outBeats: 4, fullIn: true,
      mask: {
        in: (c, p) => { M.a = clamp((p * 4 - c.side - 0.75) * 4); }, // one side lands per beat: top, right, bottom, left
        out: (c, q) => { M.a = clamp((q * 4 - c.side) * 4); }, // sides go in reverse order
      },
      draw(T) {
        const base = 0.35 + 0.35 * pulse(downs, T, 0.25), kp = pulse(KICK, T, 0.1), waves = [];
        const ki = last(KICK, T), si = last(SNARE, T);
        for (let j = ki; j > ki - 3 && j >= 0; j--) { const age = T - KICK[j]; if (age < 0.9) waves.push([0, age * 2600, (0.6 + KICK_E[j]) * (1 - age / 0.9)]); }
        for (let j = si; j > si - 2 && j >= 0; j--) { const age = T - SNARE[j]; if (age < 0.7) waves.push([1, age * 2200, 0.9 * (1 - age / 0.7)]); }
        const hi = last(HAT, T), hp = pulse(HAT, T, 0.06);
        for (const c of COLS) {
          let I = 0;
          for (const [mid, f, a] of waves) I += a * Math.exp(-((((mid ? c.dm : c.dc) - f) / 110) ** 2));
          if (hp > 0.1 && OM.hash(c.i, hi, 5) < 0.05) I += hp * 0.8;
          I = clamp(I + kp * 0.3);
          const fill = I * DEPTH, ink = I > 0.75 ? CREST : I > 0.5 ? HOVER : I > 0.25 ? LIT : MID;
          for (let d = 0; d < DEPTH; d++) put(c.cells[d], d < fill ? ink : d === 0 ? MID : DIM, d < fill ? Math.max(base, Math.min(1, fill - d)) : base);
        }
      },
    },
    // Corner brackets: four L brackets whose arms reach a little further every downbeat; a power light blinks the beat.
    o: {
      mask: {
        in: (c, p) => { M.a = OM.smooth(p); }, // breathes in
        out: (c, q) => { M.a = clamp((q * 1.05 - Math.abs(c.cx - W / 2) / (W / 2)) / 0.04); }, // CRT power-off: squeezes to the centre
      },
      draw(T, ph, p, sec) {
        const di = last(downs, T), dn = Math.max(0, di - last(downs, sec.a)), dt = di >= 0 ? T - downs[di] : 0;
        const arm = Math.min(34, 6 + 4 * Math.max(0, dn - 1) + 4 * E.outBack(clamp(dt / 0.25)));
        const bp = beatPos(T), breath = 0.6 + 0.4 * (0.5 + 0.5 * Math.cos((2 * Math.PI * (bp % 4)) / 4)), kp = pulse(KICK, T, 0.12);
        for (const c of COLS) {
          const k = c.dc / C;
          if (k >= arm) continue;
          put(c.cells[0], CREST, breath); put(c.cells[1], LIT, breath * 0.8);
          if (k > arm - 1.5 && kp > 0.1) { put(c.cells[2], CREST, kp); put(c.cells[3], HOVER, kp * 0.7); }
        }
        const on = bp - Math.floor(bp) < 0.5 ? 1 : 0.25;
        for (const i of [BOTTOM0 + NT / 2 - 1, BOTTOM0 + NT / 2]) { put(COLS[i].cells[1], CREST, on); put(COLS[i].cells[2], CREST, on); }
      },
    },
  };
  const SECTIONS = [
    ['intro', 0, 36.711], ['v1', 36.711, 72.95], ['p1', 72.95, 81.178], ['c1', 81.178, 115.33], ['v2', 115.33, 149.943], ['p2', 149.943, 157.971],
    ['c2', 157.971, 193.285], ['b', 193.285, 227.55], ['x', 227.55, 243.253], ['c3', 243.253, 280.8], ['o', 280.8, 299.947],
  ];

  // ---------- when: the on stretches, fixed once from the need data and the scene windows ----------
  let RUNS = null;
  function schedule() {
    const scenes = [...document.querySelectorAll('#root > section.scene')].map((el) => {
      const id = el.id.slice(2), a = +el.dataset.start, e = a + +el.dataset.duration;
      const o = N.overrides[id];
      return { a, e, on: (o ?? ((N.need[id] ?? 0) >= N.threshold ? 1 : 0)) > 0 };
    });
    const runs = [];
    for (const [sid, s0, s1] of SECTIONS) {
      const mine = [];
      let cur = null;
      for (const sc of scenes) {
        const a = Math.max(sc.a, s0), e = Math.min(sc.e, s1);
        if (e - a < 0.01) continue;
        if (!sc.on) { cur = null; continue; }
        if (cur && Math.abs(cur.e - a) < 0.01) cur.e = e;
        else mine.push((cur = { sid, a, e, sec: { a: s0, e: s1 } }));
      }
      // Hysteresis: an off gap under MIN_RUN is widened by trimming both neighbours, then short runs drop.
      for (let i = 1; i < mine.length; i++) {
        const gap = mine[i].a - mine[i - 1].e;
        if (gap < MIN_RUN) { const cut = (MIN_RUN - gap) / 2; mine[i - 1].e -= cut; mine[i].a += cut; }
      }
      runs.push(...mine.filter((r) => r.e - r.a >= MIN_RUN));
    }
    // Transitions snap to the corrected downbeats: the frame lands fully on one and starts leaving on one.
    for (const r of runs) {
      const I = IDEAS[r.sid], inDur = (I.inBeats || 2) * SPB, outDur = (I.outBeats || 2) * SPB;
      let dIn = first(downs, r.a + (I.fullIn ? inDur : 0.3));
      if (dIn === null || dIn > r.e - 0.6) dIn = first(beats, r.a + 0.3);
      if (dIn === null || dIn > r.e - 0.3) dIn = r.a + Math.min(0.3, (r.e - r.a) / 3);
      let dOut = lastAt(downs, r.e - 0.3);
      if (dOut === null || dOut <= dIn) dOut = lastAt(beats, r.e - 0.3);
      if (dOut === null || dOut < dIn) dOut = dIn;
      Object.assign(r, { inStart: Math.max(r.a, dIn - inDur), dIn, dOut, outEnd: Math.min(r.e, dOut + outDur) });
    }
    return runs;
  }
  /** The run live at T with its phase and visibility p (0 at both ends, so it never steps). */
  const runAt = (T) => {
    for (const r of RUNS) {
      if (T < r.inStart || T >= r.outEnd) continue;
      if (T < r.dIn) return [r, 'in', (T - r.inStart) / (r.dIn - r.inStart)];
      if (T < r.dOut) return [r, 'on', 1];
      return [r, 'out', 1 - (T - r.dOut) / (r.outEnd - r.dOut)];
    }
    return null;
  };

  // ---------- the layer ----------
  let cv = null, cnv = null;
  const render = (T) => {
    if (!RUNS) RUNS = OM.frames.runs = schedule();
    const hit = runAt(T);
    if (!hit) { if (cv) cv.style.display = 'none'; return; }
    if (!cv) {
      cv = document.createElement('canvas');
      cv.id = 'om-frames';
      cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;z-index:40;pointer-events:none;';
      (document.getElementById('root') || document.body).appendChild(cv);
      cnv = OM.canvas(cv);
    }
    cv.style.display = 'block';
    const ctx = cnv.ensure();
    ctx.clearRect(0, 0, W, B); ctx.clearRect(0, H - B, W, B); ctx.clearRect(0, B, B, H - 2 * B); ctx.clearRect(W - B, B, B, H - 2 * B);
    const [r, ph, p] = hit, I = IDEAS[r.sid];
    mask = I.mask && ph !== 'on' ? I.mask[ph] : null;
    prog = clamp(p);
    fade = ph === 'on' ? 1 : clamp(prog * 8);
    peak = Math.max(pulse(beats, T, 0.05), pulse(KICK, T, 0.05));
    gain = 0.6 + 0.4 * peak;
    for (const b of BUCKET) b.length = 0;
    I.draw(T, ph, prog, r.sec);
    mask = null;
    ctx.save();
    if (ph !== 'on') { // a transition may move cells; nothing leaves the band
      ctx.beginPath();
      ctx.rect(0, 0, W, B); ctx.rect(0, H - B, W, B); ctx.rect(0, B, B, H - 2 * B); ctx.rect(W - B, B, B, H - 2 * B);
      ctx.clip();
    }
    for (let k = 0; k < BUCKET.length; k++) {
      const q = BUCKET[k];
      if (!q.length) continue;
      ctx.fillStyle = FILL[k];
      ctx.beginPath();
      for (let j = 0; j < q.length; j += 3) ctx.rect(q[j], q[j + 1], q[j + 2], q[j + 2]);
      ctx.fill();
    }
    ctx.restore();
  };
  OM.frames = { render, runs: null }; // for timing and inspection
  const tick = OM.tick;
  OM.tick = (t) => {
    tick(t);
    render(t);
  };
})();
