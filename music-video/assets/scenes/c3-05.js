// c3-05 · Bloom. The homepage field is a meadow of buds. On each onset a bed
// of lattice flowers opens in the shape of the word, petals unfolding across it
// left to right, crest hearts in hover petals; the key word opens on the
// downbeat, biggest, and from it the bloom runs out through every lit cell of
// the field to the edges of the frame on the kick fill. Then the flowers fold
// shut again, words first, back into buds, and the meadow is the field.
OM.ownWords.add('c3-05');
OM.scene({
  id: 'c3-05',
  build(el, { start, duration }) {
    const C = OM.c3;
    const cv = document.createElement('canvas');
    cv.className = 'om-fill';
    el.appendChild(cv);
    const c = OM.canvas(cv, { alpha: false });
    const END = start + duration;
    const ink = C.ink;
    const L = OM.HOME;
    const words = OM.sung('c3-05');
    const on = words.map((w) => w.t0);
    const n = words.length;
    const DOWN = 261.503, FILL = 261.735, CLOSE = 262.4;
    const KEY = words.reduce((b, w, k) => (Math.abs(w.t0 - DOWN) < Math.abs(words[b].t0 - DOWN) ? k : b), 0);
    const OPEN = 0.22; // seconds for the bloom to cross a word

    const type = C.lazy(() => {
      const first = words.map((_, k) => k).filter((k) => k !== KEY);
      const rows = [{ ks: first, cap: 104, cy: 380 }, { ks: [KEY], cap: 170, cy: 650 }];
      const place = C.layout(words, rows);
      const pts = C.wordPts(words, place, 800, (p) => Math.max(10, Math.round(p.cap / 10)));
      return { place, pts, step: place.map((p) => (p ? Math.max(10, Math.round(p.cap / 10)) : 10)) };
    });
    /** A lattice flower of size s (0..1 open) at x,y: a crest heart and four petals. */
    const flower = (ctx, x, y, s, size, heart, petal) => {
      if (s <= 0.02) return;
      const u = Math.max(1, Math.round((size / 3) * Math.min(1, s)));
      const reach = Math.round(u * (0.4 + 0.6 * s));
      ctx.fillStyle = petal;
      ctx.fillRect(Math.round(x - u / 2) - reach, Math.round(y - u / 2), u, u);
      ctx.fillRect(Math.round(x - u / 2) + reach, Math.round(y - u / 2), u, u);
      ctx.fillRect(Math.round(x - u / 2), Math.round(y - u / 2) - reach, u, u);
      ctx.fillRect(Math.round(x - u / 2), Math.round(y - u / 2) + reach, u, u);
      ctx.fillStyle = heart;
      ctx.fillRect(Math.round(x - u / 2), Math.round(y - u / 2), u, u);
    };
    const closeAt = (x) => CLOSE + 0.25 * OM.clamp(Math.abs(x - 960) / 960); // the words shut first, the edges last

    return {
      render(t, T) {
        const ctx = c.ensure();
        const dpr = c.dpr;
        if (C.seam(ctx, T, dpr, start, END, 'field', 'field')) return;
        const { place, pts, step } = type();
        OM.handoff('field', ctx, T, dpr);
        const keyP = place[KEY] || { cx: 960, cy: 650 };

        // The meadow: lit field cells bloom as the wave out of the key word reaches them, and fold before the cut.
        if (T > DOWN) {
          const lit = OM.heroLit(T, L, { gain: 1.15 });
          for (const cl of lit) {
            const x = L.x0 + (cl.col + 0.5) * L.cw, y = L.y0 + (cl.row + 0.5) * L.ch;
            const d = Math.hypot(x - keyP.cx, (y - keyP.cy) * 1.4);
            const tb = DOWN + 0.05 + d / 1500;
            const s = OM.ease.outBack(OM.clamp((T - tb) / 0.25)) * (1 - OM.ease.inCubic(OM.prog(T, closeAt(x), END - 0.12)));
            if (s <= 0.02) continue;
            ctx.fillStyle = ink.bg;
            OM.cell(ctx, L, cl.col, cl.row, dpr);
            const age = T - tb;
            flower(ctx, x, y, s, L.cw, age < 0.12 ? ink.crest : ink.hover, cl.heat > 0.5 ? ink.lit : ink.mid);
          }
        }
        // A green haze over the beds as they open.
        let haze = 0;
        for (let k = 0; k < n; k++) haze = Math.max(haze, (k === KEY ? 0.3 : 0.18) * C.decay(T, on[k], 0.2));
        C.pool(ctx, 960, 540, 900, ink.lit, haze + 0.06 * C.sm(T, on[0], on[0] + 0.3) * (1 - C.sm(T, CLOSE, END - 0.1)));

        // The word beds.
        words.forEach((wd, k) => {
          const p = place[k];
          if (!p || T < on[k]) return;
          const P = pts[k], sz = step[k], big = k === KEY;
          for (let i = 0; i < P.length; i += 2) {
            const x = P[i], y = P[i + 1];
            const tb = on[k] + OPEN * (big ? 0.7 : 1) * OM.clamp((x - p.x) / p.w);
            const open = OM.ease.outBack(OM.clamp((T - tb) / 0.16), 2.2);
            const shut = 1 - OM.ease.inCubic(OM.prog(T, closeAt(x) - 0.05, Math.min(closeAt(x) + 0.3, END - 0.1)));
            const s = Math.max(T >= on[k] ? 0.25 : 0, open) * shut;
            if (s <= 0.02) continue;
            const age = T - tb;
            const kickGlow = big ? OM.pulse([261.062, 261.201, 262.525, 262.757], T, 0.1) : 0;
            const heart = age < 0.1 || kickGlow > 0.5 ? ink.crest : (OM.hash(x, y, k) > 0.3 ? ink.crest : ink.hover);
            flower(ctx, x, y, s, sz * 1.15, heart, age < 0.2 ? ink.crest : ink.hover);
          }
        });
      },
      release: () => c.release(),
    };
  },
});
