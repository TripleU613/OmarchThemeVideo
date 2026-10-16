// x-end · Power off. The resting homepage (o-01's last frame) drains cell by
// cell, edges first, in the field's own dither order, the snare and kick each
// taking a bite, converging on the one cell that never drains: the cursor from
// the film's first frame. It blinks on the beat, alone, then goes out: night.
OM.scene({
  id: 'x-end',
  build(el, { start, duration }) {
    const cv = document.createElement('canvas');
    cv.className = 'om-fill';
    el.appendChild(cv);
    const c = OM.canvas(cv, { alpha: false });
    const ink = OM.fieldInks('tokyo-night');
    const O = OM.outro;
    const end = start + duration;
    const DRAIN0 = start + 0.07, DRAIN_END = 297.6, LAST = 299.1;
    const HITS = [295.079, 295.381]; // snare, kick
    const beats = OM.beatsIn(start, end);
    const bite = (T) => HITS.reduce((s, h) => s + (T < h ? 0 : 0.17 * (1 - Math.exp(-(T - h) / 0.05))), 0);
    return {
      render(t, T) {
        const ctx = c.ensure();
        const dpr = c.dpr;
        ctx.globalAlpha = 1;
        if (T >= end - 0.1) return OM.handoff('night', ctx, T, dpr);
        if (T < DRAIN_END) {
          const q = 1 - Math.pow(1 - OM.prog(T, DRAIN0, DRAIN_END), 2); // quick off the edges, slow into the cursor
          const left = T < DRAIN0 ? 1 : 1 - (q + (1 - q) * bite(T));
          return O.page(ctx, T, dpr, { left });
        }
        // The cursor alone: on for half of every beat, crest as it strikes, until the last one.
        OM.handoff('night', ctx, T, dpr);
        const b = OM.lastHit(beats, T);
        if (b !== null && b < LAST && T - b < OM.SPB / 2) {
          ctx.fillStyle = T - b < 0.05 ? ink.crest : ink.lit;
          OM.cell(ctx, OM.HOME, O.cursor.col, O.cursor.row, dpr);
        }
      },
      release: () => c.release(),
    };
  },
});
