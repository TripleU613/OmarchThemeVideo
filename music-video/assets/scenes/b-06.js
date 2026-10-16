// b-06 · Passing the flame. The surge's glow draws down into one small flame.
// Under every letter of the line stands a candle, unseen [line]; the
// flame is passed candle to candle, a spark leaping from the last candle of one
// word to the first of the next and arriving on its onset, and each candle that
// catches lights its own letter above it, the cells nearest the flame burning
// crest. The key word is passed slowly, a chain of flames along its whole hold.
// The flames duck and flare on every hard stop of the music. Then the flames
// rise off the wicks together and the room becomes one lamp's light: the spot.
OM.ownWords.add('b-06');
OM.scene({
  id: 'b-06',
  build(el, { start, duration }) {
    const B = OM.bridge;
    const cv = document.createElement('canvas');
    cv.className = 'om-fill';
    el.appendChild(cv);
    const c = OM.canvas(cv, { alpha: false });
    const END = start + duration;
    const ink = OM.fieldInks('tokyo-night');
    const th = OM.theme('tokyo-night');
    const H = B.sub(2);
    const sung = OM.sung('b-06');
    const on = sung.map((w) => B.land(w.t0, start));
    const K = 1;
    const STOPS = [214.506, 215.017, 215.179, 215.295, 215.412, 215.551, 216.549, 216.805];
    const RISE = 217.12;

    const lay = B.lazy(() => {
      const set = B.set(sung, { weight: 800, cap: 92, minCap: 60, maxW: 1640, cy: 430, lead: 2.6, maxRows: 2 });
      const candles = [];
      set.words.forEach((w) => {
        const cells = B.cells(w, set, H);
        const n = w.text.length;
        // The key word is passed along its hold; the others catch in a quick run.
        const span = w.k === K ? Math.min(0.9, (sung[K].t1 - sung[K].t0) * 0.6) : Math.min(0.2, 0.05 * n);
        for (let j = 0; j < n; j++)
          candles.push({
            k: w.k, j,
            x: w.x + (j + 0.5) * set.adv, top: w.y + set.size * 0.36,
            at: on[w.k] + (n > 1 ? (span * j) / (n - 1) : 0),
            cells: cells.filter((q) => q[2] === j),
          });
      });
      return { set, candles };
    });
    const flick = (i, T) => 0.85 + 0.15 * Math.sin(T * 23 + i * 1.7) * Math.sin(T * 9.3 + i * 0.6);
    const flame = (ctx, x, y, s, a) => {
      if (s <= 0 || a <= 0) return;
      ctx.globalAlpha = a;
      B.pool(ctx, x, y - 14 * s, 70 * s, ink.lit, 0.35);
      const P = 4;
      // A lattice flame: rows narrowing upward, crest at the heart.
      const rows = Math.round(7 * s);
      for (let r = 0; r < rows; r++) {
        const half = Math.max(0, Math.round((r < 2 ? r + 1 : rows - r) * 0.8 * s));
        for (let q = -half; q <= half; q++) {
          ctx.fillStyle = Math.abs(q) < half * 0.5 && r < rows - 2 ? ink.crest : r > rows - 3 ? ink.lit : ink.hover;
          ctx.fillRect(Math.round(x + q * P - P / 2), Math.round(y - (r + 1) * P), P, P);
        }
      }
      ctx.globalAlpha = 1;
    };
    const spot = (ctx, a) => {
      if (a <= 0) return;
      ctx.globalAlpha = a;
      const g = ctx.createLinearGradient(0, 0, 0, 880);
      g.addColorStop(0, B.rgba(ink.lit, 0.1));
      g.addColorStop(1, B.rgba(ink.lit, 0.03));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(900, 0); ctx.lineTo(1020, 0); ctx.lineTo(1400, 880); ctx.lineTo(520, 880);
      ctx.closePath();
      ctx.fill();
      ctx.save();
      ctx.translate(960, 880);
      ctx.scale(1, 110 / 440);
      const p = ctx.createRadialGradient(0, 0, 0, 0, 0, 440);
      p.addColorStop(0, B.rgba(ink.lit, 0.42));
      p.addColorStop(1, B.rgba(ink.lit, 0));
      ctx.fillStyle = p;
      ctx.fillRect(-440, -440, 880, 880);
      ctx.restore();
      ctx.globalAlpha = 1;
    };

    return {
      render(t, T) {
        const ctx = c.ensure();
        const dpr = c.dpr;
        if (T < start + 0.05 || T >= END - 0.1) return OM.handoff(T < start + 0.05 ? 'glow' : 'spot', ctx, T, dpr);
        ctx.fillStyle = ink.bg;
        ctx.fillRect(0, 0, 1920, 1080);
        const { set, candles } = lay();
        const first = candles[0];
        const rise = OM.ease.inCubic(OM.prog(T, RISE, RISE + 0.45));
        const keep = 1 - OM.prog(T, RISE + 0.1, END - 0.16);
        spot(ctx, OM.ease.inOutCubic(OM.prog(T, RISE + 0.05, END - 0.12)));

        // The glow draws down into the first flame.
        if (T < on[0] && first) {
          const u = OM.ease.inCubic(OM.prog(T, start + 0.05, on[0]));
          B.pool(ctx, OM.lerp(960, first.x, u), OM.lerp(540, first.top - 20, u), OM.lerp(620, 50, u), ink.lit, OM.lerp(0.5, 0.7, u));
          return;
        }
        const duck = OM.pulse(STOPS, T, 0.08);
        candles.forEach((cd, i) => {
          const lit = T >= cd.at;
          // The spark leaping from the previous candle, landing as this one catches.
          const prev = candles[i - 1];
          if (prev && cd.j === 0 && T < cd.at && T > cd.at - 0.2) {
            const u = OM.ease.inOutCubic(OM.prog(T, cd.at - 0.2, cd.at));
            const x = OM.lerp(prev.x, cd.x, u), y = OM.lerp(prev.top - 20, cd.top - 20, u) - Math.sin(u * Math.PI) * 120;
            ctx.globalAlpha = keep;
            B.pool(ctx, x, y, 40, ink.hover, 0.6);
            ctx.fillStyle = ink.crest;
            ctx.fillRect(x - 4, y - 4, 8, 8);
            ctx.globalAlpha = 1;
          }
          const age = T - cd.at;
          const catchF = lit ? Math.exp(-age / 0.18) : 0;
          const s = lit ? (1 + 0.8 * catchF) * flick(i, T) * (1 - 0.35 * duck) + 0.5 * duck * (T > 214.5 ? 1 : 0) : 0;
          // The candle body, lit by its own flame.
          ctx.globalAlpha = keep;
          const bw = Math.max(14, set.adv * 0.34), bh = set.cap * 0.95;
          ctx.fillStyle = lit ? OM.mix(th['surface-2'], th['text-secondary'], 0.35 + 0.3 * catchF) : OM.mix(ink.bg, th.surface, 0.5);
          ctx.fillRect(cd.x - bw / 2, cd.top, bw, bh);
          ctx.fillStyle = th['border-strong'];
          ctx.fillRect(cd.x - 1, cd.top - 8, 2, 8);
          if (!lit) return;
          // The letter above, burning by its nearness to the flame.
          const fx = cd.x, fy = cd.top - 16;
          for (const [q, r] of cd.cells) {
            const x = H.x0 + (q + 0.5) * H.cw, y = H.y0 + (r + 0.5) * H.ch;
            const d = Math.hypot(x - fx, (y - fy) * 0.8) / (set.cap * 1.3) - 0.25 * catchF - 0.1 * duck;
            ctx.fillStyle = d < 0.45 ? ink.crest : d < 0.75 ? ink.hover : ink.lit;
            OM.cell(ctx, H, q, r, dpr);
          }
          flame(ctx, fx, cd.top - 8 - rise * 260, s * (1 - 0.5 * rise), keep);
        });
        ctx.globalAlpha = 1;
      },
      release: () => c.release(),
    };
  },
});
