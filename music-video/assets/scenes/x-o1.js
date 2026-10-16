// x-o1 · Morning after. The word handoff was the machine's screen all along: on
// the first kick the camera pulls back to a laptop on a desk at dawn, the paper
// plane landed beside it, the window's lattice sky filling with light. On the
// downbeat a terminal tiles over the homepage and the credits print as its
// output, a row per hit; the hard stops stutter the cursor, the terminal closes
// on the kick and the camera pushes back into the homepage, landing on the kick
// before the cut, so the section ends on the same word handoff it started on.
//
// Also defines OM.outro, shared with o-01 and x-end: the homepage on the home
// lattice (field, wordmark, the sung line as hero text in half cells, the two
// buttons) and its drain order, so the cuts between those scenes match by
// construction.
(() => {
  const HEAD = "800 100px 'JetBrains Mono'", LABEL = "600 100px 'JetBrains Mono'", TERM = "500 48px 'JetBrains Mono'";
  window.__hf = window.__hf || {};
  window.__hf.buildReady = window.__hf.buildReady || {};
  window.__hf.buildReady['outro-type'] = Promise.all([HEAD, LABEL, TERM].map((f) => document.fonts.load(f)));

  const O = (OM.outro = {});
  const L = OM.HOME;
  /** Half cells of the home lattice: the hero text's grid. */
  const H = { x0: L.x0, y0: L.y0, cw: L.cw / 2, ch: L.ch / 2 };
  const cur = OM.cellAt(L, 960, 540);
  O.cursor = cur;
  O.H = H;

  // Drain order: the dither threshold blended with distance to the cursor, so the page empties
  // cell by cell from the edges in toward the one cell that never drains.
  const KEY = new Float32Array(L.cols * L.rows);
  for (let r = 0; r < L.rows; r++)
    for (let c = 0; c < L.cols; c++) {
      const col = L.cMin + c, row = L.rMin + r;
      const d = Math.hypot((col - cur.col) / (L.cols / 2), (row - cur.row) / (L.rows / 2)) / 1.42;
      KEY[r * L.cols + c] = col === cur.col && row === cur.row ? -1 : 0.5 * OM.threshold(col, row) + 0.5 * Math.min(1, d);
    }
  const key = (col, row) => KEY[(row - L.rMin) * L.cols + (col - L.cMin)];
  O.key = key;

  /** Text rasterized onto a cw x ch grid, cap height capRows cells: { cells: [{ q, r, ci }], cols }, r 0 at the cap top. */
  const raster = (text, weight, capRows, cw, ch) => {
    const m = document.createElement('canvas').getContext('2d');
    m.font = `${weight} 100px 'JetBrains Mono'`;
    const capR = m.measureText('H').actualBoundingBoxAscent / 100 || 0.73;
    const font = `${weight} ${((capRows * ch) / capR).toFixed(2)}px 'JetBrains Mono'`;
    m.font = font;
    const adv = m.measureText('M').width;
    const met = m.measureText(text);
    const up = Math.max(capRows, Math.ceil(met.actualBoundingBoxAscent / ch));
    const R = up + Math.ceil(Math.max(0, met.actualBoundingBoxDescent) / ch);
    const pad = 2 * cw, S = 3;
    const cols = Math.ceil((met.width + 2 * pad) / cw);
    const cnv = document.createElement('canvas');
    cnv.width = Math.ceil(cols * cw * S);
    cnv.height = Math.ceil(R * ch * S);
    const x = cnv.getContext('2d', { willReadFrequently: true });
    x.scale(S, S);
    x.font = font;
    x.fillStyle = '#fff';
    x.fillText(text, pad, up * ch);
    const px = x.getImageData(0, 0, cnv.width, cnv.height).data;
    const out = [];
    for (let r = 0; r < R; r++)
      for (let q = 0; q < cols; q++) {
        const xa = Math.floor(q * cw * S), xb = Math.floor((q + 1) * cw * S), ya = Math.floor(r * ch * S), yb = Math.floor((r + 1) * ch * S);
        let sum = 0;
        for (let yy = ya; yy < yb; yy++) for (let xx = xa; xx < xb; xx++) sum += px[(yy * cnv.width + xx) * 4 + 3];
        if (sum > 0.45 * 255 * (xb - xa) * (yb - ya)) out.push({ q, r: r - (up - capRows), ci: Math.floor(((q + 0.5) * cw - pad) / adv) });
      }
    if (!out.length) for (let r = 0; r < capRows; r++) for (let q = 0; q < 2 * capRows; q++) out.push({ q, r, ci: 0 });
    const q0 = Math.min(...out.map((k) => k.q));
    let q1 = 0;
    for (const k of out) q1 = Math.max(q1, (k.q -= q0));
    return { cells: out, cols: q1 + 1 };
  };
  O.raster = raster;

  // ---- the homepage layout on the home lattice, built once the faces are in ----
  let LAY = null;
  O.layout = () => {
    if (LAY && (LAY.ok || !document.fonts.check(HEAD))) return LAY;
    const ok = document.fonts.check(HEAD) && document.fonts.check(LABEL);
    const sung = OM.sung('o-01');
    const words = sung.map((w) => (w.text ? w.text : '███'));
    const MAXQ = Math.floor(1640 / H.cw);
    /** One line of words [a, b): its text and, per character, which word it belongs to. */
    const lineOf = (a, b) => {
      let text = '';
      const of = [];
      for (let i = a; i < b; i++) {
        if (i > a && sung[i].space !== false) { text += ' '; of.push(-1); }
        for (const _ of words[i]) of.push(i);
        text += words[i];
      }
      return { text, of };
    };
    let lines = null, rows = 10;
    for (rows = 10; rows >= 9 && !lines; rows--) {
      const one = lineOf(0, words.length);
      if (raster(one.text, 800, rows, H.cw, H.ch).cols <= MAXQ) lines = [one];
    }
    if (!lines) {
      // Two lines, split where the wider half is narrowest.
      rows = 9;
      let best = null;
      for (let s = 1; s < words.length; s++) {
        const a = lineOf(0, s), b = lineOf(s, words.length);
        const w = Math.max(raster(a.text, 800, rows, H.cw, H.ch).cols, raster(b.text, 800, rows, H.cw, H.ch).cols);
        if (!best || w < best.w) best = { w, l: [a, b] };
      }
      lines = best ? best.l : [lineOf(0, words.length)];
    } else rows += 1;
    const head = [];
    let hr = 44; // two full cells under the wordmark
    for (const ln of lines) {
      const R = raster(ln.text, 800, rows, H.cw, H.ch);
      const hq0 = Math.round((960 - L.x0) / H.cw - R.cols / 2);
      for (const k of R.cells) {
        const w = ln.of[OM.clamp(k.ci, 0, ln.of.length - 1)];
        const q = hq0 + k.q, r = hr + k.r;
        head.push({ q, r, w: w < 0 ? 0 : w, key: key(Math.floor(q / 2), Math.floor(r / 2)) + 0.004 * OM.hash(q, r, 7) });
      }
      hr += rows + 5;
    }
    // Word centres, for the impacts.
    const centre = words.map((_, i) => {
      const ks = head.filter((k) => k.w === i);
      const n = ks.length || 1;
      return {
        x: H.x0 + (ks.reduce((s, k) => s + k.q, 0) / n + 0.5) * H.cw,
        y: H.y0 + (ks.reduce((s, k) => s + k.r, 0) / n + 0.5) * H.ch,
      };
    });
    // The two buttons, in half cells: filled brand, then outlined surface, labels on a fine grid.
    const LC = 2.4;
    const labA = raster('Get Omarchy', 600, 8, LC, LC), labB = raster('See it in action', 600, 8, LC, LC);
    const bh = 8, gap = 3, pad = 4;
    const bwA = Math.ceil((labA.cols * LC) / H.cw) + 2 * pad, bwB = Math.ceil((labB.cols * LC) / H.cw) + 2 * pad;
    const by = hr + 2;
    const bx = Math.round((960 - L.x0) / H.cw - (bwA + gap + bwB) / 2);
    const btn = [];
    const block = (x0, w, kind, lab) => {
      for (let r = by; r < by + bh; r++)
        for (let q = x0; q < x0 + w; q++)
          btn.push({ q, r, kind, edge: kind === 'b' ? [r === by, r === by + bh - 1, q === x0, q === x0 + w - 1] : null, key: key(Math.floor(q / 2), Math.floor(r / 2)), th: OM.threshold(q, r) });
      const lx = H.x0 + (x0 + w / 2) * H.cw - (lab.cols * LC) / 2, ly = H.y0 + (by + bh / 2) * H.ch - 4 * LC;
      return lab.cells.map((k) => {
        const x = lx + k.q * LC, y = ly + k.r * LC;
        const q = Math.floor((x - H.x0) / H.cw), r = Math.floor((y - H.y0) / H.ch);
        return { x, y, kind, key: key(Math.floor(q / 2), Math.floor(r / 2)), th: OM.threshold(q, r) };
      });
    };
    const labels = [...block(bx, bwA, 'a', labA), ...block(bx + bwA + gap, bwB, 'b', labB)];
    LAY = { ok, head, centre, btn, labels, LC, count: words.length };
    return LAY;
  };

  /**
   * The homepage at time T on the home lattice, as the word handoff draws it, plus the hero text and buttons.
   * left: cells whose drain key is under it survive (1 = the whole page). glows: field/wordmark light.
   * head(cell): { ink, dx, dy } or null to hide; omitted, every word rests in text ink. buttons: 0..1 built.
   */
  O.page = (ctx, T, dpr, { left = 1, glows = [], head, buttons = 1 } = {}) => {
    const ink = OM.fieldInks('tokyo-night'), th = OM.theme('tokyo-night');
    const lay = O.layout();
    const drain = left < 1;
    ctx.fillStyle = ink.bg;
    ctx.fillRect(0, 0, 1920, 1080);
    OM.hero(ctx, T, dpr, {
      inks: ink, L, word: false, gain: 0.8, bg: false, glows,
      mask: drain ? (col, row) => (key(col, row) < left ? 1 : 0) : undefined,
    });
    OM.paintWord(ctx, L, dpr, ink, { glows, wordInk: drain ? (row, col) => (key(col, row) < left ? null : ink.bg) : null });
    // A half-cell knockout around each letter cell keeps the words clear of any lit field behind them.
    const vis = [];
    for (const k of lay.head) {
      if (drain && k.key >= left) continue;
      const s = head ? head(k) : { ink: th.text, dx: 0, dy: 0 };
      if (s) vis.push([k, s]);
    }
    ctx.fillStyle = ink.bg;
    for (const [k, s] of vis) ctx.fillRect(H.x0 + s.dx + (k.q - 1) * H.cw, H.y0 + s.dy + (k.r - 1) * H.ch, 3 * H.cw, 3 * H.ch);
    for (const [k, s] of vis) {
      ctx.fillStyle = s.ink;
      OM.cell(ctx, { x0: H.x0 + s.dx, y0: H.y0 + s.dy, cw: H.cw, ch: H.ch }, k.q, k.r, dpr);
    }
    if (buttons > 0) {
      const grow = buttons * 1.02;
      const sn = (v) => Math.round(v * dpr) / dpr;
      for (const k of lay.btn) {
        if (k.th >= grow || (drain && k.key >= left)) continue;
        ctx.fillStyle = buttons < 1 && grow - k.th < 0.12 ? ink.crest : k.kind === 'a' ? th.brand : th.surface;
        OM.cell(ctx, H, k.q, k.r, dpr);
        if (k.edge) {
          ctx.fillStyle = th['border-strong'];
          const x = sn(H.x0 + k.q * H.cw), y = sn(H.y0 + k.r * H.ch), x2 = sn(H.x0 + (k.q + 1) * H.cw), y2 = sn(H.y0 + (k.r + 1) * H.ch);
          if (k.edge[0]) ctx.fillRect(x, y, x2 - x, 1);
          if (k.edge[1]) ctx.fillRect(x, y2 - 1, x2 - x, 1);
          if (k.edge[2]) ctx.fillRect(x, y, 1, y2 - y);
          if (k.edge[3]) ctx.fillRect(x2 - 1, y, 1, y2 - y);
        }
      }
      const LC = lay.LC;
      for (const k of lay.labels) {
        if (k.th >= grow - 0.12 || (drain && k.key >= left)) continue;
        ctx.fillStyle = k.kind === 'a' ? th['brand-ink'] : th.text;
        ctx.fillRect(sn(k.x), sn(k.y), sn(k.x + LC) - sn(k.x), sn(k.y + LC) - sn(k.y));
      }
    }
  };

  // ---------------------------------------------------------------- x-o1
  const rgba = (hex, a) => {
    const [r, g, b] = OM.rgb(hex);
    return `rgba(${r},${g},${b},${a})`;
  };
  const ROWS = [
    ['Song', 'We Can Fix Everything (The Ultimate Machine)'],
    ['Music', 'Kevin Koontz / REARRANGED'],
    ['Made in code', 'HyperFrames, Three.js, anime.js and GSAP'],
    ['Look', 'Themed after omarchy.org, in Tokyo Night'],
    ['Omarchy', 'by DHH · omarchy.org'],
  ];
  // Room space. The screen is the whole 1920x1080 frame scaled by S1 at (SX, SY); the camera zooms
  // about P, the point that stays put, so at k = 1 / S1 the screen exactly fills the frame.
  const S1 = 0.6, SX = 230, SY = 104, SW = 1920 * S1, SH = 1080 * S1;
  const P = { x: SX / (1 - S1), y: SY / (1 - S1) };
  const DESK = 812;

  OM.scene({
    id: 'x-o1',
    build(el, { start, duration }) {
      const cv = document.createElement('canvas');
      cv.className = 'om-fill';
      el.appendChild(cv);
      const c = OM.canvas(cv, { alpha: false });
      const ink = OM.fieldInks('tokyo-night');
      const th = OM.theme('tokyo-night');
      const end = start + duration;
      const PULL0 = 281.031, PULL1 = 282.842; // first kick to the downbeat
      const OPEN = 282.842, TYPE0 = 283.0, CLOSE = 288.369, LAND = 289.483;
      const PRINT = [283.91, 284.979, 285.698, 286.418, 287.115]; // a row per hit; the last on the downbeat
      const STOPS = [287.486, 287.602, 287.742, 287.858, 287.974, 288.113, 288.253, 288.369];
      const CMD = 'credits';
      const ZIN = 1 / S1, CREEP = 1.035;

      /** Camera zoom relative to the room view: in on the screen, out to the room, a creep, back in. */
      const zoom = (T) => {
        if (T < PULL1) return Math.pow(ZIN, 1 - OM.ease.inOutCubic(OM.prog(T, PULL0, PULL1)));
        if (T < CLOSE) return 1 + (CREEP - 1) * OM.ease.inOutSine(OM.prog(T, PULL1, CLOSE));
        return CREEP * Math.pow(ZIN / CREEP, OM.ease.inCubic(OM.prog(T, CLOSE, LAND)));
      };
      const dawnOf = (T) => OM.smooth(OM.prog(T, 280.9, 289.3));

      /** Lattice light inside a polygon-free rect: cells lit where lum(x, y) clears their threshold. */
      const lightCells = (ctx, x0, y0, x1, y1, size, lum, inside) => {
        for (let y = y0; y < y1; y += size)
          for (let x = x0; x < x1; x += size) {
            if (inside && !inside(x + size / 2, y + size / 2)) continue;
            const l = lum(x + size / 2, y + size / 2);
            const q = Math.round(x / size), r = Math.round(y / size);
            const t = OM.threshold(q, r);
            if (l <= t) continue;
            const h = l - t;
            ctx.fillStyle = h > 0.5 ? ink.crest : h > 0.34 ? ink.hover : h > 0.2 ? ink.lit : h > 0.08 ? ink.mid : ink.dim;
            ctx.fillRect(x, y, size, size);
          }
      };

      const drawRoom = (ctx, T) => {
        const d = dawnOf(T);
        // Wall, the dawn wash from the window, the desk.
        ctx.fillStyle = ink.bg;
        ctx.fillRect(-200, -200, 2400, 1500);
        let g = ctx.createRadialGradient(1650, 360, 0, 1650, 360, 1400);
        g.addColorStop(0, rgba(th['text-secondary'], 0.2 * d));
        g.addColorStop(0.5, rgba(th['text-secondary'], 0.08 * d));
        g.addColorStop(1, rgba(th['text-secondary'], 0));
        ctx.fillStyle = g;
        ctx.fillRect(-200, -200, 2400, DESK + 200);
        g = ctx.createLinearGradient(0, DESK, 0, 1080);
        g.addColorStop(0, OM.mix(th['bg-deep'], th.surface, 0.3 + 0.6 * d));
        g.addColorStop(1, OM.mix(ink.bg, th['bg-deep'], d));
        ctx.fillStyle = g;
        ctx.fillRect(-200, DESK, 2400, 500);
        ctx.fillStyle = OM.mix(th['border-subtle'], th['border-strong'], d);
        ctx.fillRect(-200, DESK, 2400, 2);

        // The window: a lattice sky brightening from the horizon up, the sun's crest cells last.
        const WX0 = 1500, WY0 = 130, WX1 = 1810, WY1 = 560;
        g = ctx.createLinearGradient(0, WY0, 0, WY1);
        g.addColorStop(0, OM.mix(ink.bg, th['bg-deep'], d));
        g.addColorStop(1, OM.mix(th['bg-deep'], th['border-strong'], 0.8 * d));
        ctx.fillStyle = g;
        ctx.fillRect(WX0, WY0, WX1 - WX0, WY1 - WY0);
        lightCells(ctx, WX0, WY0, WX1, WY1, 10, (x, y) => {
          const v = (y - WY0) / (WY1 - WY0);
          const sun = Math.max(0, 1 - Math.hypot(x - 1640, (y - 600) * 1.3) / 260);
          return d * (0.08 + 0.55 * v * v) + sun * sun * Math.max(0, d - 0.25) * 1.3;
        });
        ctx.fillStyle = OM.mix(th['border-subtle'], th['border-strong'], 0.4 + 0.6 * d);
        ctx.fillRect(WX0 - 10, WY0 - 10, WX1 - WX0 + 20, 10);
        ctx.fillRect(WX0 - 10, WY1, WX1 - WX0 + 20, 14);
        ctx.fillRect(WX0 - 10, WY0, 10, WY1 - WY0);
        ctx.fillRect(WX1, WY0, 10, WY1 - WY0);
        ctx.fillRect((WX0 + WX1) / 2 - 4, WY0, 8, WY1 - WY0);
        ctx.fillRect(WX0, 340, WX1 - WX0, 8);

        // The window's light thrown across the desk, in dim lattice cells.
        const inside = (x, y) => {
          const v = (y - DESK) / 250;
          return v >= 0 && v <= 1 && x > 1280 - 330 * v && x < 1760 - 300 * v;
        };
        lightCells(ctx, 900, DESK + 4, 1760, 1062, 10, (x, y) => d * 0.42 * (1 - 0.6 * ((y - DESK) / 250)), inside);

        // The paper plane, landed on the desk, nose to the machine, its top edge catching the dawn.
        const plane = [
          { pts: [[1460, 802], [1756, 696], [1780, 770]], c: OM.mix(th.surface, th['border-strong'], 0.4 + 0.4 * d) },
          { pts: [[1460, 802], [1780, 770], [1786, 812]], c: OM.mix(th['bg-deep'], th['surface-2'], 0.5 + 0.5 * d) },
          { pts: [[1460, 802], [1806, 738], [1780, 770]], c: OM.mix(th['surface-2'], th['text-secondary'], 0.3 + 0.5 * d) },
        ];
        ctx.fillStyle = rgba('#000000', 0.35);
        ctx.beginPath();
        ctx.ellipse(1630, 814, 180, 7, 0, 0, Math.PI * 2);
        ctx.fill();
        for (const f of plane) {
          ctx.fillStyle = f.c;
          ctx.beginPath();
          f.pts.forEach(([x, y]) => ctx.lineTo(x, y));
          ctx.closePath();
          ctx.fill();
        }
        ctx.strokeStyle = rgba(ink.hover, 0.25 + 0.6 * d);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(1460, 802);
        ctx.lineTo(1806, 738);
        ctx.moveTo(1460, 802);
        ctx.lineTo(1756, 696);
        ctx.stroke();

        // The machine: lid around the screen, the base slab on the desk, the dawn on its right edge.
        ctx.fillStyle = th['bg-deep'];
        ctx.fillRect(SX - 22, SY - 22, SW + 44, SH + 44);
        ctx.strokeStyle = th['border-strong'];
        ctx.lineWidth = 2;
        ctx.strokeRect(SX - 21, SY - 21, SW + 42, SH + 42);
        ctx.fillStyle = rgba(ink.mid, 0.2 + 0.5 * d);
        ctx.fillRect(SX + SW + 20, SY - 21, 2, SH + 42);
        const b0 = SY + SH + 22;
        ctx.fillStyle = OM.mix(th.surface, th['surface-2'], d);
        ctx.beginPath();
        ctx.moveTo(SX - 30, b0);
        ctx.lineTo(SX + SW + 30, b0);
        ctx.lineTo(SX + SW + 80, DESK);
        ctx.lineTo(SX - 80, DESK);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = th['border-strong'];
        ctx.fillRect(SX - 30, b0, SW + 60, 2);
        ctx.fillStyle = rgba(ink.hover, 0.15 + 0.4 * d);
        ctx.fillRect(SX - 80, DESK - 3, SW + 160, 2);
        ctx.fillStyle = th['bg-deep'];
        ctx.fillRect(960 - 110, DESK - 9, 220, 5);
      };

      /** The terminal tile over the homepage, in screen space (1920x1080). */
      const drawTerminal = (ctx, T) => {
        let s = 1, a = 1;
        if (T < OPEN + 0.14) s = 0.94 + 0.06 * OM.ease.outExpo(OM.prog(T, OPEN, OPEN + 0.14));
        if (T >= CLOSE) {
          const e = OM.prog(T, CLOSE, CLOSE + 0.12);
          s = 1 - 0.06 * OM.ease.inCubic(e);
          a = 1 - e;
        }
        if (a <= 0) return;
        ctx.save();
        ctx.globalAlpha = a;
        ctx.translate(960, 540);
        ctx.scale(s, s);
        ctx.translate(-960, -540);
        ctx.fillStyle = th.bg;
        ctx.fillRect(40, 40, 1840, 1000);
        ctx.strokeStyle = th.brand;
        ctx.lineWidth = 4;
        ctx.strokeRect(42, 42, 1836, 996);
        ctx.font = TERM;
        ctx.textBaseline = 'alphabetic';
        const ADV = ctx.measureText('M').width, X = 96, LH = 84;
        let y = 160;
        const prompt = (y) => {
          ctx.fillStyle = ink.lit;
          ctx.fillText('~', X, y);
          ctx.fillStyle = th.brand;
          ctx.fillText('❯', X + 2 * ADV, y);
          return X + 4 * ADV;
        };
        const block = (x, y, color) => {
          ctx.fillStyle = color;
          ctx.fillRect(x, y - 40, ADV, 52);
        };
        // The command, typed at a hi-hat pace.
        let x = prompt(y);
        const n = Math.max(0, Math.min(CMD.length, Math.floor((T - TYPE0) / 0.075) + 1));
        ctx.fillStyle = th.text;
        ctx.fillText(CMD.slice(0, n), x, y);
        if (T < PRINT[0]) block(x + n * ADV, y, th.text);
        // The credits, printed a row per hit, flashing crest as they land.
        y += LH * 1.4;
        ROWS.forEach(([k, v], i) => {
          if (T < PRINT[i]) return;
          const fresh = T - PRINT[i] < 0.09;
          ctx.fillStyle = fresh ? ink.crest : th['text-muted'];
          ctx.fillText(k.toLowerCase(), X, y + i * LH);
          ctx.fillStyle = fresh ? ink.crest : i === ROWS.length - 1 ? th.brand : th.text;
          ctx.fillText(v, X + 15 * ADV, y + i * LH);
        });
        // A fresh prompt; its cursor stutters on the hard stops.
        if (T >= PRINT[4] + 0.2) {
          const py = y + ROWS.length * LH + LH * 0.4;
          const px = prompt(py);
          if (OM.hitCount(STOPS, T) % 2 === 0) block(px, py, OM.hitCount(STOPS, T) ? ink.crest : th.text);
        }
        ctx.restore();
      };

      return {
        render(t, T) {
          const ctx = c.ensure();
          const dpr = c.dpr;
          ctx.globalAlpha = 1;
          if (T < PULL0 || T >= LAND || T >= end - 0.07) return OM.handoff('word', ctx, T, dpr);
          const k = zoom(T);
          // Room space through the camera.
          ctx.setTransform(dpr * k, 0, 0, dpr * k, dpr * P.x * (1 - k), dpr * P.y * (1 - k));
          drawRoom(ctx, T);
          // Screen space: the homepage (the word handoff itself), and over it the terminal.
          const sk = k * S1;
          ctx.save();
          ctx.setTransform(dpr * sk, 0, 0, dpr * sk, dpr * (P.x * (1 - k) + k * SX), dpr * (P.y * (1 - k) + k * SY));
          ctx.beginPath();
          ctx.rect(0, 0, 1920, 1080);
          ctx.clip();
          OM.handoff('word', ctx, T, dpr * sk);
          if (T >= OPEN) drawTerminal(ctx, T);
          ctx.restore();
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        },
        release: () => c.release(),
      };
    },
  });
})();
