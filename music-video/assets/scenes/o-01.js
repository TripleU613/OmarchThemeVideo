// o-01 · Home, built from the field. Over the homepage (the word handoff), the
// sung line becomes the hero's headline in half lattice cells: each word's cells
// fly in from the field and slam into place on its onset, crest on impact, and
// the impact lights the field and the wordmark around it. The key word comes in
// from every side with the biggest blast and flashes the whole line; on the hard
// stop the two buttons build in, dither order, and the page settles to the
// shared resting homepage x-end drains.
OM.ownWords.add('o-01');
OM.scene({
  id: 'o-01',
  build(el, { start, duration }) {
    const cv = document.createElement('canvas');
    cv.className = 'om-fill';
    el.appendChild(cv);
    const c = OM.canvas(cv, { alpha: false });
    const ink = OM.fieldInks('tokyo-night');
    const th = OM.theme('tokyo-night');
    const O = OM.outro;
    const end = start + duration;
    const on = OM.words('o-01');
    const last = on.length - 1;
    const STOP = 292.107; // the hard stop after the key word: the buttons
    const DUR = (w) => (w === last ? 0.16 : 0.1);
    const REST = 293.4; // every light has decayed to nothing by here

    /** Where a headline cell flies in from: above for most words, out of every side for the key word. */
    const from = (k, lay) => {
      const h1 = OM.hash(k.q, k.r, 31), h2 = OM.hash(k.q, k.r, 32);
      if (k.w !== last) return { x: (h1 - 0.5) * 180, y: -(60 + 160 * h2) };
      const ctr = lay.centre[k.w];
      const x = O.H.x0 + (k.q + 0.5) * O.H.cw - ctr.x, y = O.H.y0 + (k.r + 0.5) * O.H.ch - ctr.y;
      const d = Math.hypot(x, y) || 1, f = 260 + 420 * h1;
      return { x: (x / d) * f + (h2 - 0.5) * 120, y: (y / d) * f * 0.8 - 80 * h2 };
    };

    return {
      render(t, T) {
        const ctx = c.ensure();
        const dpr = c.dpr;
        ctx.globalAlpha = 1;
        if (T < Math.min(on[0], start + 0.07)) return OM.handoff('word', ctx, T, dpr);
        const lay = O.layout();
        if (T >= REST || T >= end - 0.07) return O.page(ctx, T, dpr);
        // Impacts: each word lights the field and wordmark where it lands; the key word lights the page.
        const glows = [];
        on.forEach((t0, i) => {
          const a = T - (t0 + DUR(i));
          if (a < 0 || a > 1.6) return;
          const big = i === last;
          glows.push({ x: lay.centre[i].x, y: lay.centre[i].y, strength: (big ? 1.35 : 0.95) * Math.exp(-a / (big ? 0.3 : 0.16)), reach: big ? 780 : 300 });
        });
        const flash = T - (on[last] + DUR(last)); // the whole line flashes when the key word lands
        const head = (k) => {
          const t0 = on[k.w];
          if (T < t0) return null;
          const a = T - t0, dur = DUR(k.w);
          const e = OM.ease.outExpo(OM.clamp(a / dur));
          const f = from(k, lay);
          let col = a < dur + 0.05 ? ink.crest : a < dur + 0.3 ? ink.hover : th.text;
          if (flash >= 0 && flash < 0.5) col = flash < 0.08 ? ink.crest : flash < 0.3 ? ink.hover : col;
          return { ink: col, dx: f.x * (1 - e), dy: f.y * (1 - e) };
        };
        O.page(ctx, T, dpr, { glows, head, buttons: OM.prog(T, STOP, STOP + 0.24) });
      },
      release: () => c.release(),
    };
  },
});
