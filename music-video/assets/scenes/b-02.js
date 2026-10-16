// b-02 · The wall of screens. The spark is the first screen: one tiny
// display at the centre of the home lattice. Then the dark fills with screens,
// every lattice cell a display that boots with a crest flash and settles into
// its glass. Each word is a crowd of screens booting at once, swept left to
// right from its onset, so the line is spelled by machines coming on; around
// it strangers' screens light ever faster until the dark is full. The snares
// flicker the whole wall. Then every lit screen drops into the centre row,
// column by column, and the row closes into one crest line: the road's first strip.
OM.ownWords.add('b-02');
OM.scene({
  id: 'b-02',
  build(el, { start, duration }) {
    const B = OM.bridge;
    const cv = document.createElement('canvas');
    cv.className = 'om-fill';
    el.appendChild(cv);
    const c = OM.canvas(cv, { alpha: false });
    const END = start + duration;
    const L = OM.HOME;
    const ink = OM.fieldInks('tokyo-night');
    const th = OM.theme('tokyo-night');
    const sung = OM.sung('b-02');
    const on = sung.map((w) => B.land(w.t0, start));
    const SNARES = [197.857, 198.275, 198.67, 198.902, 199.993];
    const DROP = 200.25, CLOSE = 200.9;
    const SR = B.SPARK.row, SC = B.SPARK.col;
    const C0 = L.cMin, C1 = L.cMin + L.cols;

    const lay = B.lazy(() => {
      const set = B.set(sung, { weight: 800, cap: 136, minCap: 96, maxW: 1820, cy: 530, lead: 1.3 });
      const taken = new Set();
      const screens = [];
      set.words.forEach((w) => {
        const cells = B.cells(w, set, L);
        const x0 = Math.min(...cells.map((q) => q[0])), x1 = Math.max(...cells.map((q) => q[0]));
        for (const [col, row] of cells) {
          taken.add(col + ',' + row);
          // Booted in a left-to-right sweep from the onset, a little scatter per cell.
          const at = on[w.k] + 0.13 * ((col - x0) / Math.max(1, x1 - x0)) + 0.02 * OM.hash(col, row, 5);
          screens.push({ col, row, at, word: true, k: w.k });
        }
      });
      // Strangers' screens: ignition accelerates through the line until the dark is full.
      const rng = OM.rng(2202);
      const n = 1100;
      for (let i = 0; i < n; i++) {
        const col = C0 + Math.floor(rng() * L.cols), row = L.rMin + Math.floor(rng() * L.rows);
        if (taken.has(col + ',' + row)) continue;
        taken.add(col + ',' + row);
        const u = Math.pow(i / n, 0.55);
        screens.push({ col, row, at: start + 0.25 + u * (DROP - start - 0.45), word: false, k: -1 });
      }
      // The first screen is the spark itself.
      screens.push({ col: SC, row: SR, at: start, word: true, k: -1, spark: true });
      // Each column's lit screens drop into the centre row, the far columns last.
      for (const s of screens) s.drop = DROP + 0.32 * (Math.abs(s.col - SC) / (L.cols / 2)) + 0.06 * OM.hash(s.col, s.row, 9);
      return { set, screens };
    });

    const screen = (ctx, x, y, w, h, frame, glass) => {
      ctx.fillStyle = frame;
      ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
      ctx.fillStyle = glass;
      ctx.fillRect(x + 3, y + 3, w - 6, h - 6);
    };

    return {
      render(t, T) {
        const ctx = c.ensure();
        const dpr = c.dpr;
        if (T >= END - 0.1) return OM.handoff('line', ctx, T, dpr);
        if (T < start + 0.05) return OM.handoff('spark', ctx, T, dpr);
        ctx.fillStyle = ink.bg;
        ctx.fillRect(0, 0, 1920, 1080);
        const { screens } = lay();
        // The spark's halo fades as the first screen settles.
        B.pool(ctx, B.SPARK.x, B.SPARK.y, 72, ink.lit, 0.4 * (1 - OM.prog(T, start, start + 0.4)));
        const flick = OM.pulse(SNARES, T, 0.06);
        const snap = (v) => Math.round(v * dpr) / dpr;
        const cw = L.cw, ch = L.ch;
        for (const s of screens) {
          if (T < s.at) continue;
          const age = T - s.at;
          const d = OM.ease.inCubic(OM.prog(T, s.drop, s.drop + 0.34));
          const row = OM.lerp(s.row, SR, d);
          const x = snap(L.x0 + s.col * cw), y = snap(L.y0 + row * ch);
          if (d >= 1) { ctx.fillStyle = ink.crest; ctx.fillRect(x, y, snap(L.x0 + (s.col + 1) * cw) - x, snap(L.y0 + (SR + 1) * ch) - snap(L.y0 + SR * ch)); continue; }
          // Booting: a crest flash, then the frame cools and the glass holds its ink.
          const boot = Math.exp(-age / (s.word ? 0.12 : 0.08));
          let glass, frame;
          if (s.word) {
            // Word screens burn solid: the whole face lit, only a hairline between neighbours.
            glass = OM.mix(ink.hover, ink.crest, Math.max(boot, 0.35 + 0.65 * flick));
            frame = glass;
          } else {
            const deep = OM.hash(s.col, s.row, 3) < 0.6;
            glass = OM.mix(deep ? ink.dim : ink.mid, ink.lit, Math.max(boot, 0.4 * flick));
            frame = OM.mix(th.surface, ink.mid, boot);
          }
          if (d > 0) { glass = OM.mix(glass, ink.crest, d); frame = glass; }
          screen(ctx, x, y, cw, ch, frame, glass);
        }
        // The row closes outward from the centre into one crest line.
        const close = OM.ease.inOutCubic(OM.prog(T, CLOSE, END - 0.12));
        if (close > 0) {
          const reach = close * (L.cols / 2 + 2);
          ctx.fillStyle = ink.crest;
          for (let col = C0; col < C1; col++) if (Math.abs(col - SC) <= reach) OM.cell(ctx, L, col, SR, dpr);
        }
      },
      release: () => c.release(),
    };
  },
});
