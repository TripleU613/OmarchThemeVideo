// p1-02 · Light painting. The point of light the spot closed down to is a
// pen in a long exposure. On each onset it writes that word in light, left to
// right, the hot stroke cooling behind the nib, and whips to the next word
// leaving a glowing arc. Each word is written where a tile will be. On the key
// word (the downbeat) the exposure's arcs become the borders of a tiling
// layout: three tiles over one wide master, every border on the home
// lattice. On the snare the words drain, the borders cool and the rest of
// the lattice comes up, so the layout is exactly the grid p1-03 cuts in on.
OM.ownWords.add('p1-02');
OM.scene({
  id: 'p1-02',
  build(el, { start, duration }) {
    const cv = document.createElement('canvas');
    cv.className = 'om-fill';
    el.appendChild(cv);
    const c = OM.canvas(cv, { alpha: false });
    const END = start + duration;
    const ink = OM.fieldInks('tokyo-night');
    const th = OM.theme('tokyo-night');
    const { rgba, pool, font, sm, decay, PEN } = OM.p1;
    const words = OM.sung('p1-02');
    const on = words.map((w) => w.t0);
    const K = words.length - 1;
    const DOWN = 75.929, SNARE = 76.278;
    const L = OM.HOME;
    const ci = (x) => Math.round((x - L.x0) / L.cw), ri = (y) => Math.round((y - L.y0) / L.ch);
    const gx = (col) => L.x0 + col * L.cw, gy = (row) => L.y0 + row * L.ch;
    const cL = ci(70), cR = ci(1850), rT = ri(64), rM = ri(440), rB = ri(1016);
    // Write windows: the nib crosses word k from its onset.
    const wEnd = on.map((t0, k) => t0 + Math.min(0.3, k < K ? on[k + 1] - t0 - 0.04 : 0.17));

    const layout = (ctx) => {
      const top = words.map((_, k) => k).filter((k) => k !== K);
      const pad = 50;
      const avail = (cR - cL - top.length + 1) * L.cw;
      const px = OM.p1.fit(ctx, words, top, 700, avail - top.length * pad * 2, 130, 60);
      ctx.font = font(700, px);
      const tw = words.map((w) => ctx.measureText(w.text).width);
      const sum = top.reduce((s, k) => s + tw[k] + pad * 2, 0) || 1;
      const tiles = [];
      let col = cL;
      top.forEach((k, n) => {
        const c1 = n === top.length - 1 ? cR : col + Math.round((((tw[k] + pad * 2) / sum) * avail) / L.cw);
        tiles[k] = { c0: col, c1, r0: rT, r1: rM, px, w: 700 };
        col = c1 + 1;
      });
      const kpx = OM.p1.fit(ctx, words, [K], 800, (cR - cL) * L.cw - 200, 250, 60);
      tiles[K] = { c0: cL, c1: cR, r0: rM + 1, r1: rB, px: kpx, w: 800 };
      tiles.forEach((t, k) => {
        ctx.font = font(t.w, t.px);
        t.tw = ctx.measureText(words[k].text).width;
        t.x = (gx(t.c0) + gx(t.c1)) / 2 - t.tw / 2;
        t.cap = t.px * 0.73;
        t.base = (gy(t.r0) + gy(t.r1)) / 2 + t.cap / 2;
      });
      return tiles;
    };

    // The nib: from the pen dot to the first word, across each word, a whip arc between.
    const arc = (a, b, u, lift) => {
      const mx = (a[0] + b[0]) / 2, my = Math.min(a[1], b[1]) - lift;
      const v = 1 - u;
      return [v * v * a[0] + 2 * v * u * mx + u * u * b[0], v * v * a[1] + 2 * v * u * my + u * u * b[1]];
    };
    const flights = (S) => {
      const f = [];
      let from = [PEN.x, PEN.y], t = start + 0.05;
      S.forEach((s, k) => {
        f.push({ a: from, b: [s.x, s.base - s.cap / 2], t0: t, t1: on[k] });
        from = [s.x + s.tw, s.base - s.cap / 2];
        t = wEnd[k];
      });
      return f;
    };
    const penAt = (S, F, T) => {
      for (let k = 0; k <= K; k++) {
        const f = F[k];
        if (T < f.t1) return arc(f.a, f.b, OM.ease.inOutCubic(OM.prog(T, f.t0, f.t1)), 140);
        if (T < wEnd[k] || k === K) {
          const s = S[k], p = OM.prog(T, on[k], wEnd[k]);
          const n = Math.max(1, words[k].text.length);
          return [s.x + s.tw * OM.ease.outCubic(p), s.base - s.cap / 2 - (s.cap / 2) * 0.9 * Math.sin(p * Math.PI * n)];
        }
      }
      return [PEN.x, PEN.y];
    };

    // Long exposure: a fading echo of the frame dragged back along the pen's path (lighten only, so type stays crisp).
    const fx = OM.post(el, c, {
      effect: `vec4 effect(vec2 uv) {
  vec2 s = cam(uv);
  vec4 c = src(s);
  vec3 e = vec3(0.0);
  for (int i = 1; i <= 12; i++) {
    float w = pow(0.82, float(i));
    e = max(e, src(s - uP0.xy * float(i)).rgb * w);
  }
  float near = smoothstep(0.3, 0.0, length((s - uP0.zw) * vec2(uRes.x / uRes.y, 1.0)));
  c.rgb = max(c.rgb, e * vec3(0.8, 1.0, 0.75) * 0.6 * uAmount * near);
  return c;
}`,
    });
    return {
      render(t, T) {
        const ctx = c.ensure();
        const dpr = c.dpr;
        if (T < start + 0.05) {
          ctx.fillStyle = ink.bg;
          ctx.fillRect(0, 0, 1920, 1080);
          return fx.apply(T), OM.p1.pen(ctx, dpr);
        }
        if (T > END - 0.07) return fx.apply(T), OM.handoff('grid', ctx, T, dpr);
        ctx.fillStyle = ink.bg;
        ctx.fillRect(0, 0, 1920, 1080);
        const S = layout(ctx);
        const F = flights(S);
        const snap = (v) => Math.round(v * dpr) / dpr;
        const form = OM.ease.outExpo(OM.prog(T, on[K], on[K] + 0.2)); // arcs -> tiles
        const cool = sm(T, SNARE, END - 0.075); // tiles -> grid
        const flash = decay(T, DOWN, 0.1), sn = decay(T, SNARE, 0.06);

        // The rest of the lattice comes up under the cooling layout.
        if (cool > 0) {
          ctx.globalAlpha = cool;
          ctx.fillStyle = th['border-subtle'];
          for (let col = L.cMin; col <= L.cMin + L.cols; col++) ctx.fillRect(snap(gx(col)), 0, 1, 1080);
          for (let row = L.rMin; row <= L.rMin + L.rows; row++) ctx.fillRect(0, snap(gy(row)), 1920, 1);
          ctx.globalAlpha = 1;
        }
        // Tiles: faint window faces, borders growing out of each edge's midpoint on the key word.
        if (form > 0) {
          const bw = OM.lerp(3, 1, cool), col = OM.mix(OM.mix(th.brand, ink.crest, Math.max(flash, sn)), th['border-subtle'], cool);
          S.forEach((s) => {
            const x0 = gx(s.c0), x1 = gx(s.c1), y0 = gy(s.r0), y1 = gy(s.r1);
            ctx.fillStyle = rgba(th.surface, 0.55 * form * (1 - cool));
            ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
            ctx.fillStyle = col;
            const hw = ((x1 - x0) / 2) * form, hh = ((y1 - y0) / 2) * form, mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
            const o = (bw - 1) / 2;
            for (const y of [y0, y1]) ctx.fillRect(snap(mx - hw), snap(y) - o, 2 * hw + 1, bw);
            for (const x of [x0, x1]) ctx.fillRect(snap(x) - o, snap(my - hh), bw, 2 * hh + 1);
          });
        }
        // The exposure: every whip arc the nib has made stays lit until the tiles take over.
        const trailA = 1 - form;
        if (trailA > 0.01) {
          ctx.lineCap = 'round';
          F.forEach((f) => {
            if (T < f.t0) return;
            const u1 = OM.ease.inOutCubic(OM.prog(T, f.t0, f.t1));
            for (const [lw, a, hex] of [[14, 0.12, ink.lit], [4, 0.75, ink.hover]]) {
              ctx.strokeStyle = rgba(hex, a * trailA);
              ctx.lineWidth = lw;
              ctx.beginPath();
              for (let i = 0; i <= 24; i++) {
                const p = arc(f.a, f.b, (u1 * i) / 24, 140);
                i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]);
              }
              ctx.stroke();
            }
          });
        }
        // The words, written in light behind the nib, hot at the front and cooling.
        const drain = sm(T, SNARE, SNARE + 0.09);
        const pen = penAt(S, F, T);
        ctx.textBaseline = 'alphabetic';
        ctx.lineJoin = 'round';
        S.forEach((s, k) => {
          if (T < on[k] || !words[k].text || drain >= 1) return;
          const writing = T < wEnd[k];
          const front = writing ? pen[0] + 6 : s.x + s.tw + 40;
          ctx.save();
          ctx.beginPath();
          ctx.rect(s.x - 40, s.base - s.px * 1.2 + (s.px * 1.5) * drain, front - s.x + 40, s.px * 1.5 * (1 - drain));
          ctx.clip();
          ctx.font = font(s.w, s.px);
          const heat = 1 - sm(T, wEnd[k], wEnd[k] + 0.35);
          const kf = k === K ? flash : 0;
          ctx.strokeStyle = rgba(ink.lit, 0.16 + 0.2 * kf);
          ctx.lineWidth = 18;
          ctx.strokeText(words[k].text, s.x, s.base);
          ctx.strokeStyle = rgba(ink.hover, 0.35);
          ctx.lineWidth = 6;
          ctx.strokeText(words[k].text, s.x, s.base);
          ctx.fillStyle = OM.mix(ink.hover, ink.crest, Math.max(heat, kf));
          ctx.fillText(words[k].text, s.x, s.base);
          if (writing) {
            ctx.beginPath();
            ctx.rect(front - 110, 0, 110, 1080);
            ctx.clip();
            ctx.fillStyle = ink.crest;
            ctx.fillText(words[k].text, s.x, s.base);
          }
          ctx.restore();
        });
        // The nib and its motion streak.
        const penA = 1 - sm(T, wEnd[K], wEnd[K] + 0.08);
        if (penA > 0.01) {
          ctx.strokeStyle = rgba(ink.crest, 0.8 * penA);
          ctx.lineCap = 'round';
          ctx.lineWidth = 6;
          ctx.beginPath();
          for (let i = 0; i <= 14; i++) {
            const p = penAt(S, F, Math.max(start + 0.05, T - i * 0.006));
            i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]);
          }
          ctx.stroke();
          pool(ctx, pen[0], pen[1], 64, 64, ink.lit, 0.45 * penA);
          ctx.fillStyle = rgba(ink.crest, penA);
          ctx.fillRect(snap(pen[0] - PEN.s / 2), snap(pen[1] - PEN.s / 2), snap(PEN.s), snap(PEN.s));
        }
        // Sparks thrown off the nib: emitted on a fixed 12 ms grid, each a closed-form ballistic arc.
        const DT = 0.012, LIFE = 0.34;
        for (let j = 0; j < LIFE / DT; j++) {
          const tau = (Math.floor(T / DT) - j) * DT, a = T - tau;
          if (tau < start + 0.05 || tau > wEnd[K] || a < 0) continue;
          const o = penAt(S, F, tau), n = Math.round(tau / DT);
          for (let m = 0; m < 2; m++) {
            const vx = (OM.hash(n, m, 21) - 0.5) * 700, vy = -OM.hash(n, m, 22) * 420;
            const x = o[0] + vx * a, y = o[1] + vy * a + 0.5 * 1500 * a * a;
            ctx.fillStyle = rgba(m ? ink.crest : ink.hover, 0.9 * (1 - a / LIFE));
            ctx.fillRect(x - 1.5, y - 1.5, 3, 3);
          }
        }
        // Camera: a slow roll of about 3 degrees leaning after the pen, at rest at both cuts.
        const b = Math.sin(Math.PI * OM.prog(T, start + 0.07, END - 0.07)) ** 2;
        const lean = OM.clamp((pen[0] - 960) / 960, -1, 1);
        const cam = { rot: 0.052 * b, zoom: 1 + 0.1 * b, x: -36 * lean * b, y: 0 };
        const prev = penAt(S, F, Math.max(start + 0.05, T - 0.03));
        const dx = pen[0] - prev[0], dy = pen[1] - prev[1], dl = Math.hypot(dx, dy) || 1, k = Math.min(1, dl / 40) * 0.0035;
        const amount = OM.post.envelope(T, start, END, { ramp: 0.15 }) * (1 - sm(T, wEnd[K], wEnd[K] + 0.06));
        fx.apply(T, { amount, cam, p0: [(-dx / dl) * k, (dy / dl) * k * (16 / 9), pen[0] / 1920, 1 - pen[1] / 1080] });
      },
      release: () => (fx.release(), c.release()),
    };
  },
});
