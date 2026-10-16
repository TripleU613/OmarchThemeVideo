// c1-01 · Kintsugi, mended with light. A dark-glazed bowl stands on the night,
// rim-lit green. Its cracks are the line's own letterforms, set into the glaze
// as thin fractures on a third-size home lattice (3x3 of its cells make one
// home cell). The spark from the cut is the bowl's impact point: on each word's
// onset that word's crack opens and green light runs out of the spark along its
// strokes, crest cooling to lit, so the word is repaired as it is sung. The key
// word is the fracture across the whole bowl: it flashes rim to rim on the
// downbeat and fills from the centre out across its hold. The mended seams
// pulse on the snares, then the glaze burns away outward from them into the
// back light it stood in, the seams follow, and what is left is the glow.
OM.ownWords.add('c1-01');
(() => {
  const W_ROW = 300, W_KEY = 200; // crack stroke weights: thin enough to read as fractures on the sub-lattice
  const fontAt = (w, px) => `${w} ${px}px 'JetBrains Mono'`;
  window.__hf = window.__hf || {};
  window.__hf.buildReady = window.__hf.buildReady || {};
  window.__hf.buildReady['c1-01-type'] = document.fonts.load(fontAt(W_ROW, 100));

  const rgba = (hex, a) => {
    const [r, g, b] = OM.rgb(hex);
    return `rgba(${r},${g},${b},${a})`;
  };
  /** handoff.js's soft pool of light (round). */
  const pool = (ctx, x, y, r, hex, a) => {
    if (a <= 0.002) return;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, rgba(hex, a));
    g.addColorStop(1, rgba(hex, 0));
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
  };
  const packRGB = (r, g, b) => (255 << 24) | (b << 16) | (g << 8) | r;
  const pack = (hex) => packRGB(...OM.rgb(hex));
  /** Inverse of the power-out ease 1-(1-x)^p: when, through its flood, the front reaches fraction y. */
  const outInv = (y, p) => 1 - Math.pow(1 - OM.clamp(y), 1 / p);
  const sm = (T, a, b) => OM.smooth(OM.prog(T, a, b));
  const decay = (T, t0, half) => (T < t0 ? 0 : Math.pow(0.5, (T - t0) / half));

  OM.scene({
    id: 'c1-01',
    build(el, { start, duration }) {
      const cv = document.createElement('canvas');
      cv.className = 'om-fill';
      el.appendChild(cv);
      const c = OM.canvas(cv, { alpha: false });
      const END = start + duration;
      const ink = OM.fieldInks('tokyo-night');
      const tk = OM.theme('tokyo-night');
      const words = OM.sung('c1-01');
      const on = words.map((w) => w.t0);
      const K = words.length - 1; // the key word: the fracture across the whole bowl
      const LAND = on[K]; // on the 82.338 downbeat
      const SNARES = [83.48, 83.73, 83.89, 84.06];
      const FILL = 83.36; // the hi-hat fill rising into the next line
      const SURGE = OM.downbeatsIn(84.3, 84.7)[0] || 84.497; // with the 84.52 kick

      // ---- the grid: a third-size home lattice, so the spark cell is exactly a 3x3 block ----
      const HM = OM.HOME, S = 3;
      const L = { x0: HM.x0, y0: HM.y0, cw: HM.cw / S, ch: HM.ch / S };
      const C0 = -Math.ceil(L.x0 / L.cw) - 1, R0 = -Math.ceil(L.y0 / L.ch) - 1;
      const GW = Math.ceil((1920 - L.x0) / L.cw) - C0 + 1, GH = Math.ceil((1080 - L.y0) / L.ch) - R0 + 1, N = GW * GH;
      const X = (i) => L.x0 + (i + C0 + 0.5) * L.cw, Y = (j) => L.y0 + (j + R0 + 0.5) * L.ch;
      const I = (x) => Math.floor((x - L.x0) / L.cw) - C0, J = (y) => Math.floor((y - L.y0) / L.ch) - R0;
      const sp = OM.cellAt(HM, 960, 540);
      const hubX = HM.x0 + (sp.col + 0.5) * HM.cw, hubY = HM.y0 + (sp.row + 0.5) * HM.ch;
      const hubI = sp.col * S + 1 - C0, hubJ = sp.row * S + 1 - R0, HUB = hubJ * GW + hubI;
      const hub = [];
      for (let b = -1; b <= 1; b++) for (let a = -1; a <= 1; a++) hub.push(HUB + b * GW + a);

      const NB4 = [1, -1, GW, -GW], NB8 = [1, -1, GW, -GW, GW + 1, GW - 1, 1 - GW, -1 - GW];
      /** Grid BFS from seeds through cells where pass(idx): hop counts (-1 unreached), and optionally each cell's seed. */
      const bfs = (seeds, pass, nb, from = null) => {
        const d = new Int16Array(N).fill(-1), q = new Int32Array(N);
        let h = 0, n = 0;
        for (const s of seeds) if (d[s] < 0) { d[s] = 0; q[n++] = s; if (from) from[s] = s; }
        while (h < n) {
          const a = q[h++], ai = a % GW;
          for (const o of nb) {
            const b = a + o;
            if (b < 0 || b >= N || d[b] >= 0 || Math.abs((b % GW) - ai) > 1 || !pass(b)) continue;
            d[b] = d[a] + 1;
            if (from) from[b] = from[a];
            q[n++] = b;
          }
        }
        return d;
      };

      // ---- the bowl: side view, a squircle body under an elliptical mouth, a square foot ring ----
      const BX = 960, RIM = 300, RX = 700, RY = 52, BASE = 800, RF = 270, FOOT = 215, FOOT_B = 836, TOP = RIM - RY;
      const half = (y) => RF + (RX - RF) * Math.pow(1 - Math.pow(OM.clamp((y - RIM) / (BASE - RIM)), 2.6), 1 / 2.6);
      const region = new Uint8Array(N); // 0 night, 1 the inside seen through the mouth, 2 the outer face
      for (let j = 0; j < GH; j++)
        for (let i = 0; i < GW; i++) {
          const x = X(i), y = Y(j), dx = x - BX;
          if ((dx / RX) ** 2 + ((y - RIM) / RY) ** 2 <= 1) region[j * GW + i] = 1;
          else if ((y >= RIM && y <= BASE && Math.abs(dx) <= half(y)) || (y > BASE && y <= FOOT_B && Math.abs(dx) <= FOOT)) region[j * GW + i] = 2;
        }
      const night = [], inside = [];
      for (let idx = 0; idx < N; idx++) (region[idx] ? region[idx] === 1 && inside.push(idx) : night.push(idx));
      const dIn = bfs(night, (b) => region[b] > 0, NB4); // 1 on the silhouette's edge
      const dLip = bfs(inside, (b) => region[b] === 2, NB4); // 1 on the front lip
      const bList = [];
      for (let idx = 0; idx < N; idx++) if (region[idx]) bList.push(idx);
      const BN = bList.length, bIdx = Int32Array.from(bList);
      const bR = new Uint8Array(BN), bG = new Uint8Array(BN), bB = new Uint8Array(BN);
      const bEdge = new Float32Array(BN), bTh = new Float32Array(BN), bIn = new Uint8Array(BN), bKey = new Float32Array(BN);
      const GLAZE = [tk['bg-deep'], tk.bg, tk.surface, tk['surface-2']].map(OM.rgb);
      const INNER = [ink.bg, tk['bg-deep']].map(OM.rgb), LIP = OM.rgb(tk['border-strong']);
      bList.forEach((idx, q) => {
        const i = idx % GW, j = (idx / GW) | 0, x = X(i), y = Y(j);
        const tq = OM.threshold(i + C0, j + R0), s = OM.clamp((y - TOP) / (FOOT_B - TOP));
        bTh[q] = tq;
        bEdge[q] = 1 - 0.55 * s; // backlight: strongest over the far rim, weakest at the foot
        bIn[q] = Math.min(255, dIn[idx]);
        // The glaze burns away from the spark outward, a round front like the glow it becomes; the rim goes last.
        bKey[q] = bIn[q] <= 2 ? 0.9 + 0.1 * tq : 0.85 * OM.clamp(Math.hypot(x - hubX, y - hubY) / 760) + 0.06 * tq;
        let rgb;
        if (region[idx] === 2 && dLip[idx] === 1 && tq < 0.75) rgb = LIP; // the front lip
        else if (region[idx] === 1) rgb = INNER[tq < 0.2 + 0.5 * OM.clamp((y - TOP) / (2 * RY)) ? 1 : 0];
        else {
          const u = (x - BX) / (y <= BASE ? half(y) : FOOT);
          rgb = GLAZE[OM.clamp(Math.floor((0.55 - 0.45 * s + 0.2 * u ** 4) * 4 + (tq - 0.5) * 0.9), 0, 3)];
        }
        [bR[q], bG[q], bB[q]] = rgb;
      });

      // ---- the cracks: the words rasterized thin into the face, linked into one fracture network ----
      const COVER = 0.34;
      const makeCracks = () => {
        const ok = document.fonts.check(fontAt(W_ROW, 100));
        const mark = new Int8Array(N).fill(-1);
        const rng = OM.rng(0xc101);
        const m = document.createElement('canvas').getContext('2d');
        const place = [];
        const lay = (ks, w, capY, cap, maxW) => {
          m.font = fontAt(w, 100);
          const cap100 = m.measureText('H').actualBoundingBoxAscent || 73;
          const w100 = (s) => m.measureText(s).width;
          let full = 0, asc = cap100, desc = 0;
          ks.forEach((k, n) => {
            const mt = m.measureText(words[k].text);
            full += (n && words[k].space ? w100(' ') : 0) + mt.width;
            asc = Math.max(asc, mt.actualBoundingBoxAscent || 0);
            desc = Math.max(desc, mt.actualBoundingBoxDescent || 0);
          });
          // The target size, shrunk until the ink fits inside the bowl 70px clear of its outline (never under a 62px cap).
          const room = (px) => {
            const f = px / 100, base = capY + (cap100 * f) / 2;
            return Math.min(maxW, 2 * (Math.min(half(base - asc * f), half(base + desc * f)) - 70));
          };
          let px = (cap / cap100) * 100;
          while (px > (62 / cap100) * 100 && (full * px) / 100 > room(px)) px *= 0.98;
          px = Math.max(px, (62 / cap100) * 100);
          const f = px / 100;
          let x = 960 - (full * f) / 2;
          ks.forEach((k, n) => {
            if (n && words[k].space) x += w100(' ') * f;
            place[k] = { x, base: capY + (cap100 * f) / 2, px, w: w100(words[k].text) * f, weight: w };
            x += place[k].w;
          });
        };
        lay(words.map((_, k) => k).filter((k) => k !== K), W_ROW, 430, 78, 1180);
        lay([K], W_KEY, 650, 160, 1e9);
        const SS = 4;
        words.forEach((wd, k) => {
          const p = place[k];
          if (!wd.text || !p) return;
          const i0 = Math.max(0, I(p.x - p.px * 0.1)), i1 = Math.min(GW - 1, I(p.x + p.w + p.px * 0.1));
          const j0 = Math.max(0, J(p.base - p.px)), j1 = Math.min(GH - 1, J(p.base + p.px * 0.4));
          const cw = i1 - i0 + 1, chn = j1 - j0 + 1;
          const cnv = document.createElement('canvas');
          cnv.width = cw * SS;
          cnv.height = chn * SS;
          const x = cnv.getContext('2d', { willReadFrequently: true });
          x.setTransform(SS / L.cw, 0, 0, SS / L.ch, (-(L.x0 + (i0 + C0) * L.cw) * SS) / L.cw, (-(L.y0 + (j0 + R0) * L.ch) * SS) / L.ch);
          x.font = fontAt(p.weight, p.px);
          x.fillStyle = '#fff';
          x.fillText(wd.text, p.x, p.base);
          const px = x.getImageData(0, 0, cnv.width, cnv.height).data;
          for (let b = 0; b < chn; b++)
            for (let a = 0; a < cw; a++) {
              let sum = 0;
              for (let yy = 0; yy < SS; yy++) for (let xx = 0; xx < SS; xx++) sum += px[((b * SS + yy) * cnv.width + a * SS + xx) * 4 + 3];
              const idx = (j0 + b) * GW + i0 + a;
              if (sum > COVER * SS * SS * 255 && region[idx] === 2) mark[idx] = k;
            }
        });
        const glyph = Uint8Array.from(mark, (v) => (v >= 0 ? 1 : 0));
        const at = (idx) => [idx % GW, (idx / GW) | 0];
        /** A jagged hairline from cell a to cell b (midpoint displacement, 8-connected), marked k where the face is free. */
        const line = (a, b, k, rough) => {
          let pts = [at(a), at(b)];
          for (let lv = 0; lv < 3; lv++) {
            const nx = [pts[0]];
            for (let p = 1; p < pts.length; p++) {
              const [x1, y1] = pts[p - 1], [x2, y2] = pts[p], len = Math.hypot(x2 - x1, y2 - y1) || 1;
              const o = (rng() - 0.5) * 2 * rough * len;
              nx.push([Math.round((x1 + x2) / 2 - ((y2 - y1) / len) * o), Math.round((y1 + y2) / 2 + ((x2 - x1) / len) * o)], pts[p]);
            }
            pts = nx;
          }
          for (let p = 1; p < pts.length; p++) {
            let [x1, y1] = pts[p - 1];
            const [x2, y2] = pts[p], dx = Math.abs(x2 - x1), dy = -Math.abs(y2 - y1), sx = x1 < x2 ? 1 : -1, sy = y1 < y2 ? 1 : -1;
            let err = dx + dy;
            for (;;) {
              const idx = y1 * GW + x1;
              if (x1 >= 0 && y1 >= 0 && x1 < GW && y1 < GH && mark[idx] < 0 && region[idx] === 2) mark[idx] = k;
              if (x1 === x2 && y1 === y2) break;
              const e2 = 2 * err;
              if (e2 >= dy) { err += dy; x1 += sx; }
              if (e2 <= dx) { err += dx; y1 += sy; }
            }
          }
        };
        const cellsOf = (k) => {
          const out = [];
          for (let idx = 0; idx < N; idx++) if (mark[idx] === k) out.push(idx);
          return out;
        };
        const d2 = (a, b) => ((a % GW) - (b % GW)) ** 2 + (((a / GW) | 0) - ((b / GW) | 0)) ** 2;
        // ponytail: brute-force nearest pair, fine for a few thousand cells at build time
        const nearest = (A, B) => {
          let best = Infinity, pa = A[0], pb = B[0];
          for (const a of A) for (const b of B) { const d = d2(a, b); if (d < best) { best = d; pa = a; pb = b; } }
          return [pa, pb, best];
        };
        const isCrack = (b) => mark[b] >= 0;
        // Each word's letters linked nearest-first into one crack.
        const present = [];
        for (let k = 0; k <= K; k++) {
          const cells = cellsOf(k);
          if (!cells.length) continue;
          present.push(k);
          const lab = new Int32Array(N).fill(-1), comps = [];
          for (const s of cells) {
            if (lab[s] >= 0) continue;
            const ds = bfs([s], (b) => mark[b] === k && lab[b] < 0, NB8);
            const comp = [];
            for (const x of cells) if (ds[x] >= 0) { lab[x] = comps.length; comp.push(x); }
            comps.push(comp);
          }
          const linked = [comps.shift()];
          while (comps.length) {
            let best = null;
            comps.forEach((cmp, n) => linked.forEach((l2) => { const r = nearest(l2, cmp); if (!best || r[2] < best[2]) best = [...r, n]; }));
            line(best[0], best[1], k, 0.25);
            linked.push(comps.splice(best[3], 1)[0]);
          }
        }
        // Every word's crack radiates from the impact point: up into a row word from below its middle, down into the key word.
        for (const h of hub) mark[h] = 0; // the impact point belongs to the first word's crack
        const row = present.filter((k) => k !== K);
        for (const k of present) {
          const p = place[k], ax = k === K ? hubX : p.x + p.w / 2, ay = k === K ? hubY : p.base + 0.3 * p.px;
          let tgt = -1, best = Infinity;
          for (const idx of cellsOf(k)) {
            const d = (X(idx % GW) - ax) ** 2 + (Y((idx / GW) | 0) - ay) ** 2;
            if (d < best) { best = d; tgt = idx; }
          }
          line(HUB, tgt, k, 0.22);
        }
        if (present.includes(K)) {
          // The fracture runs out from its first and last letters, low, to both edges of the bowl.
          const kc = cellsOf(K);
          let jt = GH, jb = 0;
          for (const idx of kc) { const j = (idx / GW) | 0; jt = Math.min(jt, j); jb = Math.max(jb, j); }
          const low = kc.filter((idx) => ((idx / GW) | 0) >= (jt + jb) / 2);
          let lo = low[0], hi = low[0];
          for (const idx of low) {
            if (idx % GW < lo % GW) lo = idx;
            if (idx % GW > hi % GW) hi = idx;
          }
          for (const [e, dir] of [[lo, -1], [hi, 1]]) {
            const j = Math.min(J(BASE) - 4, ((e / GW) | 0) + Math.round((rng() - 0.3) * 14));
            line(e, j * GW + I(BX + dir * (half(Y(j)) - L.cw)), K, 0.25);
          }
        }
        // Two dead-end hairlines from the impact point, and cracks up to the lip, so the letters sit in a fracture.
        for (const [ang, len] of [[3.05, 15], [0.12, 15]])
          line(HUB, (hubJ + Math.round(Math.sin(ang) * len)) * GW + hubI + Math.round(Math.cos(ang) * len), 0, 0.3);
        const toLip = (k, right) => {
          const kc = k === undefined ? [] : cellsOf(k);
          if (!kc.length) return;
          let top = kc[0];
          for (const idx of kc) {
            const dj = ((idx / GW) | 0) - ((top / GW) | 0);
            if (dj < 0 || (dj === 0 && (right ? idx > top : idx < top))) top = idx;
          }
          const i = top % GW;
          let j = (top / GW) | 0;
          while (j > 0 && region[(j - 1) * GW + i] === 2) j--;
          line(top, j * GW + i, k, 0.3);
        };
        toLip(row[0], false);
        toLip(row[row.length - 1], true);

        // Flood order: hops along the network out of the impact point.
        const dHub = bfs(hub, isCrack, NB8);
        const list = [];
        for (let idx = 0; idx < N; idx++) if (mark[idx] >= 0) list.push(idx);
        const M = list.length;
        const cIdx = Int32Array.from(list), cK = new Int8Array(M), cTc = new Float32Array(M), cG = new Float32Array(M);
        const cTh = new Float32Array(M), cHub = new Uint8Array(M);
        const Dmax = [];
        for (const k of present) {
          let mx = 1;
          for (const idx of list) if (mark[idx] === k && dHub[idx] > mx) mx = dHub[idx];
          Dmax[k] = mx;
        }
        // w0 runs visibly out of the spark; the next two burst; the key word floods slowly across its hold.
        const FLOOD = (k) => (k === K ? [LAND, 0.8, 2] : k === row[0] ? [on[k], 0.34, 3] : [on[k], 0.26, 4]);
        let Gmax = 1;
        list.forEach((idx, q) => {
          const k = mark[idx], d = dHub[idx];
          const [t0, dur, p] = FLOOD(k);
          cK[q] = k;
          cTc[q] = t0 + dur * outInv((d < 0 ? Dmax[k] : d) / Dmax[k], p);
          cG[q] = dHub[idx] < 0 ? 0 : dHub[idx];
          if (cG[q] > Gmax) Gmax = cG[q];
          cTh[q] = OM.threshold((idx % GW) + C0, ((idx / GW) | 0) + R0);
          cHub[q] = hub.includes(idx) ? 1 : 0;
        });
        // Each glaze cell's nearest crack cell (euclidean distance), for the seam light on the glaze and rim.
        const from = new Int32Array(N).fill(-1), where = new Int32Array(N).fill(-1);
        list.forEach((idx, q) => (where[idx] = q));
        const dC = bfs(list, (b) => region[b] > 0, NB8, from);
        const bNc = new Int32Array(BN), bDc = new Uint16Array(BN);
        for (let q = 0; q < BN; q++) {
          const idx = bIdx[q], f = from[idx];
          bNc[q] = f >= 0 ? where[f] : -1;
          bDc[q] = dC[idx] < 0 ? 999 : Math.min(999, Math.round(Math.hypot((idx % GW) - (f % GW), ((idx / GW) | 0) - ((f / GW) | 0))));
        }
        // The bold swell: the cell right, below and diagonal of every letter cell, so a mended stroke reads heavier than its crack.
        const cGl = new Uint8Array(M), sIdx = [], sSrc = [], taken = new Uint8Array(N);
        list.forEach((idx, q) => {
          if (!glyph[idx]) return;
          cGl[q] = 1;
          for (const o of [1, GW, GW + 1]) {
            const n = idx + o;
            if (n >= N || (o !== GW && (idx % GW) + 1 >= GW) || taken[n] || mark[n] >= 0 || region[n] !== 2) continue;
            taken[n] = 1;
            sIdx.push(n);
            sSrc.push(q);
          }
        });
        return {
          ok, M, cIdx, cK, cTc, cG, cTh, cHub, cGl, Gmax, bNc, bDc, sIdx: Int32Array.from(sIdx), sSrc: Int32Array.from(sSrc),
          lvl: new Float32Array(M), col: new Uint32Array(M),
        };
      };

      // ---- frame buffers and inks ----
      const img = new ImageData(GW, GH), buf = new Uint32Array(img.data.buffer);
      const off = document.createElement('canvas');
      off.width = GW;
      off.height = GH;
      const offCtx = off.getContext('2d');
      const P = { crest: pack(ink.crest), hover: pack(ink.hover), lit: pack(ink.lit), mid: pack(ink.mid), dim: pack(ink.dim) };
      const [NR, NG, NB] = OM.rgb(ink.bg), [LR, LG, LB] = OM.rgb(ink.lit);
      const FALL = Float32Array.from({ length: 1000 }, (_, d) => 0.34 * Math.max(0, 1 - d / 7) ** 2);
      const RIMF = [0, 1, 0.5, 0.22];
      // The back light: rim and pool come up with each word, surge on the downbeat, then ride the fill into the glow.
      const rimBase = (T) =>
        0.32 * sm(T, on[0], on[0] + 0.3) + 0.1 * sm(T, on[1], on[1] + 0.2) + 0.1 * sm(T, on[2], on[2] + 0.2) +
        0.12 * sm(T, LAND, LAND + 0.1) + 0.6 * decay(T, LAND, 0.14) + 0.3 * sm(T, FILL, SURGE);
      const backA = (T) =>
        OM.lerp(0.07 * sm(T, on[0], LAND) + 0.05 * sm(T, LAND, LAND + 0.3) + 0.06 * decay(T, LAND, 0.2), 0.5, OM.ease.inCubic(OM.prog(T, FILL, 84.9)));
      const haloA = (T) => (0.15 + 0.25 * decay(T, on[0], 0.18) + 0.2 * decay(T, LAND, 0.15)) * (1 - sm(T, 84.55, 84.9));
      let cr = null;

      return {
        render(t, T) {
          const ctx = c.ensure();
          const dpr = c.dpr;
          // The seams are exact: the spark until the first word, the glow for the last frames.
          if (T < Math.max(start + 0.05, on[0])) return OM.handoff('spark', ctx, T, dpr);
          if (T > END - 0.07) return OM.handoff('glow', ctx, T, dpr);
          if (!cr || (!cr.ok && document.fonts.check(fontAt(W_ROW, 100)))) cr = makeCracks();
          const { M, cIdx, cK, cTc, cG, cTh, cHub, cGl, Gmax, bNc, bDc, sIdx, sSrc, lvl, col } = cr;

          // Seams: open (dim) on the word's onset, crest where the light arrives, cooling to lit.
          const flash = decay(T, LAND, 0.1), flare = decay(T, SURGE, 0.1);
          const payoff = sm(T, words[K].t1, words[K].t1 + 0.3); // once the line is whole, the letter cores glow hover
          const ps = 1.2 * sm(T, 84.6, 84.9);
          for (let q = 0; q < M; q++) {
            lvl[q] = 0;
            col[q] = 0;
            const k = cK[q];
            if (T < on[k]) continue;
            const tq = cTh[q];
            let p, v;
            if (cHub[q]) { p = P.crest; v = 1.4; }
            else {
              const age = T - cTc[q];
              if (age < 0) {
                p = P.mid; v = 0.15;
                if (k === K && tq < flash) { p = flash > 0.45 ? P.crest : P.hover; v = 1.2 * flash; }
              } else if (age < 0.07) { p = P.crest; v = 1.5; }
              else if (age < 0.32) { p = tq > (age - 0.07) / 0.25 ? P.crest : P.hover; v = 1.25; }
              else if (age < 0.7) { p = tq > (age - 0.32) / 0.38 ? P.hover : P.lit; v = 1.05; }
              else { p = cGl[q] && tq < payoff ? P.hover : P.lit; v = 1; }
              // After the line, each snare sends a pulse out of the impact point along every seam.
              for (const s of SNARES) {
                const a = T - s;
                if (a < 0 || a > 0.45) continue;
                const behind = a * (Gmax / 0.28) - cG[q];
                if (behind > -4 && behind < 4) { p = P.crest; v = 1.6; }
                else if (behind >= 4 && behind < 50 && tq > behind / 50) { p = P.hover; v = Math.max(v, 1.25); }
              }
            }
            if (tq < flare) { p = P.crest; v = 1.5; }
            const key = cHub[q] ? 1.05 : 0.55 * tq + 0.45 * (1 - cG[q] / Gmax);
            if (key < ps - 0.12) continue;
            if (key < ps) { p = P.crest; v = 1.3; }
            lvl[q] = v;
            col[q] = p;
          }

          // Glaze: surfaces out of the night with the first light, tinted by the seams near it, rim-lit from behind.
          const g0 = sm(T, on[0], on[0] + 0.3), rb = rimBase(T);
          const pg = 0.35 * sm(T, SNARES[3], SURGE) + 0.85 * sm(T, SURGE, 84.82);
          buf.fill(0);
          for (let q = 0; q < BN; q++) {
            const key = bKey[q];
            if (key < pg - 0.07) continue; // burned away into the light
            const idx = bIdx[q], tq = bTh[q];
            if (key < pg) { buf[idx] = pg - key < 0.035 ? P.mid : P.dim; continue; }
            const nc = bNc[q], din = bIn[q];
            if (din <= 3) {
              const seam = nc >= 0 ? 0.5 * lvl[nc] * Math.max(0, 1 - bDc[q] / 90) : 0;
              const v = (rb * bEdge[q] + seam) * RIMF[din] * (0.75 + 0.5 * tq);
              if (v > 0.1) { buf[idx] = v > 0.85 ? P.hover : v > 0.58 ? P.lit : v > 0.32 ? P.mid : P.dim; continue; }
            }
            let r = NR + (bR[q] - NR) * g0, g = NG + (bG[q] - NG) * g0, b = NB + (bB[q] - NB) * g0;
            if (nc >= 0) {
              const v = lvl[nc] * FALL[bDc[q]];
              if (v > 0) { r += (LR - r) * v; g += (LG - g) * v; b += (LB - b) * v; }
            }
            buf[idx] = packRGB(r | 0, g | 0, b | 0);
          }
          for (let q = 0; q < M; q++) if (col[q]) buf[cIdx[q]] = col[q];
          // A mended letter swells one cell bolder just behind the light; crest in the core shows as hover in the swell.
          for (let s = 0; s < sIdx.length; s++) {
            const q = sSrc[s], p = col[q];
            if (!p || T - cTc[q] < 0.12) continue;
            buf[sIdx[s]] = p === P.crest ? P.hover : P.lit;
          }

          ctx.fillStyle = ink.bg;
          ctx.fillRect(0, 0, 1920, 1080);
          pool(ctx, 960, 540, 620, ink.lit, backA(T));
          offCtx.putImageData(img, 0, 0);
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(off, L.x0 + C0 * L.cw, L.y0 + R0 * L.ch, GW * L.cw, GH * L.ch);
          ctx.imageSmoothingEnabled = true;
          // The spark stays the source: its halo and its exact cell, on top, until the very end.
          pool(ctx, hubX, hubY, 72, ink.lit, haloA(T));
          if (ps < 1.17) {
            ctx.fillStyle = ink.crest;
            OM.cell(ctx, HM, sp.col, sp.row, dpr);
          }
        },
        release: () => c.release(),
      };
    },
  });
})();
