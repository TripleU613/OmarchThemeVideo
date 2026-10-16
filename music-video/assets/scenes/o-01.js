// o-01 · Home, built from the field. Over the homepage (the word handoff), the
// sung line becomes the hero's headline in half lattice cells: each word's cells
// fly in from the field and slam into place on its onset, crest on impact, and
// the impact lights the field and the wordmark around it. The key word comes in
// from every side with the biggest blast and flashes the whole line; on the hard
// stop the two buttons build in, dither order, and the page settles to the
// shared resting homepage x-end drains.
OM.ownWords.add('o-01');
// One clean glint: a narrow diagonal highlight crossing the frame once (uP0.x its position),
// catching only what is lit, so the words brighten and never hide.
const O01_FX = `
vec4 effect(vec2 uv) {
  vec3 c = src(cam(uv)).rgb;
  if (uAmount <= 0.0) return vec4(c, 1.0);
  float a = uRes.x / uRes.y;
  float s = uv.x * a + uv.y * 0.55;
  float pos = mix(-0.5, a + 1.0, uP0.x);
  float band = exp(-pow((s - pos) / 0.03, 2.0)) + 0.3 * exp(-pow((s - pos) / 0.11, 2.0));
  float l = dot(c, vec3(0.3, 0.55, 0.15));
  c += uAmount * band * vec3(0.855, 0.925, 0.776) * (0.06 + 0.9 * smoothstep(0.12, 0.6, l));
  return vec4(c, 1.0);
}`;
OM.scene({
  id: 'o-01',
  build(el, { start, duration }) {
    const cv = document.createElement('canvas');
    cv.className = 'om-fill';
    el.appendChild(cv);
    const c = OM.canvas(cv, { alpha: false });
    const fx = OM.post(el, c, { effect: O01_FX });
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

    const GLINT0 = 292.42, GLINT1 = 293.05; // after the key word, as the whole line reads
    const api = {
      render(t, T) {
        const ctx = c.ensure();
        const dpr = c.dpr;
        ctx.globalAlpha = 1;
        draw(ctx, T, dpr);
        if (T >= 292.7 && T < end - 0.07) roll(ctx, T, dpr);
        // The hero floats: a faint scale breath and a few px of lift, at rest at both cuts.
        const env = OM.post.envelope(T, start, end, { ramp: 0.5 });
        const br = Math.sin(((T - start) / duration) * Math.PI * 2);
        const g = OM.prog(T, GLINT0, GLINT1);
        fx.apply(T, {
          amount: g > 0 && g < 1 ? Math.sin(Math.PI * g) : 0,
          cam: { zoom: 1 + env * (0.016 + 0.005 * br), y: -5 * env * br },
          p0: [g, 0, 0, 0],
        });
      },
      release: () => {
        fx.release();
        c.release();
      },
    };
    // Band roll: in the pause, the wordmark's own ink bands roll crest through its rows on the
    // snares, down on the first, up on the second, softer each time; with the second the cursor cell
    // (the one x-end keeps) stirs, and all of it is at rest well before the cut.
    const ROLLS = [[293.2, 1, 1, 0.003, 0.04], [293.38, -1, 0.45, 0.002, 0.025]]; // the second is soft and quick: at rest by ~293.44
    function roll(ctx, T, dpr) {
      const word = (row) => {
        let e = 0;
        for (const [t0, dir, amp, step, decay] of ROLLS) {
          const a = T - (t0 + step * (dir > 0 ? row : 18 - row));
          if (a >= 0) e = Math.max(e, amp * Math.exp(-a / decay));
        }
        return e > 0.5 ? ink.crest : e > 0.2 ? ink.hover : null;
      };
      if (ROLLS.some(([t0]) => T >= t0 && T < t0 + 0.2)) OM.paintWord(ctx, OM.HOME, dpr, ink, { wordInk: (row) => word(row) });
      // The cursor cell stirs with the second roll and is back to its band ink by 293.45.
      if (T >= 293.38 && T < 293.45) {
        ctx.fillStyle = T < 293.41 ? ink.crest : ink.hover;
        OM.cell(ctx, OM.HOME, O.cursor.col, O.cursor.row, dpr);
      }
    }
    function draw(ctx, T, dpr) {
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
        // Sparkles off the buttons as they build: seeded four-point stars, each a short life.
        if (T >= STOP && T < STOP + 0.8) {
          const b = lay.btnBox;
          for (let i = 0; i < 26; i++) {
            const h1 = OM.hash(i, 1, 129), h2 = OM.hash(i, 2, 129), h3 = OM.hash(i, 3, 129);
            const a = (T - STOP - 0.3 * h3) / 0.35;
            if (a < 0 || a >= 1) continue;
            const x = b.x0 - 20 + (b.x1 - b.x0 + 40) * h1, y = b.y0 - 18 + (b.y1 - b.y0 + 36) * h2 - 16 * a;
            const r = 3 + 9 * Math.sin(Math.PI * a) * (0.6 + 0.4 * h2);
            ctx.globalAlpha = 1 - a * a;
            ctx.fillStyle = h3 < 0.5 ? ink.crest : ink.hover;
            ctx.fillRect(x - r, y - 1, 2 * r, 2);
            ctx.fillRect(x - 1, y - r, 2, 2 * r);
          }
          ctx.globalAlpha = 1;
        }
    }
    return api;
  },
});
