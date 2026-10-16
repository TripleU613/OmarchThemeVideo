// c3-04 · Stadium wave. The spotlight is the stage; the camera pulls back off
// it and a whole stadium of phone lights fills the stands behind. The wave runs
// round the bowl, and the phones it passes over spell the line: each word
// lights as the wave sweeps across it on its onset and stays held up, while the
// rest of the crowd rises and falls behind the front. The held key word is the
// widest, the wave crossing it on the kicks. On the downbeat after the line
// every phone in the house flares, and the crowd dissolves cell by cell into
// the homepage field.
OM.ownWords.add('c3-04');
OM.scene({
  id: 'c3-04',
  build(el, { start, duration }) {
    const C = OM.c3;
    const cv = document.createElement('canvas');
    cv.className = 'om-fill';
    el.appendChild(cv);
    const c = OM.canvas(cv, { alpha: false });
    const END = start + duration;
    const ink = C.ink, th = C.th;
    const words = OM.sung('c3-04');
    const on = words.map((w) => w.t0);
    const n = words.length;
    const KEY = words.reduce((b, w, k) => (w.t1 - w.t0 > words[b].t1 - words[b].t0 ? k : b), 0);
    const FLARE = 259.367, KICKS = [255.954, 256.302, 256.813, 256.929, 257.207, 257.347, 258.485, 259.065];
    const CELL = 6, SW = 0.14; // phone cell px; seconds the wave takes to cross a word
    const ZOOM = 2.4; // how far in the camera starts, on the stage
    const split = Math.min(n, KEY + 1);

    const P = { crest: C.pack(ink.crest), hover: C.pack(ink.hover), lit: C.pack(ink.lit), mid: C.pack(ink.mid), dim: C.pack(ink.dim) };
    const SEAT = [C.pack(th['bg-deep'] || '#16161e'), C.pack(ink.bg)];
    const STANDS = (x, y) => y > 120 + 0.00012 * (x - 960) ** 2 && y < 770 - 0.00008 * (x - 960) ** 2; // the bowl's tiers
    const type = C.lazy(() => {
      const rows = [{ ks: [...Array(split).keys()], cap: 116, cy: 300 }, { ks: [...Array(n - split).keys()].map((i) => i + split), cap: 116, cy: 540 }];
      const place = C.layout(words, rows, { maxW: 1600 });
      const M = C.mask(words, place, 800, CELL);
      return { place, M, B: C.buffer(M.GW, M.GH) };
    });
    // The wave front's x over time: it crosses each word on its onset, row by row.
    const front = (place, T) => {
      const knots = [[start, -300]];
      words.forEach((w, k) => {
        const p = place[k];
        if (!p) return;
        if (k === split) knots.push([on[k] - 0.02, -300]);
        knots.push([on[k], p.x], [on[k] + SW * (k === KEY ? 2.5 : 1), p.x + p.w]);
      });
      const last = knots[knots.length - 1];
      knots.push([last[0] + 0.5, 2300]);
      for (let i = 1; i < knots.length; i++) {
        const [t1, x1] = knots[i], [t0, x0] = knots[i - 1];
        if (T < t1) return t1 > t0 ? OM.lerp(x0, x1, OM.prog(T, t0, t1)) : x1;
      }
      // After the line, the wave keeps going round on the beat.
      return -300 + ((T - last[0] - 0.5) * 2600) % 2600;
    };

    return {
      render(t, T) {
        const ctx = c.ensure();
        const dpr = c.dpr;
        if (C.seam(ctx, T, dpr, start, END, 'spot', 'field')) return;
        const { place, M, B } = type();
        const { GW, GH, of } = M, buf = B.buf;
        const z = OM.lerp(ZOOM, 1, OM.ease.outCubic(OM.prog(T, start + 0.02, start + 0.5)));
        const crowdA = C.sm(T, start + 0.02, start + 0.22);
        const flare = C.decay(T, FLARE, 0.14) * (T >= FLARE ? 1 : 0);
        const melt = OM.prog(T, FLARE + 0.08, END - 0.1); // the crowd dissolving into the field
        const X = front(place, T);
        const kick = OM.pulse(KICKS, T, 0.1);

        ctx.fillStyle = ink.bg;
        ctx.fillRect(0, 0, 1920, 1080);
        if (melt > 0) OM.hero(ctx, T, dpr, { inks: ink, L: OM.HOME, word: false, gain: 0.8, bg: false, mask: (col, row) => (OM.threshold(col, row) < melt * 1.1 ? 1 : 0) });

        for (let j = 0; j < GH; j++) {
          const y = (j + 0.5) * CELL;
          for (let i = 0; i < GW; i++) {
            const idx = j * GW + i, x = (i + 0.5) * CELL;
            buf[idx] = 0;
            const h = OM.hash(i, j, 0x5404);
            if (melt > 0 && h < melt * 1.1) continue;
            const k = of[idx];
            if (!STANDS(x, y) && k < 0) continue;
            const tier = Math.floor((y - 120) / 18);
            let p = SEAT[tier & 1];
            const dx = X - x;
            const cross = k >= 0 ? on[k] + SW * (k === KEY ? 2.5 : 1) * OM.clamp((x - place[k].x) / place[k].w) : 0;
            if (k >= 0 && T >= cross) {
              // A word phone: held up once the wave has crossed it, flashing at the crossing.
              const since = T - cross;
              const v = (since < 0.1 ? 1.2 : 0.6) + flare + 0.25 * kick * (k === KEY ? 1 : 0.4) + (h > 0.85 ? 0.2 : 0);
              p = v > 1 ? P.crest : v > 0.5 ? P.hover : P.lit;
            } else if (h < 0.26) {
              // A crowd phone: dim, rising as the wave passes, every one of them flaring on the downbeat.
              let v = 0.06 + 0.12 * (0.5 + 0.5 * Math.sin(T * 4 + h * 90));
              if (dx > -40 && dx < 220) v += dx < 0 ? 0.8 : 0.8 * (1 - dx / 220);
              v += flare * 1.2;
              p = v > 0.9 ? P.hover : v > 0.5 ? P.lit : v > 0.22 ? P.mid : P.dim;
            }
            buf[idx] = p;
          }
        }
        ctx.save();
        ctx.globalAlpha = crowdA;
        ctx.translate(960, 880);
        ctx.scale(z, z);
        ctx.translate(-960, -880);
        B.draw(ctx, 0, 0, GW * CELL, GH * CELL);
        ctx.restore();

        // The stage under its spotlight, shrinking as the camera pulls back.
        const zs = z / ZOOM, stageA = 1 - C.sm(T, FLARE, FLARE + 0.3);
        if (stageA > 0.01) {
          ctx.save();
          ctx.globalAlpha = stageA;
          ctx.translate(960, 880);
          ctx.scale(OM.lerp(1, zs, crowdA), OM.lerp(1, zs, crowdA));
          ctx.translate(-960, -880);
          const g = ctx.createLinearGradient(0, 0, 0, 880);
          g.addColorStop(0, C.rgba(ink.lit, 0.1));
          g.addColorStop(1, C.rgba(ink.lit, 0.03));
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.moveTo(900, 0);
          ctx.lineTo(1020, 0);
          ctx.lineTo(1400, 880);
          ctx.lineTo(520, 880);
          ctx.closePath();
          ctx.fill();
          ctx.save();
          ctx.translate(960, 880);
          ctx.scale(1, 110 / 440);
          const pg = ctx.createRadialGradient(0, 0, 0, 0, 0, 440);
          pg.addColorStop(0, C.rgba(ink.lit, 0.42 + 0.2 * kick * crowdA));
          pg.addColorStop(1, C.rgba(ink.lit, 0));
          ctx.fillStyle = pg;
          ctx.fillRect(-440, -440, 880, 880);
          ctx.restore();
          ctx.restore();
        }
      },
      release: () => c.release(),
    };
  },
});
