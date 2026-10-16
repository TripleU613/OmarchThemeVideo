// c2-04 · Skyline. The glow from the cut sinks to the horizon and becomes the
// light dome over a night city whose windows are the film's lattice cells.
// Each word is spelled in windows across the towers, switching on in a fast
// wave on its onset, crest at the front and holding green; the key word's
// downbeat sends a wave through every window in the city. Snares wake scattered
// windows. After the line has read together the city goes dark window by
// window, the facades dissolve, and only the lattice it was built on is left:
// the grid of the next cut.
OM.ownWords.add('c2-04');
(() => {
  const W = 800;
  OM.c2.ready('c2-04', W);
  const { pool, sm, decay } = OM.c2;

  OM.scene({
    id: 'c2-04',
    build(el, { start, duration }) {
      const cv = document.createElement('canvas');
      cv.className = 'om-fill';
      el.appendChild(cv);
      const c = OM.canvas(cv, { alpha: false });
      const END = start + duration;
      const ink = OM.fieldInks('tokyo-night'), th = OM.theme('tokyo-night');
      const words = OM.sung('c2-04');
      const on = words.map((w) => w.t0);
      // The key word: the longest held one (the city-wide wave lands with it).
      let K = 0;
      words.forEach((w, k) => { if (w.t1 - w.t0 > words[K].t1 - words[K].t0) K = k; });
      const DB1 = OM.downbeatsIn(171.6, 172)[0] || 171.851, DB2 = OM.downbeatsIn(173.8, 174.2)[0] || 173.987;
      const SNARES = [170.365, 170.852, 171.433, 171.897, 172.176, 172.71, 172.965, 173.383];
      const OUT = DB2, GONE = 174.42;
      const HM = OM.HOME, V = 5200;

      const get = OM.c2.lazy(W, () => {
        const L = OM.c2.layout(words, { weight: W, cap: 150, maxW: 1800, cy: 580, rows: 3, lead: 1.32, minCap: 100 });
        const lit = new Map(); // "col,row" -> { k, t } when the window lights
        const colsWithText = new Map(); // col -> top text row
        words.forEach((wd, k) => {
          const p = L.place[k];
          if (!p) return;
          for (const cl of OM.c2.raster(wd.text, p.x, p.base, L.px, W, HM.cw, HM.ch, HM.x0, HM.y0, 0.36)) {
            lit.set(cl.i + ',' + cl.j, { k, t: on[k] + (cl.x - p.x) / V });
            colsWithText.set(cl.i, Math.min(colsWithText.get(cl.i) ?? 999, cl.j));
          }
        });
        // Towers left to right; an alley only where no letter would be cut.
        const rng = OM.rng(0xc204), bottom = HM.rMin + HM.rows;
        const top = new Map();
        let col = HM.cMin;
        while (col < HM.cMin + HM.cols) {
          const w = 4 + Math.floor(rng() * 8);
          const x = HM.x0 + col * HM.cw;
          const edge = Math.abs(x - 960) / 960;
          let t = OM.cellAt(HM, 0, 200 + 520 * edge * edge + 140 * rng()).row;
          for (let i = col; i < col + w; i++) if (colsWithText.has(i)) t = Math.min(t, colsWithText.get(i) - 2 - Math.floor(rng() * 4));
          for (let i = col; i < col + w; i++) top.set(i, t);
          col += w;
          if (!colsWithText.has(col)) col += 1; // the alley
        }
        return { lit, top, bottom };
      });

      return {
        render(t, T) {
          const ctx = c.ensure();
          const dpr = c.dpr;
          if (T < start + 0.05) return OM.handoff('glow', ctx, T, dpr);
          if (T > END - 0.07) return OM.handoff('grid', ctx, T, dpr);
          const { lit, top, bottom } = get();
          ctx.fillStyle = ink.bg;
          ctx.fillRect(0, 0, 1920, 1080);
          // The glow sinks behind the skyline into its light dome.
          const sink = OM.ease.inOutCubic(OM.prog(T, start, start + 0.7));
          const out = sm(T, OUT, GONE);
          pool(ctx, 960, OM.lerp(540, 980, sink), 620 + 500 * sink, OM.lerp(620, 300, sink), ink.lit, OM.lerp(0.5, 0.2, sink) * (1 - out));

          const facade = sm(T, start, start + 0.35) * (1 - out);
          const nSn = OM.hitCount(SNARES, T);
          const sn = SNARES.reduce((a, s) => Math.max(a, decay(T, s, 0.1)), 0);
          const dbA = T - DB1;
          // Darkening: windows go out right to left, a beat's worth of sweep.
          const sweep = 2100 - 2400 * OM.prog(T, OUT, OUT + 0.3);
          for (const [col, t0] of top) {
            const x = HM.x0 + col * HM.cw;
            for (let row = t0; row < bottom; row++) {
              const y = HM.y0 + row * HM.ch;
              const key = col + ',' + row, w = lit.get(key);
              let p = null;
              if (w && T >= w.t) {
                const a = T - w.t;
                p = a < 0.06 ? ink.crest : w.k === K ? (a < 0.4 ? ink.hover : ink.crest) : a < 0.2 ? ink.crest : ink.hover;
                if (sn > 0.5 && OM.hash(col, row, nSn) < 0.3) p = ink.crest;
              } else {
                const h = OM.hash(col, row, 4);
                if (h < 0.02 + 0.006 * nSn) p = OM.hash(col, row, 5) < 0.5 ? ink.dim : ink.mid;
                // The city-wide wave on the key word's downbeat, out from the centre.
                if (dbA >= 0 && dbA < 0.7) {
                  const front = dbA * 2600 - Math.hypot(x - 960, (y - 560) * 1.4);
                  if (front > 0 && front < 90) p = front < 30 ? ink.lit : ink.mid;
                }
              }
              if (x > sweep && T >= OUT) p = null;
              if (facade > 0) {
                ctx.fillStyle = OM.c2.rgba(th.surface, facade);
                OM.cell(ctx, HM, col, row, dpr);
              }
              if (p && w && T >= w.t) {
                ctx.fillStyle = p; // a lit letter window fills its whole cell, so the strokes read solid
                OM.cell(ctx, HM, col, row, dpr);
              } else if (p) {
                ctx.fillStyle = p;
                ctx.fillRect(x + 2, y + 2, HM.cw - 4, HM.ch - 4);
              } else if (facade > 0) {
                ctx.fillStyle = OM.c2.rgba(th['bg-deep'], facade);
                ctx.fillRect(x + 2, y + 2, HM.cw - 4, HM.ch - 4);
              }
            }
          }
          // The lattice the city stood on comes through as it goes.
          const g = sm(T, OUT + 0.1, GONE);
          if (g > 0) {
            const snap = (v) => Math.round(v * dpr) / dpr;
            ctx.fillStyle = OM.c2.rgba(th['border-subtle'], g);
            for (let cc = HM.cMin; cc <= HM.cMin + HM.cols; cc++) ctx.fillRect(snap(HM.x0 + cc * HM.cw), 0, 1, 1080);
            for (let r = HM.rMin; r <= HM.rMin + HM.rows; r++) ctx.fillRect(0, snap(HM.y0 + r * HM.ch), 1920, 1);
          }
        },
        release: () => c.release(),
      };
    },
  });
})();
