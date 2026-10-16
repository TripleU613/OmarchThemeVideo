// c3-07 · The storm clears. The spark is the sun; a storm deck rolls over it
// and the rain comes down. On the first onset the rain stops dead in mid-air.
// Then the light breaks through: each word is a break in the cloud the shape
// of its letters, torn open on its onset with a silver lining round it and rays
// slanting down out of it through the hanging drops. The key word is the
// biggest break, under the downbeat. On the kick inside it the whole deck
// parts from the sun outward, the drops flash and burn off, and light floods
// the frame: the glow.
OM.ownWords.add('c3-07');
OM.scene({
  id: 'c3-07',
  build(el, { start, duration }) {
    const C = OM.c3;
    const cv = document.createElement('canvas');
    cv.className = 'om-fill';
    el.appendChild(cv);
    const c = OM.canvas(cv, { alpha: false });
    const END = start + duration;
    const ink = C.ink, th = C.th;
    const HL = OM.HOME, hc = OM.cellAt(HL, 960, 540);
    const SX = HL.x0 + (hc.col + 0.5) * HL.cw, SY = HL.y0 + (hc.row + 0.5) * HL.ch;
    const words = OM.sung('c3-07');
    const on = words.map((w) => w.t0);
    const n = words.length;
    const K = n - 1, PART = 270.536, CELL = 6, TEAR = 0.12;
    const CL = [th['bg-deep'] || '#16161e', th.surface || '#1f2335', th['surface-2'] || '#292e42', th['border-strong'] || '#3b4261'].map(C.pack);
    const P = { crest: C.pack(ink.crest), hover: C.pack(ink.hover), lit: C.pack(ink.lit), mid: C.pack(ink.mid) };
    const rain = [];
    {
      const rng = OM.rng(0xc307);
      for (let i = 0; i < 420; i++) rain.push({ x: rng() * 2100 - 90, y: rng() * 1300, sp: 1500 + rng() * 700, len: 14 + rng() * 16, r: rng() });
    }

    const type = C.lazy(() => {
      const place = C.layout(words, [{ ks: [...Array(K).keys()], cap: 96, cy: 300 }, { ks: [K], cap: 190, cy: 690 }]);
      const M = C.mask(words, place, 800, CELL);
      const { GW, GH, of } = M;
      // Distance (in cells, up to 3) from each cloud cell to the nearest letter, and which word: the silver lining.
      const near = new Uint8Array(GW * GH).fill(9), nk = new Int8Array(GW * GH).fill(-1);
      for (let idx = 0; idx < of.length; idx++) {
        if (of[idx] < 0) continue;
        const i = idx % GW, j = (idx / GW) | 0;
        for (let b = -3; b <= 3; b++)
          for (let a = -3; a <= 3; a++) {
            const ii = i + a, jj = j + b;
            if (ii < 0 || jj < 0 || ii >= GW || jj >= GH) continue;
            const q = jj * GW + ii, d = Math.max(Math.abs(a), Math.abs(b));
            if (d < near[q]) { near[q] = d; nk[q] = of[idx]; }
          }
      }
      // Ray sources: a sparse set of each word's cells.
      const rays = words.map(() => []);
      for (let idx = 0; idx < of.length; idx++) if (of[idx] >= 0 && OM.hash(idx, 7, 3) < 0.09) rays[of[idx]].push([(idx % GW + 0.5) * CELL, (((idx / GW) | 0) + 0.5) * CELL]);
      return { place, M, near, nk, rays, B: C.buffer(GW, GH) };
    });
    const tearAt = (place, k, x) => on[k] + TEAR * OM.clamp((x - place[k].x) / place[k].w);

    // Camera: a tilt up as the clouds part, with flash shakes on the thunder. Effect: lightning exposure
    // flashes and cloud shadows sweeping over the deck; the lit letters are masked out of both.
    const FL = [269.746, 270.095, 270.536];
    const flashAt = (T) => FL.reduce((m, f) => Math.max(m, C.decay(T, f, 0.06)), 0);
    const FX = C.GLSL_LUM + `vec4 effect(vec2 uv) {
  vec2 p = cam(uv);
  vec3 c = src(p).rgb;
  float keep = smoothstep(0.35, 0.55, lum(c));
  float sh = vnoise(vec2(p.x * 5.0 - uTime * 0.6, p.y * 3.0 + uTime * 0.15));
  c *= 1.0 - 0.35 * uAmount * smoothstep(0.4, 0.8, sh) * (1.0 - keep);
  c += uAmount * uP0.x * (1.0 - keep) * (vec3(0.75, 0.79, 0.96) * 0.09 + c * 0.3);
  return vec4(c, 1.0);
}`;
    const fxAt = (T) => {
      const f = flashAt(T);
      return {
        amount: 1, p0: [f, 0, 0, 0],
        cam: { zoom: 1.06, y: -30 + 60 * OM.ease.inOutCubic(OM.prog(T, start, END)), x: 9 * f * Math.sin(T * 91), rot: 0.004 * f * Math.cos(T * 73) },
      };
    };
    return OM.c3.withFx(el, c, start, END, FX, fxAt)({
      render(t, T) {
        const ctx = c.ensure();
        const dpr = c.dpr;
        if (C.seam(ctx, T, dpr, start, END, 'spark', 'glow')) return;
        const { place, M, near, nk, rays, B } = type();
        const { GW, GH, of } = M, buf = B.buf;
        const roll = OM.ease.inOutCubic(OM.prog(T, start + 0.03, start + 0.45)); // the deck rolls in over the sun
        const part = OM.ease.inOutCubic(OM.prog(T, PART, END - 0.12)); // and parts from the sun outward
        const flood = C.sm(T, PART, END - 0.08);
        const wordsA = 1 - C.sm(T, 271.0, END - 0.12);

        ctx.fillStyle = ink.bg;
        ctx.fillRect(0, 0, 1920, 1080);
        // The sun behind it all, swelling into the glow.
        C.pool(ctx, SX, SY, OM.lerp(72, 620, flood), ink.lit, OM.lerp(0.4, 0.5, flood) + 0.15 * C.decay(T, on[K], 0.2));

        if (roll < 1) {
          ctx.globalAlpha = 1 - roll;
          ctx.fillStyle = ink.crest;
          OM.cell(ctx, HL, hc.col, hc.row, dpr);
          ctx.globalAlpha = 1;
        }
        const drift = T * 14;
        // ponytail: two heroNoise samples per 6px cell per frame (~58k cells); sample noise at half res if this blows the 12ms budget
        for (let j = 0; j < GH; j++) {
          const y = (j + 0.5) * CELL;
          for (let i = 0; i < GW; i++) {
            const idx = j * GW + i, x = (i + 0.5) * CELL;
            const k = of[idx];
            buf[idx] = 0;
            // The deck rolls in cell by cell; the parting opens from the sun.
            const h = OM.hash(i, j, 0x77);
            if (h > roll * 1.1) continue;
            if (k >= 0 && T >= tearAt(place, k, x) && h < wordsA) {
              const age = T - tearAt(place, k, x);
              const v = (age < 0.08 ? 1.3 : 0.7) + 0.4 * C.decay(T, on[k], 0.16) - 0.5 * (1 - wordsA) + (h > 0.8 ? 0.2 : 0);
              buf[idx] = v > 1 ? P.crest : v > 0.45 ? P.hover : P.lit;
              continue;
            }
            // The parting clears the cloud round the letters; the letters themselves hold until they fade.
            const dist = Math.hypot(x - SX, (y - SY) * 1.5) / 1150;
            if (dist < part * 1.25 - 0.12 * h) continue;
            const nd = near[idx], q = nk[idx];
            if (q >= 0 && nd <= 2 && T >= on[q] && wordsA > 0.3) {
              buf[idx] = nd === 1 ? P.lit : P.mid; // the silver lining
              continue;
            }
            const nz = 0.6 * OM.heroNoise(i * 0.05 + drift * 0.01, j * 0.07) + 0.4 * OM.heroNoise(i * 0.13 - drift * 0.02, j * 0.15 + 3);
            const lvl = nz * 3.2 + (h - 0.5) * 0.7 + 0.5 * (y / 1080) - 0.3 + (part > 0 && dist < part * 1.25 + 0.1 ? 1 : 0);
            buf[idx] = CL[OM.clamp(Math.floor(lvl), 0, 3)];
          }
        }
        B.draw(ctx, 0, 0, GW * CELL, GH * CELL);

        // Lightning: a jagged bolt down the sky's edge on each thunder hit.
        FL.forEach((f, b) => {
          const age = T - f;
          if (age < 0 || age > 0.13) return;
          const a = 1 - age / 0.13;
          let x = b % 2 ? 1700 : 230, y = 0;
          ctx.beginPath();
          ctx.moveTo(x, y);
          for (let s = 1; s <= 12; s++) {
            x += (OM.hash(b, s, 77) - 0.5) * 90;
            y = s * 46;
            ctx.lineTo(x, y);
          }
          ctx.strokeStyle = C.rgba(ink.hover, 0.3 * a);
          ctx.lineWidth = 10;
          ctx.stroke();
          ctx.strokeStyle = C.rgba(ink.crest, a);
          ctx.lineWidth = 3;
          ctx.stroke();
        });
        // Rays down out of each break, slanting away from the sun.
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.lineWidth = CELL * 1.2;
        for (let k = 0; k < n; k++) {
          if (T < on[k] || wordsA <= 0) continue;
          const grow = OM.ease.outExpo(OM.clamp((T - on[k]) / 0.25));
          const a = (0.05 + 0.08 * C.decay(T, on[k], 0.2)) * wordsA * (k === K ? 1.3 : 1);
          ctx.strokeStyle = C.rgba(ink.hover, a);
          ctx.beginPath();
          for (const [x, y] of rays[k]) {
            let dx = x - SX, dy = Math.abs(y - SY) + 500;
            const l = Math.hypot(dx, dy), len = (240 + 260 * OM.hash(x, y, 1)) * grow;
            ctx.moveTo(x, y);
            ctx.lineTo(x + (dx / l) * len, y + (dy / l) * len);
          }
          ctx.stroke();
        }
        ctx.restore();

        // The rain: falling, then frozen in mid-air on the first onset, glinting in the light and burning off.
        const Tr = Math.min(T, on[0]);
        const rainA = C.sm(T, start + 0.05, start + 0.45) * (1 - C.sm(T, PART + 0.1, END - 0.15));
        if (rainA > 0.01) {
          ctx.globalAlpha = rainA;
          for (const d of rain) {
            const y = ((d.y + (Tr - start) * d.sp) % 1300) - 110;
            const x = d.x - (y + 110) * 0.18;
            const frozen = T > on[0];
            const glint = frozen && Math.hypot(x - SX, y - SY) < 300 + 900 * flood;
            ctx.fillStyle = glint && d.r > 0.4 ? ink.hover : frozen ? ink.mid : th['text-muted'] || ink.mid;
            const len = frozen ? d.len * 0.45 : d.len;
            ctx.fillRect(Math.round(x), Math.round(y), 2, Math.round(len));
          }
          ctx.globalAlpha = 1;
        }
      },
      release: () => c.release(),
    });
  },
});
