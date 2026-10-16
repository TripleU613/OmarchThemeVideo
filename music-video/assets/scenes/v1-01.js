// v1-01 · Walled garden. A white hedge maze seen from above, in the rented
// world's White theme. The line's words are topiary: each is a solid hedge
// block in the maze until the one green cell (you) runs the corridors into
// the dead end beside it on the word's onset; the hedge is clipped away from
// the point of contact, leaving the word standing in the wall, and the dead
// end's padlock snaps shut. Every path ends at a lock. Then the camera rises
// (accel roll into the 41.517 kick): the maze shrinks into a laptop's display,
// the laptop lands round it on the kick and the maze fades to the bright screen
// that v1-02 opens on.
//
// Also defines OM.v1, the section's shared helpers (scene files load in
// timeline order, so v1-02..v1-08 use them).
OM.ownWords.add('v1-01');
(() => {
  // ---------- OM.v1: shared by the verse 1 scenes ----------
  const font = (w, px) => `${w} ${px.toFixed(2)}px 'JetBrains Mono'`;
  const m = document.createElement('canvas').getContext('2d');
  const metrics = (w) => {
    m.font = font(w, 100);
    return { adv: m.measureText('M').width / 100, cap: (m.measureText('H').actualBoundingBoxAscent || 73) / 100 };
  };
  const V = (OM.v1 = {
    HOLD: 0.08, // seconds of exact handoff at each cut
    font,
    /** Register a font weight as a build dependency; returns the probe font string. */
    ready(key, w) {
      const f = font(w, 100);
      window.__hf = window.__hf || {};
      window.__hf.buildReady = window.__hf.buildReady || {};
      window.__hf.buildReady[key] = document.fonts.load(f);
      return f;
    },
    metrics,
    /**
     * Lay a line's words out in balanced centred rows. Monospace, so widths are
     * char counts. Returns { size, A (advance), cap, rows, words: [{ k, text, row, x, w }] }.
     */
    layout(id, { weight = 800, cap = 72, maxW = 1500, upper = true } = {}) {
      const sung = OM.sung(id);
      const texts = sung.map((s) => (upper ? s.text.toUpperCase() : s.text));
      const mt = metrics(weight);
      const longest = Math.max(1, ...texts.map((t) => t.length));
      const size = Math.min(cap / mt.cap, maxW / (longest * mt.adv));
      const A = mt.adv * size;
      const wrap = (W) => {
        const rows = [];
        let row = [], n = 0;
        texts.forEach((t, k) => {
          const gap = row.length && sung[k].space ? 1 : 0;
          if (row.length && (n + gap + t.length) * A > W) { rows.push(row); row = []; n = 0; }
          n += (row.length && sung[k].space ? 1 : 0) + t.length;
          row.push(k);
        });
        if (row.length) rows.push(row);
        return rows;
      };
      let rows = wrap(maxW);
      for (let W = maxW - A; W >= longest * A; W -= A) {
        const r = wrap(W);
        if (r.length > rows.length) break;
        rows = r;
      }
      const words = [];
      rows.forEach((ks, r) => {
        let n = 0;
        ks.forEach((k, i) => (n += (i && sung[k].space ? 1 : 0) + texts[k].length));
        let x = 960 - (n * A) / 2;
        ks.forEach((k, i) => {
          if (i && sung[k].space) x += A;
          words[k] = { k, text: texts[k], row: r, x, w: texts[k].length * A };
          x += texts[k].length * A;
        });
      });
      return { size, A, cap: mt.cap * size, rows: rows.length, words, font: font(weight, size), weight };
    },
    /**
     * Rasterize a string into cells of lattice G {x0, y0, cw, ch}: [[col, row, letter]].
     * x is the text's left edge, base its baseline, A the advance (for letter index).
     */
    raster(str, fnt, size, x, base, G, A, cover = 0.42) {
      if (!str) return [];
      const S = 3;
      const c0 = Math.floor((x - size * 0.2 - G.x0) / G.cw), c1 = Math.ceil((x + str.length * A + size * 0.2 - G.x0) / G.cw);
      const r0 = Math.floor((base - size * 1.05 - G.y0) / G.ch), r1 = Math.ceil((base + size * 0.3 - G.y0) / G.ch);
      const cols = c1 - c0, rows = r1 - r0;
      const cnv = document.createElement('canvas');
      cnv.width = Math.ceil(cols * G.cw * S);
      cnv.height = Math.ceil(rows * G.ch * S);
      const g = cnv.getContext('2d', { willReadFrequently: true });
      g.setTransform(S, 0, 0, S, -(G.x0 + c0 * G.cw) * S, -(G.y0 + r0 * G.ch) * S);
      g.font = fnt;
      g.fillStyle = '#fff';
      g.fillText(str, x, base);
      const px = g.getImageData(0, 0, cnv.width, cnv.height).data;
      const out = [];
      for (let j = 0; j < rows; j++)
        for (let i = 0; i < cols; i++) {
          let sum = 0, cnt = 0;
          const ya = Math.floor(j * G.ch * S), yb = Math.min(cnv.height, Math.floor((j + 1) * G.ch * S));
          const xa = Math.floor(i * G.cw * S), xb = Math.min(cnv.width, Math.floor((i + 1) * G.cw * S));
          for (let yy = ya; yy < yb; yy++) for (let xx = xa; xx < xb; xx++) { sum += px[(yy * cnv.width + xx) * 4 + 3]; cnt++; }
          if (cnt && sum / cnt > cover * 255) {
            const cx = G.x0 + (c0 + i + 0.5) * G.cw;
            out.push([c0 + i, r0 + j, OM.clamp(Math.floor((cx - x) / A), 0, str.length - 1)]);
          }
        }
      return out;
    },
    /** A lazily built value that rebuilds once the font it needs turns up. */
    lazy(fnt, make) {
      let v = null, ok = false;
      return () => {
        if (!v || (!ok && document.fonts.check(fnt))) { ok = document.fonts.check(fnt); v = make(); }
        return v;
      };
    },
    rgba(hex, a) {
      const [r, g, b] = OM.rgb(hex);
      return `rgba(${r},${g},${b},${a})`;
    },
  });

  // The effects pass: each scene's shader through OM.post, at rest on the cut frames.
  V.post = (el, c, effect) => OM.post(el, c, { effect });
  V.env = (T, a, b, ramp = 0.35) => OM.post.envelope(T, a, b, { ramp, hold: 0.07 });
  /** GLSL: 1 outside the words' box (uP1, uv), 0 inside, so effects ease off the words. */
  V.TEXTMASK = `float offText(vec2 uv) { vec2 d = max(uP1.xy - uv, uv - uP1.zw); return smoothstep(0.0, 0.03, max(d.x, d.y)); }\n`;
  /** A CSS-px box as a uv rect (origin bottom-left) for uP1. */
  V.rect = (x0, y0, x1, y1) => [x0 / 1920, 1 - y1 / 1080, x1 / 1920, 1 - y0 / 1080];

  // ---------- match cuts ----------
  // Letter rain (v1-04 > v1-05): v1-04's green letters let go cell by cell and
  // fall as rain down v1-05's glass, turning from green to the rain's own ink.
  // Both scenes draw it, so the cut frame is one shared state.
  V.RAIN0 = 54.28;
  V.words04 = V.lazy(V.font(800, 100), () => {
    const HM = OM.HOME, G = { x0: HM.x0, y0: HM.y0, cw: HM.cw / 2, ch: HM.ch / 2 };
    const L = V.layout('v1-04', { weight: 800, cap: 124, maxW: 1760 });
    const lh = L.cap * 1.6;
    return L.words.map((wd) => {
      const base = 540 + (wd.row - (L.rows - 1) / 2) * lh + L.cap / 2;
      return { ...wd, base, cap: L.cap, G, cells: V.raster(wd.text, L.font, L.size, wd.x, base, G, L.A), cx: wd.x + wd.w / 2, cy: base - L.cap / 2 };
    });
  });
  V.band04 = (wd, r, ink) => {
    const f = (wd.G.y0 + (r + 0.5) * wd.G.ch - (wd.base - wd.cap)) / wd.cap;
    return f < 0.34 ? ink.crest : f < 0.67 ? ink.hover : ink.lit;
  };
  V.letterRain = (ctx, T, dpr) => {
    const ink = OM.fieldInks('tokyo-night'), th = OM.theme('tokyo-night');
    for (const wd of V.words04()) {
      const G = wd.G;
      for (const [q, r] of wd.cells) {
        const a = T - (V.RAIN0 + 0.14 * OM.hash(q, 7, 404));
        if (a <= 0) {
          ctx.fillStyle = V.band04(wd, r, ink);
          OM.cell(ctx, G, q, r, dpr);
          continue;
        }
        const y = G.y0 + r * G.ch + 2100 * a * a;
        if (y > 1110) continue;
        const tail = Math.min(80, 4200 * a * 0.02), w = OM.lerp(G.cw, 2.5, OM.clamp(a / 0.22));
        ctx.fillStyle = a < 0.12 ? V.band04(wd, r, ink) : th.text;
        ctx.fillRect(G.x0 + (q + 0.5) * G.cw - w / 2, y - tail, w, G.ch + tail);
      }
    }
  };
  // Lamp to mark (v1-07 > v1-08): the copier's lamp row bends into a ring and
  // squares up into the outline of the square-spiral mark at the print's core.
  V.BEND0 = 66.82;
  V.BEND1 = 67.3;
  V.SQ1 = 67.5;
  V.lampRing = (ctx, T, surge = 0) => {
    const ink = OM.fieldInks('tokyo-night'), HM = OM.HOME, hc = OM.cellAt(HM, 960, 540);
    const LX = HM.x0 + (hc.col + 0.5) * HM.cw, LY = HM.y0 + (hc.row + 0.5) * HM.ch;
    const f = OM.ease.inOutCubic(OM.prog(T, V.BEND0, V.BEND1)), g = OM.smooth(OM.prog(T, V.BEND1, V.SQ1));
    const halo = 0.18 * f * (1 - g) + surge;
    if (halo > 0.003) {
      const gr = ctx.createRadialGradient(LX, LY, 40, LX, LY, 220);
      gr.addColorStop(0, V.rgba(ink.lit, halo));
      gr.addColorStop(1, V.rgba(ink.lit, 0));
      ctx.fillStyle = gr;
      ctx.fillRect(LX - 220, LY - 220, 440, 440);
    }
    const N = 140, R = 112, SQ = 60, sz = OM.lerp(HM.cw, 8, f);
    ctx.fillStyle = ink.crest;
    for (let i = 0; i < N; i++) {
      const th = Math.PI + (2 * Math.PI * i) / N, c = Math.cos(th), s = Math.sin(th), m = Math.max(Math.abs(c), Math.abs(s));
      const lx = LX + (i / (N - 1) - 0.5) * 2000, cx = LX + R * c, cy = LY + R * s;
      const x = OM.lerp(OM.lerp(lx, cx, f), LX + (SQ * c) / m, g), y = OM.lerp(OM.lerp(LY, cy, f), LY + (SQ * s) / m, g);
      ctx.fillRect(x - sz / 2, y - sz / 2, sz, sz);
    }
  };

  // ---------- the laptop: v1-01's last frame and v1-02's first ----------
  // A thin silver unibody laptop: black bezel with a notch, rounded lid, hinge,
  // black keys, a wide trackpad. Blank lid side never shown, no marks, no names.
  const W = OM.theme('white'), WI = OM.fieldInks('white');
  const LAP = { x: 440, y: 150, w: 1040, h: 650 }; // the display
  const LCY = LAP.y + LAP.h / 2;
  V.LAP = LAP;
  V.LCY = LCY;
  const at = (ctx, dy, k) => {
    ctx.translate(960, LCY + dy);
    ctx.scale(k, k);
    ctx.translate(-960, -LCY);
  };
  const rrect = (ctx, x, y, w, h, r) => {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
  };
  const B = 22, RIM = 6;
  const LID = { x: LAP.x - B - RIM, y: LAP.y - B - RIM, w: LAP.w + 2 * (B + RIM), h: LAP.h + 2 * (B + RIM) };
  const DTOP = LID.y + LID.h + 6, DFRONT = DTOP + 150;
  V.LID = LID;
  V.DECK = { top: DTOP, front: DFRONT, half0: 575, half1: 660 };
  /** The body: shadow, deck with keyboard and trackpad, hinge, the lid's rim and bezel (display left empty). */
  V.laptop = (ctx, dy = 0, k = 1, alpha = 1) => {
    ctx.save();
    ctx.globalAlpha = alpha;
    at(ctx, dy, k);
    const cx = 960;
    const sh = ctx.createRadialGradient(cx, DFRONT + 30, 0, cx, DFRONT + 30, 760);
    sh.addColorStop(0, V.rgba(W['field-crest'], 0.16));
    sh.addColorStop(1, V.rgba(W['field-crest'], 0));
    ctx.save();
    ctx.translate(0, DFRONT + 30);
    ctx.scale(1, 0.05);
    ctx.translate(0, -(DFRONT + 30));
    ctx.fillStyle = sh;
    ctx.fillRect(cx - 760, DFRONT + 30 - 760, 1520, 1520);
    ctx.restore();
    // The deck, seen from above the front.
    const dg = ctx.createLinearGradient(0, DTOP, 0, DFRONT);
    dg.addColorStop(0, W['border-subtle']);
    dg.addColorStop(1, W['surface-2']);
    ctx.fillStyle = dg;
    ctx.beginPath();
    ctx.moveTo(cx - 575, DTOP);
    ctx.lineTo(cx + 575, DTOP);
    ctx.lineTo(cx + 660, DFRONT);
    ctx.lineTo(cx - 660, DFRONT);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = W['border-strong'];
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = W['border-strong'];
    rrect(ctx, cx - 660, DFRONT, 1320, 12, [0, 0, 10, 10]);
    ctx.fill();
    ctx.fillStyle = WI.mid;
    rrect(ctx, cx - 70, DFRONT, 140, 5, [0, 0, 4, 4]);
    ctx.fill();
    // The keyboard: black keys in six rows, a wide space bar on the last.
    const half = (y) => OM.lerp(575, 660, (y - DTOP) / 150) * 0.8;
    ctx.fillStyle = W.text;
    for (let i = 0; i < 6; i++) {
      const y = DTOP + 12 + i * 14, hw = half(y + 6), x0 = cx - hw, span = 2 * hw;
      const keys = i === 0 ? Array(16).fill(1) : i === 5 ? [1, 1, 1, 1.3, 5.6, 1.3, 1, 1, 1] : Array(14).fill(1);
      const tot = keys.reduce((a, b) => a + b, 0);
      let x = x0;
      for (const kw of keys) {
        const w = (kw / tot) * span;
        rrect(ctx, x + 2, y, w - 4, i === 0 ? 7 : 10, 2);
        ctx.fill();
        x += w;
      }
    }
    // The wide trackpad.
    ctx.fillStyle = W['border-subtle'];
    ctx.strokeStyle = W['border-strong'];
    ctx.beginPath();
    ctx.moveTo(cx - 215, DTOP + 100);
    ctx.lineTo(cx + 215, DTOP + 100);
    ctx.lineTo(cx + 228, DTOP + 140);
    ctx.lineTo(cx - 228, DTOP + 140);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // The hinge, then the lid: an aluminium rim round a black bezel.
    ctx.fillStyle = W['text-secondary'];
    rrect(ctx, cx - 540, LID.y + LID.h - 4, 1080, 12, 4);
    ctx.fill();
    const lg = ctx.createLinearGradient(0, LID.y, 0, LID.y + LID.h);
    lg.addColorStop(0, W['border-subtle']);
    lg.addColorStop(1, WI.dim);
    ctx.fillStyle = lg;
    rrect(ctx, LID.x, LID.y, LID.w, LID.h, 30);
    ctx.fill();
    ctx.fillStyle = W.text;
    rrect(ctx, LID.x + RIM, LID.y + RIM, LID.w - 2 * RIM, LID.h - 2 * RIM, 24);
    ctx.fill();
    ctx.restore();
  };
  /** The display's own content: a soft, bright, empty screen. */
  V.desk = (ctx, dy = 0, k = 1, alpha = 1) => {
    ctx.save();
    ctx.globalAlpha = alpha;
    at(ctx, dy, k);
    const g = ctx.createRadialGradient(960, LCY - 120, 60, 960, LCY, 720);
    g.addColorStop(0, W.bg);
    g.addColorStop(1, W['border-subtle']);
    ctx.fillStyle = g;
    ctx.fillRect(LAP.x, LAP.y, LAP.w, LAP.h);
    ctx.restore();
  };
  /** The notch, over the top of the display. */
  V.notch = (ctx, dy = 0, k = 1, alpha = 1) => {
    ctx.save();
    ctx.globalAlpha = alpha;
    at(ctx, dy, k);
    ctx.fillStyle = W.text;
    rrect(ctx, 960 - 88, LAP.y - 2, 176, 32, [0, 0, 14, 14]);
    ctx.fill();
    ctx.fillStyle = WI.hover;
    ctx.beginPath();
    ctx.arc(960, LAP.y + 12, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };
  /** The cut frame: white page, the laptop, its screen bright and empty. */
  V.laptopFrame = (ctx) => {
    ctx.fillStyle = W.bg;
    ctx.fillRect(0, 0, 1920, 1080);
    V.laptop(ctx);
    V.desk(ctx);
    V.notch(ctx);
  };

  // ---------- v1-01 ----------
  const WEIGHT = 800;
  const PROBE = V.ready('v1-01-type', WEIGHT);
  const GLSL = V.TEXTMASK + `
vec4 effect(vec2 uv) {
  vec2 u = cam(uv);
  float b = smoothstep(0.17, 0.47, abs(uv.y - 0.5)) * uAmount; // tilt-shift: sharp band across the middle
  if (b <= 0.0) return src(u);
  vec2 px = b * 9.0 / vec2(1920.0, 1080.0);
  vec4 s = vec4(0.0);
  for (int i = -2; i <= 2; i++) for (int j = -2; j <= 2; j++) s += src(u + vec2(float(i), float(j)) * px);
  return s / 25.0;
}`;
  OM.scene({
    id: 'v1-01',
    build(el, { start, duration }) {
      const cv = document.createElement('canvas');
      cv.className = 'om-fill';
      el.appendChild(cv);
      const c = OM.canvas(cv, { alpha: false });
      const fx = V.post(el, c, GLSL);
      const END = start + duration, H = V.HOLD;
      const on = OM.sung('v1-01').map((w) => w.t0);
      const N = on.length;
      const GREEN = OM.fieldInks('tokyo-night');
      const RISE0 = 41.1, KICK = 41.517, SETTLE = 41.82;

      // The maze: coarse cells of 32px (24px path + 8px wall) on an 8px fine lattice.
      const NI = 59, NJ = 33, U = 32, F = 8;
      const X0 = (1920 - (NI * U + F)) / 2, Y0 = (1080 - (NJ * U + F)) / 2;
      const G = { x0: X0, y0: Y0, cw: F, ch: F };
      const id = (i, j) => j * NI + i;

      const build = () => {
        const lay = V.layout('v1-01', { weight: WEIGHT, cap: 72, maxW: 1560 });
        const j0 = Math.round(NJ / 2 - (lay.rows * 5 - 2) / 2);
        const room = new Int16Array(NI * NJ).fill(-1);
        const rooms = lay.words.filter((wd) => wd.text).map((wd) => { // a token with no text gets no room
          const cj0 = j0 + wd.row * 5, cj1 = cj0 + 2;
          const ci0 = Math.max(1, Math.floor((wd.x - 10 - X0) / U)), ci1 = Math.min(NI - 2, Math.floor((wd.x + wd.w + 10 - X0) / U));
          // Letters centred in the room's interior (fine rows 4*cj0+1 .. 4*cj1+3).
          const top = Y0 + (4 * cj0 + 1) * F, bot = Y0 + (4 * cj1 + 4) * F;
          const base = (top + bot) / 2 + lay.cap / 2;
          for (let j = cj0; j <= cj1; j++) for (let i = ci0; i <= ci1; i++) room[id(i, j)] = wd.k;
          const cells = V.raster(wd.text, lay.font, lay.size, wd.x, base, G, lay.A);
          const mid = Math.round((ci0 + ci1) / 2);
          return { ...wd, ci0, ci1, cj0, cj1, cells, mid, letter: new Set(cells.map(([a, b]) => a * 4096 + b)) };
        });
        // Dead ends: the cell under each room's middle, a leaf joined to the cell below it.
        const dead = rooms.map((r) => ({ i: r.mid, j: r.cj1 + 1, pi: r.mid, pj: r.cj1 + 2 }));
        const isDead = new Uint8Array(NI * NJ);
        for (const d of dead) isDead[id(d.i, d.j)] = 1;
        // Passages: right[i,j] opens (i,j)-(i+1,j); down[i,j] opens (i,j)-(i,j+1). Recursive backtracker.
        const right = new Uint8Array(NI * NJ), down = new Uint8Array(NI * NJ), seen = new Uint8Array(NI * NJ);
        const rng = OM.rng(0x7101);
        const free = (i, j) => i >= 0 && j >= 0 && i < NI && j < NJ && room[id(i, j)] < 0 && !isDead[id(i, j)];
        const open = (a, b, c2, d2) => { if (c2 > a) right[id(a, b)] = 1; else if (c2 < a) right[id(c2, d2)] = 1; else if (d2 > b) down[id(a, b)] = 1; else down[id(c2, d2)] = 1; };
        const stack = [[0, Math.floor(NJ / 2)]];
        seen[id(0, Math.floor(NJ / 2))] = 1;
        while (stack.length) {
          const [i, j] = stack[stack.length - 1];
          const nb = [[i + 1, j], [i - 1, j], [i, j + 1], [i, j - 1]].filter(([a, b]) => free(a, b) && !seen[id(a, b)]);
          if (!nb.length) { stack.pop(); continue; }
          const [a, b] = nb[Math.floor(rng() * nb.length)];
          seen[id(a, b)] = 1;
          open(i, j, a, b);
          stack.push([a, b]);
        }
        // A few loops so the runs between dead ends stay short.
        for (let j = 0; j < NJ; j++)
          for (let i = 0; i < NI; i++) {
            if (!free(i, j)) continue;
            if (free(i + 1, j) && OM.hash(i, j, 3) < 0.12) right[id(i, j)] = 1;
            if (free(i, j + 1) && OM.hash(i, j, 4) < 0.12) down[id(i, j)] = 1;
          }
        for (const d of dead) open(d.i, d.j, d.pi, d.pj);
        // BFS path between two cells, as cell centres.
        const nbs = (i, j) => {
          const out = [];
          if (i < NI - 1 && right[id(i, j)]) out.push([i + 1, j]);
          if (i > 0 && right[id(i - 1, j)]) out.push([i - 1, j]);
          if (j < NJ - 1 && down[id(i, j)]) out.push([i, j + 1]);
          if (j > 0 && down[id(i, j - 1)]) out.push([i, j - 1]);
          return out;
        };
        const path = (a, b) => {
          const prev = new Int32Array(NI * NJ).fill(-2);
          prev[id(a[0], a[1])] = -1;
          const q = [a];
          for (let h = 0; h < q.length; h++) {
            const [i, j] = q[h];
            if (i === b[0] && j === b[1]) break;
            for (const [x, y] of nbs(i, j)) if (prev[id(x, y)] === -2) { prev[id(x, y)] = id(i, j); q.push([x, y]); }
          }
          const out = [];
          let k = id(b[0], b[1]);
          if (prev[k] === -2) return [a, b];
          while (k >= 0) { out.push([k % NI, (k / NI) | 0]); k = prev[k]; }
          return out.reverse();
        };
        const cxy = ([i, j]) => [X0 + i * U + F + 12, Y0 + j * U + F + 12];
        const entry = [0, Math.floor(NJ / 2)];
        const legs = dead.map((d, k) => path(k ? [dead[k - 1].i, dead[k - 1].j] : entry, [d.i, d.j]).map(cxy));
        // The walls, painted once per resolution.
        let img = null, imgDpr = 0;
        const walls = (dpr) => {
          if (img && imgDpr === dpr) return img;
          img = document.createElement('canvas');
          img.width = Math.round(1920 * dpr);
          img.height = Math.round(1080 * dpr);
          const g = img.getContext('2d');
          g.setTransform(dpr, 0, 0, dpr, 0, 0);
          g.fillStyle = W.bg;
          g.fillRect(0, 0, 1920, 1080);
          g.fillStyle = W['border-strong'];
          const rm = (i, j) => (i < 0 || j < 0 || i >= NI || j >= NJ ? -2 : room[id(i, j)]);
          for (let j = -1; j < NJ; j++)
            for (let i = -1; i < NI; i++) {
              const fx = 4 * (i + 1), fy = 4 * (j + 1);
              // The post at the corner below-right of (i, j), unless it sits inside one room.
              const r4 = [rm(i, j), rm(i + 1, j), rm(i, j + 1), rm(i + 1, j + 1)];
              if (!(r4[0] >= 0 && r4.every((v) => v === r4[0]))) OM.cell(g, G, fx, fy, dpr);
              const inside = i >= 0 && j >= 0;
              // Right wall of (i, j), rows fy-3..fy-1.
              if (j >= 0 && !(inside && i < NI - 1 && right[id(i, j)]) && !(rm(i, j) >= 0 && rm(i, j) === rm(i + 1, j)))
                for (let s = 1; s <= 3; s++) OM.cell(g, G, fx, fy - 4 + s, dpr);
              // Bottom wall of (i, j), cols fx-3..fx-1.
              if (i >= 0 && !(inside && j < NJ - 1 && down[id(i, j)]) && !(rm(i, j) >= 0 && rm(i, j) === rm(i, j + 1)))
                for (let s = 1; s <= 3; s++) OM.cell(g, G, fx - 4 + s, fy, dpr);
            }
          imgDpr = dpr;
          return img;
        };
        return { rooms, dead, legs, walls, ons: rooms.map((r) => on[r.k]) };
      };
      const get = V.lazy(PROBE, build);

      // Where the green cell is at T: running leg k into dead end k, arriving on onset k.
      const BUMP = 0.07;
      const along = (pts, u) => {
        const n = pts.length - 1;
        if (n <= 0) return pts[0];
        const f = OM.clamp(u) * n, a = Math.min(n - 1, Math.floor(f)), s = f - a;
        return [OM.lerp(pts[a][0], pts[a + 1][0], s), OM.lerp(pts[a][1], pts[a + 1][1], s)];
      };
      const you = (M, T) => {
        const on = M.ons, N = on.length;
        let k = 0;
        while (k < N - 1 && T >= on[k] + BUMP) k++;
        if (T >= on[N - 1]) k = N - 1;
        const t0 = k ? on[k - 1] + BUMP : start + 0.12;
        const u = T >= on[k] ? 1 : OM.ease.inOutCubic(OM.prog(T, t0, on[k]));
        return along(M.legs[k], u);
      };
      const lock = (ctx, x, y, shut, s = 3) => {
        const SH = ['..###..', '.#...#.', '.#...#.', '.#...#.'], BD = ['#######', '###.###', '###.###', '#######'];
        const lift = shut ? 0 : 2;
        SH.forEach((row, r) => { for (let q = 0; q < 7; q++) if (row[q] === '#') ctx.fillRect(x + (q - 3.5) * s, y + (r - 8 - lift) * s, s, s); });
        BD.forEach((row, r) => { for (let q = 0; q < 7; q++) if (row[q] === '#') ctx.fillRect(x + (q - 3.5) * s, y + (r - 4) * s, s, s); });
      };

      // Camera: dive in to 1.25 off the white page, then crane up to 1.0 across the line; a shake as each lock snaps.
      const FXP = (ctx, dpr, T) => {
        const e = V.env(T, start, END);
        const M = get();
        const dive = OM.smooth(OM.prog(T, start + 0.07, start + 0.5)), pull = OM.ease.inOutCubic(OM.prog(T, 37.3, 41.1));
        let sh = 0;
        for (const t0 of M.ons) if (T >= t0) sh += 6 * Math.exp(-(T - t0) / 0.06);
        return { amount: e, cam: { zoom: 1 + 0.25 * dive * (1 - pull), x: sh * Math.sin(T * 93), y: sh * Math.cos(T * 71) } };
      };
      return {
        render(t, T) {
          this.draw(t, T);
          fx.apply(T, FXP(c.ensure(), c.dpr, T));
        },
        draw(t, T) {
          const ctx = c.ensure();
          const dpr = c.dpr;
          if (T < start + H) return OM.handoff('white', ctx, T, dpr);
          if (T >= END - H || T >= SETTLE) return V.laptopFrame(ctx);
          const M = get();
          // Camera: the rise from the whole maze into the phone's screen.
          const rz = OM.ease.inOutCubic(OM.prog(T, RISE0, KICK));
          const z = OM.lerp(1, V.LAP.w / 1904, rz);
          ctx.fillStyle = W.bg;
          ctx.fillRect(0, 0, 1920, 1080);
          ctx.save();
          ctx.translate(960, OM.lerp(540, V.LCY, rz)); // the maze lands in the display
          ctx.scale(z, z);
          ctx.translate(-960, -540);
          // The maze draws in from the white page in the dither order.
          const grow = OM.prog(T, start + H, start + 0.26);
          ctx.globalAlpha = grow;
          ctx.drawImage(M.walls(dpr), 0, 0, 1920, 1080);
          ctx.globalAlpha = 1;
          const back = OM.prog(T, 41.0, 41.3); // the words grow back into hedge before the rise
          // The rooms: hedge blocks, clipped back to their word from the point of contact.
          for (const r of M.rooms) {
            const x0 = X0 + (4 * r.ci0 + 1) * F, y0 = Y0 + (4 * r.cj0 + 1) * F;
            const x1 = X0 + (4 * r.ci1 + 4) * F, y1 = Y0 + (4 * r.cj1 + 4) * F;
            const age = T - on[r.k];
            ctx.fillStyle = WI.dim;
            if (age < 0 || back >= 1) {
              ctx.globalAlpha = grow;
              ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
              ctx.globalAlpha = 1;
              continue;
            }
            const cx = X0 + r.mid * U + F + 12, cy = y1;
            const reach = Math.hypot(x1 - x0, y1 - y0) * OM.ease.outExpo(OM.clamp(age / 0.22));
            for (let fy = 4 * r.cj0 + 1; fy <= 4 * r.cj1 + 3; fy++)
              for (let fx = 4 * r.ci0 + 1; fx <= 4 * r.ci1 + 3; fx++) {
                const px = X0 + (fx + 0.5) * F, py = Y0 + (fy + 0.5) * F;
                const th = OM.threshold(fx, fy);
                const cut = Math.hypot(px - cx, py - cy) < reach * (0.75 + 0.25 * th) && th >= back;
                const isL = r.letter.has(fx * 4096 + fy);
                if (cut && !isL) continue;
                ctx.fillStyle = !cut ? WI.dim : age < 0.12 && th > age / 0.12 ? GREEN.lit : W.text;
                OM.cell(ctx, G, fx, fy, dpr);
              }
          }
          // The locks on the dead ends, open until you hit them.
          for (const d of M.dead) {
            const k = M.rooms[M.dead.indexOf(d)].k;
            const x = X0 + d.i * U + F + 12, y = Y0 + d.j * U + F - 2; // on the gate, between the dead end and its word
            const shut = T >= on[k];
            ctx.fillStyle = shut ? (T - on[k] < 0.1 ? GREEN.mid : W.text) : WI.lit;
            ctx.globalAlpha = grow;
            lock(ctx, x, y, shut);
            ctx.globalAlpha = 1;
          }
          // You: the green cell, with a short trail while it runs.
          for (let s = 7; s >= 0; s--) {
            const [x, y] = you(M, T - s * 0.014);
            const k = OM.hitCount(M.ons, T);
            const bump = k && T - M.ons[k - 1] < BUMP ? Math.sin(((T - M.ons[k - 1]) / BUMP) * Math.PI) * 6 : 0;
            ctx.globalAlpha = (s ? 0.5 * (1 - s / 8) : 1) * OM.prog(T, start + H, start + 0.2);
            ctx.fillStyle = s ? GREEN.lit : GREEN.mid;
            ctx.fillRect(x - 12, y - 12 - bump, 24, 24);
            if (!s) { ctx.fillStyle = GREEN.lit; ctx.fillRect(x - 8, y - 8 - bump, 16, 16); }
          }
          ctx.globalAlpha = 1;
          ctx.restore();
          // The laptop lands round the maze on the kick; the maze fades into its bright, empty screen.
          if (T >= KICK - 0.02) {
            const p = OM.ease.outExpo(OM.prog(T, KICK - 0.02, KICK + 0.16));
            const Lp = V.LAP;
            ctx.save();
            ctx.beginPath();
            ctx.rect(0, 0, 1920, 1080);
            ctx.rect(Lp.x, Lp.y, Lp.w, Lp.h);
            ctx.clip('evenodd');
            ctx.fillStyle = W.bg;
            ctx.globalAlpha = OM.clamp(p * 2);
            ctx.fillRect(0, 0, 1920, 1080);
            ctx.globalAlpha = 1;
            V.laptop(ctx, 0, OM.lerp(1.12, 1, p), OM.clamp(p * 2));
            ctx.restore();
            V.desk(ctx, 0, 1, OM.smooth(OM.prog(T, KICK + 0.02, SETTLE - 0.04)));
            V.notch(ctx, 0, 1, OM.clamp(p * 2));
          }
        },
        release: () => {
          fx.release();
          c.release();
        },
      };
    },
  });
})();
