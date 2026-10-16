// b-03 · The road that paves itself. The crest line splits into curbs: two
// lanes of road, and a road roller on each. The road only exists just ahead of
// a drum: on each word's onset a stretch of pavers drops into place in front of
// its lane's roller, and the pavers that drop lit are that word's letters. The
// roller then presses its way across them, the fresh crest cooling as it is
// rolled flat, thumping on the kicks, so the line is laid as road. When the
// last word is down the rollers run on out of frame, still going, and the
// pavers settle back into the lattice they were cut from: the board.
OM.ownWords.add('b-03');
OM.scene({
  id: 'b-03',
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
    const sung = OM.sung('b-03');
    const on = sung.map((w) => B.land(w.t0, start));
    const n = on.length;
    const KICKS = [202.176, 203.221, 203.639, 204.568];
    const EXIT = 204.3, SETTLE = 204.95;
    const SR = B.SPARK.row;
    const DW = 54;

    const lay = B.lazy(() => {
      const set = B.set(sung, { weight: 800, cap: 104, minCap: 80, maxW: 1700, cy: B.SPARK.y + 4, lead: 2.05, maxRows: 2 });
      const letters = set.words.map((w) => B.cells(w, set, H));
      // One lane per row: its band hugs the row's letters.
      const lanes = set.rows.map((ks) => {
        const cells = ks.flatMap((k) => letters[k]);
        const first = set.words[ks[0]], last = set.words[ks[ks.length - 1]];
        return {
          ks,
          rTop: Math.min(...cells.map((q) => q[1])) - 3,
          rBot: Math.max(...cells.map((q) => q[1])) + 3,
          xL: first.x - 40,
          xR: last.x + last.w + DW + 30, // the drum clears the lane's last letter
        };
      });
      const lit = new Map();
      letters.forEach((cells, k) => cells.forEach(([q, r]) => lit.set(q + ',' + r, k)));
      const spans = [], pavers = [];
      lanes.forEach((ln) => {
        ln.ks.forEach((k, i) => {
          const w = set.words[k];
          const x0 = i ? set.words[ln.ks[i - 1]].x + set.words[ln.ks[i - 1]].w : ln.xL;
          const x1 = i === ln.ks.length - 1 ? ln.xR : w.x + w.w;
          spans[k] = { x0, x1, lane: ln };
          const q0 = Math.floor((x0 - H.x0) / H.cw), q1 = Math.ceil((w.x + w.w - H.x0) / H.cw) + (i === ln.ks.length - 1 ? 3 : 0);
          for (let q = q0; q < q1; q++)
            for (let r = ln.rTop; r <= ln.rBot; r++) {
              // Laid in a fast front from the roller forward.
              const f = (q - q0) / Math.max(1, q1 - q0);
              pavers.push({ q, r, k, letter: lit.has(q + ',' + r), at: on[k] + 0.12 * f + 0.015 * OM.hash(q, r, 4) });
            }
        });
      });
      return { set, lanes, spans, pavers };
    });

    // A lane's drum front, in CSS px: it rolls across each word between its onset and the next.
    const rollerX = (T, ln, spans) => {
      let x = ln.xL;
      ln.ks.forEach((k, i) => {
        if (T < on[k]) return;
        const nk = ln.ks[i + 1];
        const stop = nk !== undefined ? on[nk] : Math.min(EXIT, on[k] + 0.7);
        x = OM.lerp(spans[k].x0, spans[k].x1, OM.ease.outCubic(OM.prog(T, on[k], stop)));
      });
      return x + 2200 * OM.ease.inCubic(OM.prog(T, EXIT, EXIT + 0.7));
    };
    const grid = (ctx, dpr, a) => {
      const L = OM.HOME, snap = (v) => Math.round(v * dpr) / dpr;
      ctx.globalAlpha = a;
      ctx.fillStyle = th['border-subtle'];
      for (let col = L.cMin; col <= L.cMin + L.cols; col++) ctx.fillRect(snap(L.x0 + col * L.cw), 0, 1, 1080);
      for (let row = L.rMin; row <= L.rMin + L.rows; row++) ctx.fillRect(0, snap(L.y0 + row * L.ch), 1920, 1);
      ctx.globalAlpha = 1;
    };

    return {
      render(t, T) {
        const ctx = c.ensure();
        const dpr = c.dpr;
        if (T < on[0] || T >= END - 0.1) return OM.handoff(T < on[0] ? 'line' : 'grid', ctx, T, dpr);
        ctx.fillStyle = ink.bg;
        ctx.fillRect(0, 0, 1920, 1080);
        const { lanes, spans, pavers } = lay();
        const settle = OM.ease.inOutCubic(OM.prog(T, SETTLE, END - 0.14));
        grid(ctx, dpr, settle);
        const fade = 1 - settle;

        // The curbs: the crest line splits outward to every lane's edges on the first word, then cools.
        const split = OM.ease.outExpo(OM.prog(T, on[0], on[0] + 0.22));
        ctx.globalAlpha = fade;
        ctx.fillStyle = OM.mix(ink.crest, ink.mid, OM.prog(T, on[0], on[0] + 0.6));
        for (const ln of lanes)
          for (const [from, to] of [[2 * SR, ln.rTop - 2], [2 * SR + 1, ln.rBot + 2]])
            ctx.fillRect(0, Math.round((H.y0 + OM.lerp(from, to, split) * H.ch) * dpr) / dpr, 1920, H.ch);

        const rx = lanes.map((ln) => rollerX(T, ln, spans));
        const thump = KICKS.reduce((s, k) => s + (T >= k ? 4 * Math.exp(-(T - k) / 0.06) : 0), 0);
        // The pavers: dropped in from above the road, then pressed flat under the drum.
        for (const p of pavers) {
          if (T < p.at) continue;
          const drop = OM.ease.inCubic(OM.prog(T, p.at, p.at + 0.09));
          const x = rx[lanes.indexOf(spans[p.k].lane)];
          const px = H.x0 + (p.q + 0.5) * H.cw, pressed = px < x - 10;
          const sinceP = pressed ? OM.clamp((x - 10 - px) / 220) : 0;
          let fill;
          if (p.letter) fill = pressed ? OM.mix(ink.crest, p.k === n - 1 || p.k === 1 ? ink.hover : ink.lit, sinceP) : ink.crest;
          else fill = pressed ? th['surface-2'] : th.surface;
          const k = OM.lerp(1.9, 1, drop) * (p.letter ? 1 : 0.86);
          const w = H.cw * k, h = H.ch * k;
          ctx.globalAlpha = fade * OM.clamp(drop * 2.5);
          ctx.fillStyle = fill;
          ctx.fillRect(px - w / 2, H.y0 + (p.r + 0.5) * H.ch - h / 2 - (1 - drop) * 18, w, h);
        }
        ctx.globalAlpha = fade;

        // The rollers: a ribbed drum on each lane, a short handle frame trailing inside the road.
        lanes.forEach((ln, i) => {
          const x = rx[i];
          if (x > 2000 || T < on[ln.ks[0]] - 0.4) return;
          const y0 = H.y0 + (ln.rTop - 3) * H.ch - thump, y1 = H.y0 + (ln.rBot + 4) * H.ch - thump;
          ctx.fillStyle = th['border-strong'];
          ctx.fillRect(x - DW, y0, DW, y1 - y0);
          ctx.fillStyle = th.surface;
          const ph = ((x / 9) % 1 + 1) % 1;
          for (let j = 0; j < 6; j++) ctx.fillRect(x - DW + ((j + ph) / 6) * DW, y0, 3, y1 - y0);
          ctx.fillStyle = ink.crest;
          ctx.fillRect(x - 3, y0, 3, y1 - y0);
          ctx.fillStyle = ink.lit;
          ctx.fillRect(x - DW - 6, y0 - 8, DW + 12, 8);
          // Grit thrown up on the kicks.
          for (const k of KICKS) {
            const a = T - k;
            if (a < 0 || a > 0.3) continue;
            for (let j = 0; j < 10; j++) {
              const u = OM.hash(j, Math.round(k * 100) + i, 7);
              ctx.globalAlpha = fade * (1 - a / 0.3);
              ctx.fillStyle = ink.hover;
              ctx.fillRect(x + 8 + a * 260 * u, OM.lerp(y0, y1, OM.hash(j, 3, Math.round(k * 100))) - a * 90 * (u - 0.3), 4, 4);
            }
            ctx.globalAlpha = fade;
          }
        });
        ctx.globalAlpha = 1;
      },
      release: () => c.release(),
    };
  },
});
