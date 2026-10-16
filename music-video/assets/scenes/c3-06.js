// c3-06 · Murmuration. The lit cells of the field take off as a flock of
// thousands. The flock forms each word as it is sung: the field flies straight
// into the first word, which holds through the downbeat; it breaks, sweeps and
// pulls back together into the second; then into the whole line at once, the
// last word's birds joining on its onset. On the kick after the line the
// flock goes wild, folding and wheeling in clean sweeps that turn hard on the
// snares, and on the last downbeat it pours into a single point: the spark.
OM.ownWords.add('c3-06');
OM.scene({
  id: 'c3-06',
  build(el, { start, duration }) {
    const C = OM.c3;
    const cv = document.createElement('canvas');
    cv.className = 'om-fill';
    el.appendChild(cv);
    const c = OM.canvas(cv, { alpha: false });
    const END = start + duration;
    const ink = C.ink;
    const L = OM.HOME, hc = OM.cellAt(L, 960, 540);
    const SX = L.x0 + (hc.col + 0.5) * L.cw, SY = L.y0 + (hc.row + 0.5) * L.ch;
    const words = OM.sung('c3-06');
    const on = words.map((w) => w.t0);
    const n = words.length;
    const DOWNS = [263.639, 265.776], WILD = 266.008, TURNS = [266.89, 267.424], POUR = 267.889;
    const start0 = OM.heroLit(start, L, { gain: 0.8 });

    const flock = C.lazy(() => {
      // Three formations: the first word alone, the second alone, then the whole line.
      const solo = (k) => C.layout(words, [{ ks: [k], cap: 190, cy: 470 }]);
      const half = Math.ceil(n / 2);
      const full = C.layout(words, [{ ks: [...Array(half).keys()], cap: 112, cy: 370 }, { ks: [...Array(n - half).keys()].map((i) => i + half), cap: 112, cy: 620 }]);
      const step = (p) => Math.max(7, Math.round(p.cap / 13));
      const F = [];
      const add = (place, ks, tin, lead, tout, fromStart) => {
        const pts = C.wordPts(words, place, 800, step);
        const list = [];
        for (const k of ks) for (let i = 0; i < pts[k].length; i += 2) list.push([pts[k][i], pts[k][i + 1], k, step(place[k])]);
        F.push({ list, tin, lead, tout, fromStart });
      };
      if (n > 0) add(solo(0), [0], on[0], Math.max(0.05, on[0] - start - 0.05), Math.min(on[1] || WILD, words[0].t1) - 0.05, true);
      if (n > 2) add(solo(1), [1], on[1], 0.16, words[1].t1 - 0.05);
      add(full, [...Array(n).keys()], n > 2 ? on[2] : on[Math.min(1, n - 1)], 0.13, WILD);
      const NB = Math.max(...F.map((f) => f.list.length)) + 900;
      const rng = OM.rng(0xc306);
      const B = [];
      for (let i = 0; i < NB; i++) {
        const s = start0.length ? start0[i % start0.length] : { col: hc.col, row: hc.row, heat: 0 };
        const a = rng() * Math.PI * 2, r = Math.sqrt(rng());
        B.push({ x0: L.x0 + (s.col + 0.5) * L.cw, y0: L.y0 + (s.row + 0.5) * L.ch, heat: s.heat, u: r * Math.cos(a), v: r * Math.sin(a), r: rng() });
      }
      return { F, B };
    });

    // The flock's shape: a folding, wheeling blob, its course turning on the snares.
    const flockAt = (b, T) => {
      let turn = 0;
      for (const s of TURNS) turn += OM.ease.inOutCubic(OM.prog(T, s - 0.05, s + 0.3));
      const wild = C.sm(T, WILD, WILD + 0.5);
      const cx = 960 + 430 * Math.sin(T * 0.9 + turn * 2.2) * (0.6 + 0.4 * wild);
      const cy = 470 + 150 * Math.sin(T * 1.3 + 1 + turn * 1.7);
      const A = 520 + 220 * Math.sin(T * 1.1 + turn), Bv = 150 + 90 * Math.sin(T * 1.7 + turn * 2);
      const th = 0.5 * Math.sin(T * 0.55 + turn * 1.3);
      let x = b.u * A, y = b.v * Bv;
      x += 130 * Math.sin(b.v * 3 + T * 2.2 + turn);
      y += 70 * Math.sin(b.u * 4 - T * 1.6) * (0.5 + wild);
      return [cx + x * Math.cos(th) - y * Math.sin(th), cy + x * Math.sin(th) + y * Math.cos(th)];
    };

    // Camera: gliding arcs with the flock. Effect: a sky-gradient haze (the theme's blue above, green
    // low) and motion streaks smeared off the birds along the flock's heading; the bright word birds stay crisp.
    const FX = C.GLSL_LUM + `vec4 effect(vec2 uv) {
  vec2 p = cam(uv);
  vec3 c = src(p).rgb, s = vec3(0.0);
  vec2 dir = uP0.xy * vec2(1.0 / 1920.0, 1.0 / 1080.0) * 5.0 * uP0.z * uAmount;
  for (int i = 1; i <= 6; i++) s += src(p - dir * float(i)).rgb;
  s /= 6.0;
  vec3 o = mix(max(c, s * 0.8), c, smoothstep(0.3, 0.55, lum(c)));
  vec3 haze = mix(vec3(0.62, 0.81, 0.42) * 0.05, vec3(0.48, 0.64, 0.97) * 0.07, p.y);
  return vec4(o + uAmount * haze, 1.0);
}`;
    const fxAt = (T) => {
      const dx = Math.cos(T * 0.9), dy = 0.45 * Math.cos(T * 1.3 + 1), l = Math.hypot(dx, dy) || 1;
      return {
        amount: 1, p0: [dx / l, -dy / l, 0.5 + C.sm(T, WILD, WILD + 0.5), 0],
        cam: { zoom: 1.09, rot: 0.025 * Math.sin((T - start) * 0.9), x: 45 * Math.sin((T - start) * 0.6) },
      };
    };
    return OM.c3.withFx(el, c, start, END, FX, fxAt)({
      render(t, T) {
        const ctx = c.ensure();
        const dpr = c.dpr;
        if (C.seam(ctx, T, dpr, start, END, 'field', 'spark')) return;
        const { F, B } = flock();
        const lift = OM.ease.inOutCubic(OM.prog(T, start + 0.05, start + 0.7));
        const pour = OM.ease.inOutCubic(OM.prog(T, POUR, END - 0.32)); // settles before the cut, so the spark is still
        const down = OM.pulse(DOWNS, T, 0.14);

        ctx.fillStyle = ink.bg;
        ctx.fillRect(0, 0, 1920, 1080);
        C.stars(ctx, T, 0.5 * C.sm(T, start + 0.1, start + 0.6) * (1 - pour));
        const ws = F.map((f) => (T < f.tin - f.lead || T > f.tout + 0.4 ? 0 : C.arrive(T, f.tin, f.lead) * (1 - OM.ease.inOutCubic(OM.prog(T, f.tout, f.tout + 0.4)))));
        for (let i = 0; i < B.length; i++) {
          const b = B[i];
          let [x, y] = flockAt(b, T);
          x = OM.lerp(b.x0, x, lift);
          y = OM.lerp(b.y0, y, lift);
          let v = 0.3 + 0.25 * b.r, sz = 4, inForm = -1;
          for (let f = 0; f < F.length; f++) {
            const w = ws[f], list = F[f].list;
            if (w <= 0 || i >= list.length) continue;
            const [tx, ty, k, st] = list[i];
            // The last word of the line joins the full formation on its own onset.
            const wk = f === F.length - 1 && T < on[k] ? w * C.arrive(T, on[k], 0.13) : w;
            if (wk <= 0) continue;
            // Each bird swings in on its own arc.
            const sw = Math.sin(wk * Math.PI) * 60 * (b.r - 0.5);
            x = OM.lerp(x, tx, wk) + sw;
            y = OM.lerp(y, ty, wk) - sw * 0.5;
            if (wk > 0.9) {
              inForm = k;
              sz = st - 2;
              v = 0.75 + 1.2 * C.decay(T, Math.max(on[k], F[f].tin), 0.12) + 0.5 * down;
            }
          }
          if (T < start + 0.06 + 0.3 && inForm < 0 && lift < 0.2) sz = OM.lerp(L.cw, 4, lift / 0.2);
          if (pour > 0) {
            const p = OM.clamp(pour * 1.2 - b.r * 0.2);
            x = OM.lerp(x, SX, p);
            y = OM.lerp(y, SY, p);
            sz = OM.lerp(sz, 2, p);
          }
          // Wingbeat flare: on each pause hit a beat of light runs through the free flock.
          if (inForm < 0 && T > 265.8) {
            const wb = OM.pulse([266.008, 266.89, 267.424, 267.59, 268.0], T, 0.09) * (0.4 + 0.6 * (0.5 + 0.5 * Math.sin(b.u * 5 + b.v * 3)));
            v += 0.8 * wb;
            sz += 1.5 * wb * (1 - pour);
          }
          ctx.fillStyle = inForm < 0 && lift < 0.15 ? ink.dim : v > 1.2 ? ink.crest : v > 0.7 ? ink.hover : v > 0.42 ? ink.lit : ink.mid;
          ctx.fillRect(Math.round(x - sz / 2), Math.round(y - sz / 2), Math.round(sz), Math.round(sz));
        }
        // Specks shed off the flock, drifting behind it and fading.
        const spA = lift * (1 - pour);
        for (let j = 0; spA > 0.01 && j < 180; j++) {
          const ph = T * 1.2 + OM.hash(j, 1, 66), age = (ph - Math.floor(ph)) * 1.3;
          const b = B[Math.floor(OM.hash(j, Math.floor(ph), 67) * B.length)];
          const [fx0, fy0] = flockAt(b, T - age);
          ctx.fillStyle = C.rgba(ink.mid, spA * (1 - age / 1.3));
          ctx.fillRect(Math.round(fx0 - 30 * age), Math.round(fy0 + 40 * age * age), 2, 2);
        }
        // The point it pours into.
        if (pour > 0) {
          C.pool(ctx, SX, SY, 72, ink.lit, 0.4 * pour);
          ctx.fillStyle = ink.crest;
          OM.cell(ctx, L, hc.col, hc.row, dpr);
        }
      },
      release: () => c.release(),
    });
  },
});
