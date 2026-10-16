// b-05 · The glow escapes. The screen pulls back into a notebook computer on a dark floor
// and its glass fills with green light that will not stay in: it pours over
// the bottom edge, down the deck, and pools on the floor. From the pool the
// light runs out along the floor in lattice channels, one to each word, the
// front reaching the word exactly on its onset and flooding its letters, so
// the line is written in light that left the machine. The key word lands on
// the downbeat with the biggest flood; the kicks send pulses down every
// channel. On the riser the light swells past the letters and the machine until
// it is one wide glow, the surge.
OM.ownWords.add('b-05');
OM.scene({
  id: 'b-05',
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
    const sung = OM.sung('b-05');
    const on = sung.map((w) => B.land(w.t0, start));
    const K = 3; // the key word, on the 210.257 downbeat
    const KICKS = [209.816, 211.278, 212.904];
    const SWELL = 212.75;
    const S1 = 0.36, CX = 960, CY = 222; // the machine's screen at rest: scale and centre
    const POUR = start + 0.08, IMPACT = { x: 960, y: 452 };

    const lay = B.lazy(() => {
      const set = B.set(sung, { weight: 800, cap: 100, minCap: 80, maxW: 1780, cy: 745, lead: 1.62 });
      const toQ = (x) => Math.floor((x - H.x0) / H.cw), toR = (y) => Math.floor((y - H.y0) / H.ch);
      const words = set.words.map((w, k) => {
        const cells = B.cells(w, set, H);
        const q0 = Math.min(...cells.map((p) => p[0])), q1 = Math.max(...cells.map((p) => p[0]));
        // The channel: down from the pool to the gutter above the text, out along it,
        // round the side of the block to the word's own gutter, then down into the word.
        const gy = (y) => toR(y - set.cap - set.cap * 0.45);
        const pts = [];
        const add = (q, r) => { const l = pts[pts.length - 1]; if (!l || l[0] !== q || l[1] !== r) pts.push([q, r]); };
        const qa = toQ(IMPACT.x), ra = toR(IMPACT.y), r0g = gy(set.words[0].y), rg = gy(w.y);
        const qe = toQ(w.x + Math.min(w.w / 2, set.adv * 0.5));
        const rt = Math.min(...cells.map((p) => p[1]));
        for (let r = ra; r <= r0g; r++) add(qa, r);
        if (w.row === 0) {
          for (let q = qa; q !== qe; q += Math.sign(qe - qa)) add(q, r0g);
        } else {
          const left = w.x + w.w / 2 < 960;
          const qs = left ? toQ(Math.min(...set.words.map((v) => v.x)) - 34) : toQ(Math.max(...set.words.map((v) => v.x + v.w)) + 34);
          for (let q = qa; q !== qs; q += Math.sign(qs - qa)) add(q, r0g);
          for (let r = r0g; r <= rg; r++) add(qs, r);
          for (let q = qs; q !== qe; q += Math.sign(qe - qs)) add(q, rg);
        }
        for (let r = rg; r < rt; r++) add(qe, r);
        return { cells, q0, q1, pts, w };
      });
      return { set, words };
    });
    // The machine at camera scale s: screen rect and deck.
    const machine = (ctx, s, glow, alphaDeck) => {
      const w = 1280 * s, h = 800 * s;
      const x = OM.lerp(320, CX - w / 2, (1 - s) / (1 - S1)), y = OM.lerp(140, CY - h / 2, (1 - s) / (1 - S1));
      if (alphaDeck > 0) {
        ctx.globalAlpha = alphaDeck;
        ctx.fillStyle = th['surface-2'];
        ctx.beginPath();
        ctx.moveTo(x - 30 * s / S1, y + h + 4);
        ctx.lineTo(x + w + 30 * s / S1, y + h + 4);
        ctx.lineTo(x + w + 70 * s / S1, y + h + 40 * s / S1);
        ctx.lineTo(x - 70 * s / S1, y + h + 40 * s / S1);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = th['border-strong'];
        ctx.fillRect(x - 70 * s / S1, y + h + 40 * s / S1 - 3, w + 140 * s / S1, 3);
        ctx.globalAlpha = 1;
      }
      ctx.fillStyle = th.bg;
      ctx.fillRect(x, y, w, h);
      if (glow > 0) {
        ctx.globalAlpha = glow;
        const g = ctx.createLinearGradient(0, y, 0, y + h);
        g.addColorStop(0, B.rgba(ink.lit, 0.35));
        g.addColorStop(1, B.rgba(ink.hover, 0.95));
        ctx.fillStyle = g;
        ctx.fillRect(x, y, w, h);
        ctx.globalAlpha = 1;
      }
      ctx.strokeStyle = ink.mid;
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
      return { x, y, w, h };
    };

    return {
      render(t, T) {
        const ctx = c.ensure();
        const dpr = c.dpr;
        if (T < start + 0.05 || T >= END - 0.1) return OM.handoff(T < start + 0.05 ? 'screen' : 'glow', ctx, T, dpr);
        ctx.fillStyle = ink.bg;
        ctx.fillRect(0, 0, 1920, 1080);
        const { set, words } = lay();
        const swell = OM.ease.inOutCubic(OM.prog(T, SWELL, END - 0.12));
        // The surge's glow grows underneath everything else.
        B.pool(ctx, 960, 540, 620, ink.lit, 0.5 * swell);
        const keep = 1 - swell;
        ctx.globalAlpha = keep;

        const pull = OM.ease.inOutCubic(OM.prog(T, start + 0.05, on[0] + 0.06));
        const s = OM.lerp(1, S1, pull);
        const fill = OM.ease.outCubic(OM.prog(T, start + 0.05, on[0] + 0.1));
        const scr = machine(ctx, s, fill * keep, pull * keep);
        ctx.globalAlpha = keep;
        const kick = OM.pulse(KICKS, T, 0.1);

        // The pour: a falling sheet of light over the deck's lip to the floor.
        const pourA = OM.prog(T, POUR, on[0]);
        if (pull > 0.6) {
          const q0 = Math.floor((960 - 70 - H.x0) / H.cw), q1 = Math.floor((960 + 70 - H.x0) / H.cw);
          const r0 = Math.floor((scr.y + scr.h + 40 * s / S1 - H.y0) / H.ch), r1 = Math.floor((IMPACT.y - H.y0) / H.ch);
          const reach = r0 + (r1 - r0) * OM.ease.inCubic(pourA);
          for (let q = q0; q <= q1; q++)
            for (let r = r0; r <= reach; r++) {
              const f = OM.hash(q, Math.floor(r - T * 40), 2);
              if (f < 0.35) continue;
              ctx.fillStyle = f > 0.85 ? ink.crest : f > 0.6 ? ink.hover : ink.lit;
              OM.cell(ctx, H, q, r, dpr);
            }
          B.pool(ctx, IMPACT.x, IMPACT.y, 160 + 90 * pourA, ink.lit, keep * (0.3 * pourA + 0.12 * kick));
          // The pool on the floor.
          const pr = 10 * pourA + 4 * kick;
          ctx.fillStyle = ink.hover;
          for (let q = -pr; q <= pr; q++) {
            const qq = Math.floor((IMPACT.x - H.x0) / H.cw) + Math.round(q);
            const hh = Math.round((1 - Math.abs(q) / (pr + 1)) * 2.5);
            for (let r = -hh; r <= hh; r++) OM.cell(ctx, H, qq, Math.floor((IMPACT.y - H.y0) / H.ch) + r, dpr);
          }
        }

        // The channels: each front races out of the pool and reaches its word on the onset.
        for (const w of words) {
          const o = on[w.w.k], run = w.pts.length;
          const go = w.w.k ? Math.max(on[w.w.k - 1], o - 0.3) : POUR;
          const f = OM.ease.inCubic(OM.prog(T, go, o));
          const n = Math.floor(f * run);
          for (let i = 0; i < n; i++) {
            const [q, r] = w.pts[i];
            const pulse = KICKS.reduce((m, kk) => (T >= kk ? Math.max(m, Math.exp(-Math.abs((T - kk) * 90 - i) / 3) * Math.exp(-(T - kk) / 0.5)) : m), 0);
            ctx.fillStyle = i >= n - 2 && f < 1 ? ink.crest : OM.mix(ink.mid, ink.crest, pulse);
            OM.cell(ctx, H, q, r, dpr);
          }
          // The flood: the letters fill left to right from the onset, crest cooling to their ink.
          if (T < o) continue;
          const key = w.w.k === K;
          const sweep = OM.prog(T, o, o + (key ? 0.2 : 0.14));
          const a = T - o;
          if (key) B.pool(ctx, w.w.x + w.w.w / 2, w.w.y - set.cap / 2, Math.max(260, w.w.w), ink.lit, keep * (0.3 * Math.exp(-a / 0.4) + 0.08));
          for (const [q, r] of w.cells) {
            const u = (q - w.q0) / Math.max(1, w.q1 - w.q0);
            if (u > sweep + 1e-6) continue;
            const age = a - u * (key ? 0.2 : 0.14);
            const th0 = OM.threshold(q, r);
            const cool = age / (key ? 0.6 : 0.35);
            ctx.fillStyle = th0 > cool ? ink.crest : key ? ink.crest : ink.hover;
            if (!key && th0 < cool - 0.6) ctx.fillStyle = ink.lit;
            OM.cell(ctx, H, q, r, dpr);
          }
        }
        ctx.globalAlpha = 1;
      },
      release: () => c.release(),
    };
  },
});
