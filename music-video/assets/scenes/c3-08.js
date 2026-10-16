// c3-08 · Still under construction. The glow sinks into a dawn behind a
// building site and a tower goes up. Its floors are the words: each word is a
// storey of lit girders between its beams, lowered on the crane and slammed
// down on its onset with a flash and a puff of dust, the next one stacked on
// top. The key word is the storey that lands on the downbeat. Then the tower
// keeps rising without words, a bare storey of bracing dropped on every beat,
// the crane riding up on top, swinging, and the camera climbs with it until
// the lettered floors fall away below. On the last downbeat the camera pushes
// into the girders until their lattice is the frame: the grid.
OM.ownWords.add('c3-08');
OM.scene({
  id: 'c3-08',
  build(el, { start, duration }) {
    const C = OM.c3;
    const cv = document.createElement('canvas');
    cv.className = 'om-fill';
    el.appendChild(cv);
    const c = OM.canvas(cv, { alpha: false });
    const END = start + duration;
    const ink = C.ink, th = C.th;
    const words = OM.sung('c3-08');
    const on = words.map((w) => w.t0);
    const n = words.length;
    const DOWN = 272.161, PUSH = 274.297, GROUND = 925, FH = 168, CELL = 8;
    const KEY = words.reduce((b, w, k) => (Math.abs(w.t0 - DOWN) < Math.abs(words[b].t0 - DOWN) ? k : b), 0);
    // Every storey and when it lands: the words, then a bare one on each beat until the push.
    const bare = OM.beatsIn(words[n - 1].t1 + 0.05, PUSH + 0.6);
    const lands = [...on, ...bare];
    const steel = th['border-strong'] || '#3b4261', dark = th['bg-deep'] || '#16161e';

    const type = C.lazy(() => {
      const place = words.map((_, k) => C.layout(words, [{ ks: [k], cap: k === KEY ? 116 : 100, cy: 0, maxW: 1040 }])[k]);
      const pts = words.map((wd, k) => (place[k] && wd.text ? C.dots(wd.text, 800, place[k].px, CELL).pts : new Float32Array(0)));
      const W = Math.max(720, ...place.map((p) => (p ? p.w + 140 : 0)));
      return { place, pts, W };
    });

    // Camera: a vertical crane riding up with the tower. Effect: height fog, a drifting band of it low
    // over the site, thinning with height; the lit girders cut through it.
    const FX = C.GLSL_LUM + `vec4 effect(vec2 uv) {
  vec2 p = cam(uv);
  vec3 c = src(p).rgb;
  float fog = smoothstep(0.5, 0.0, p.y) * (0.65 + 0.35 * vnoise(vec2(p.x * 4.0 + uTime * 0.25, p.y * 6.0)));
  vec3 fc = mix(vec3(0.055, 0.055, 0.08), vec3(0.62, 0.81, 0.42), 0.14);
  return vec4(mix(c, fc, fog * uAmount * 0.6 * (1.0 - smoothstep(0.35, 0.6, lum(c)))), 1.0);
}`;
    // The camera eases to rest while the whole line reads, then moves on.
    const readAt = (T) => C.sm(T, on[n - 1] - 0.3, on[n - 1]) * (1 - C.sm(T, on[n - 1] + 0.65, on[n - 1] + 1.0));
    const fxAt = (T) => {
      const k = 1 - readAt(T);
      return { amount: 1 - 0.6 * readAt(T), cam: { zoom: 1 + 0.05 * k, y: 32 * k * Math.sin(Math.PI * OM.prog(T, start, END)) } };
    };
    return OM.c3.withFx(el, c, start, END, FX, fxAt)({
      render(t, T) {
        const ctx = c.ensure();
        const dpr = c.dpr;
        if (C.seam(ctx, T, dpr, start, END, 'glow', 'grid')) return;
        const { place, pts, W } = type();
        const X0 = 960 - W / 2;
        const placed = lands.filter((x) => x <= T).length;
        // The camera climbs to keep the top storey in view; then pushes in.
        const topWorld = (count) => GROUND - count * FH;
        let climb = 0;
        lands.forEach((x, i) => (climb += OM.ease.inOutCubic(OM.prog(T, x, x + 0.45)) * (i >= n ? FH : 0))); // the camera holds through the line, then climbs with the bare storeys
        const push = OM.ease.inCubic(OM.prog(T, PUSH, END - 0.1));
        const z = 1 + 7 * push;
        const gridA = C.sm(T, PUSH + 0.6, END - 0.1);
        const settle = (i) => {
          const x = lands[i];
          if (T < x - 0.3 && i > 0) return null; // still out of frame on the crane
          const drop = i === 0 ? 0 : (1 - C.arrive(T, x, Math.min(0.3, x - start - 0.06))) * 320;
          return { y: topWorld(i + 1) - drop, hit: C.decay(T, x, 0.12) * (i === KEY ? 1.5 : 1), landed: T >= x };
        };

        // The glow sinks into a dawn behind the site.
        const sink = C.sm(T, start + 0.02, start + 0.6);
        ctx.fillStyle = ink.bg;
        ctx.fillRect(0, 0, 1920, 1080);
        C.pool(ctx, 960, OM.lerp(540, 980, sink), OM.lerp(620, 1000, sink), ink.lit, OM.lerp(0.5, 0.22, sink) * (1 - gridA) + 0.12 * C.decay(T, DOWN, 0.2));

        ctx.save();
        ctx.translate(960, 540);
        ctx.scale(z, z);
        ctx.translate(-960, -540 + climb);
        ctx.globalAlpha = 1 - gridA;
        // The ground.
        ctx.fillStyle = dark;
        ctx.fillRect(-2000, GROUND, 6000, 600);
        ctx.fillStyle = ink.mid;
        for (let x = -2000; x < 4000; x += CELL) ctx.fillRect(x, GROUND, CELL - 1, 3);

        const beam = (y, a, hit) => {
          ctx.fillStyle = hit > 0.4 ? ink.crest : a ? ink.lit : steel;
          for (let x = X0; x < X0 + W; x += CELL) ctx.fillRect(Math.round(x), Math.round(y - 3), CELL - 1, 6);
        };
        let craneY = GROUND;
        for (let i = 0; i < lands.length; i++) {
          const s = settle(i);
          if (!s) continue;
          const y0 = s.y, y1 = s.y + FH; // top and bottom of the storey
          if (s.landed) craneY = Math.min(craneY, y0);
          const word = i < n;
          // Columns and bracing.
          ctx.strokeStyle = word ? C.rgba(steel, 0.5) : steel;
          ctx.lineWidth = word ? 2 : 4;
          ctx.beginPath();
          const bays = 4;
          for (let b = 0; b < bays; b++) {
            const xa = X0 + (b * W) / bays, xb = X0 + ((b + 1) * W) / bays;
            ctx.moveTo(xa, y0); ctx.lineTo(xb, y1);
            ctx.moveTo(xb, y0); ctx.lineTo(xa, y1);
          }
          ctx.stroke();
          ctx.fillStyle = s.hit > 0.4 ? ink.crest : word && s.landed ? ink.lit : steel;
          for (const x of [X0, X0 + W - 10]) ctx.fillRect(Math.round(x), Math.round(y0), 10, FH);
          beam(y0, word && s.landed, s.hit);
          beam(y1, word && s.landed, s.hit);
          // Rivet chain: on the pause snares the joints flash storey by storey up the tower.
          if (s.landed) {
            for (const sn of [273.276, 273.554]) {
              const a = T - sn - i * 0.035;
              if (a < 0 || a > 0.22) continue;
              ctx.fillStyle = C.rgba(ink.crest, 1 - a / 0.22);
              for (const x of [X0 - 4, X0 + W - 10]) for (const y of [y0, y1]) ctx.fillRect(Math.round(x), Math.round(y - 7), 14, 14);
            }
          }
          // The word's letters: the storey's lit girders.
          if (word && place[i]) {
            const p = place[i], P = pts[i], cy = (y0 + y1) / 2, lx = 960 - p.w / 2, ly = cy + p.cap / 2;
            const v0 = s.landed ? 0.7 + s.hit : 0.15;
            for (let q = 0; q < P.length; q += 2) {
              const sweep = s.landed ? OM.clamp(0.8 - (T - lands[i]) * 6 + (P[q] / p.w) * 0.8) : 0; // the light runs across the girders on the slam
              const v = v0 + 0.5 * sweep * (s.hit > 0 ? 1 : 0);
              ctx.fillStyle = v > 1.1 ? ink.crest : v > 0.55 ? ink.hover : v > 0.3 ? ink.lit : steel;
              ctx.fillRect(Math.round(lx + P[q] - CELL / 2), Math.round(ly + P[q + 1] - CELL / 2), CELL - 1, CELL - 1);
            }
          }
          // Welding sparks: a shower off both lower corners when it lands.
          if (s.landed && T - lands[i] < 0.9) {
            const age = T - lands[i];
            for (let d = 0; d < 24; d++) {
              const side = d % 2 ? 1 : -1, vx = side * (80 + 260 * OM.hash(i, d, 88)), vy = -180 - 260 * OM.hash(d, i, 89);
              ctx.fillStyle = C.rgba(d % 3 ? ink.hover : ink.crest, 1 - age / 0.9);
              ctx.fillRect(Math.round(960 + side * (W / 2 - 6) + vx * age), Math.round(y1 + vy * age + 700 * age * age), 3, 3);
            }
          }
          // Dust where it lands.
          if (s.hit > 0.05) {
            ctx.fillStyle = C.rgba(ink.hover, 0.5 * s.hit);
            for (let d = 0; d < 26; d++) {
              const side = d % 2 ? 1 : -1, r = OM.hash(i, d, 9);
              const age = T - lands[i];
              ctx.fillRect(Math.round(960 + side * (W / 2 + age * (200 + 300 * r))), Math.round(y1 - age * 120 * r - 4), 6, 6);
            }
          }
        }
        // Beacons blinking on the top corners, and a welder at work on the newest joint.
        if ((T * 1.5) % 1 < 0.35) {
          for (const x of [X0 + 2, X0 + W - 10]) {
            C.pool(ctx, x + 4, craneY - 6, 30, th.brand || ink.hover, 0.5);
            ctx.fillStyle = ink.crest;
            ctx.fillRect(Math.round(x), Math.round(craneY - 10), 8, 8);
          }
        }
        for (let d = 0; d < 10; d++) {
          const ph = T * 2.2 + d * 0.1, age = (ph - Math.floor(ph)) * 0.5;
          const wx = X0 + W * 0.7, vx = (OM.hash(Math.floor(ph), d, 90) - 0.5) * 300;
          ctx.fillStyle = C.rgba(ink.crest, 1 - age / 0.5);
          ctx.fillRect(Math.round(wx + vx * age), Math.round(craneY + 4 - 120 * age + 600 * age * age), 2, 2);
        }
        // The crane on top: mast, swinging jib, cable and hook (carrying the next storey down).
        {
          const mastH = 230, top = craneY - mastH;
          const swing = Math.sin((T - start) * 1.6) * 0.9;
          const jl = 620 * Math.cos(swing * 0.5), cl = 200 * Math.cos(swing * 0.5);
          ctx.fillStyle = steel;
          ctx.fillRect(X0 + 70, top, 14, mastH);
          ctx.fillRect(X0 + 77 - cl, top - 8, jl + cl, 10);
          ctx.fillStyle = ink.mid;
          ctx.fillRect(X0 + 77 - cl, top - 2, 60, 28); // counterweight
          let kickSwing = 0; // cable kick: the hook swings out on the pause snares
          for (const sn of [273.276, 273.554]) if (T >= sn) kickSwing += 60 * C.decay(T, sn, 0.3) * Math.sin((T - sn) * 12);
          const hookX = X0 + 77 + jl * (0.55 + 0.4 * Math.sin((T - start) * 2.3)) + kickSwing;
          const next = lands.find((x) => x > T + 0.3);
          const hookY = top + 60 + 120 * (0.5 + 0.5 * Math.sin((T - start) * 3.1));
          ctx.fillRect(Math.round(hookX), top, 2, hookY - top);
          ctx.fillStyle = ink.lit;
          ctx.fillRect(Math.round(hookX - 8), hookY, 18, 10);
          // A warning light blinking on the jib tip.
          if ((T * 2) % 1 < 0.5 || next === undefined) {
            ctx.fillStyle = ink.crest;
            ctx.fillRect(Math.round(X0 + 77 + jl - 6), top - 14, 8, 8);
          }
        }
        ctx.restore();
        if (gridA > 0) {
          ctx.globalAlpha = gridA;
          OM.handoff('grid', ctx, T, dpr);
          ctx.globalAlpha = 1;
        }
      },
      release: () => c.release(),
    });
  },
});
