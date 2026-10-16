// x-end · Power off. The resting homepage (o-01's last frame) drains cell by
// cell, edges first, in the field's own dither order (quick at first, slowing
// as it closes in), the snare and kick each taking a bite. The wordmark and
// headline cells that drain fall away as particles while the camera pushes in
// on the one cell that never drains: the cursor from the film's first frame.
// It blinks on the beat alone, blooming as the last light, then goes out: night.
(() => {
  // The last light: bright cells bloom in lit green, and a wide soft glow breathes from the
  // cursor cell (uP0.xy, its uv) with whatever the cursor is showing right now.
  const FX = `
vec4 effect(vec2 uv) {
  vec2 p = cam(uv);
  vec3 c = src(p).rgb;
  if (uAmount <= 0.0) return vec4(c, 1.0);
  vec2 px = 1.0 / uRes * (uRes.x / 1920.0);
  vec3 b = vec3(0.0);
  for (int i = 0; i < 16; i++) {
    float a = float(i) * 0.3927 + 0.2;
    vec2 o = vec2(cos(a), sin(a));
    for (int j = 1; j <= 3; j++) {
      vec3 s = src(p + o * px * float(j) * 7.0).rgb;
      b += s * smoothstep(0.3, 0.75, dot(s, vec3(0.3, 0.55, 0.15))) / float(j);
    }
  }
  b /= 29.0;
  vec3 k = src(uP0.xy).rgb;
  float lit = smoothstep(0.2, 0.6, dot(k, vec3(0.3, 0.55, 0.15)));
  vec2 d = (p - uP0.xy) * vec2(uRes.x / uRes.y, 1.0);
  float glow = exp(-length(d) / 0.07) * 0.55 + exp(-length(d) / 0.22) * 0.18;
  vec3 green = vec3(0.62, 0.81, 0.42);
  c += uAmount * (b * 0.9 * green / max(0.001, max(green.r, green.g)) + green * glow * lit);
  return vec4(c, 1.0);
}`;

  OM.scene({
    id: 'x-end',
    build(el, { start, duration }) {
      const cv = document.createElement('canvas');
      cv.className = 'om-fill';
      el.appendChild(cv);
      const c = OM.canvas(cv, { alpha: false });
      const fx = OM.post(el, c, { effect: FX });
      const ink = OM.fieldInks('tokyo-night');
      const th = OM.theme('tokyo-night');
      const O = OM.outro;
      const L = OM.HOME;
      const end = start + duration;
      const DRAIN0 = start + 0.07, DRAIN_END = 297.6, LAST = 299.1;
      const HITS = [295.079, 295.381]; // snare, kick
      const beats = OM.beatsIn(start, end);
      const bite = (T) => HITS.reduce((s, h) => s + (T < h ? 0 : 0.17 * (1 - Math.exp(-(T - h) / 0.05))), 0);
      const leftAt = (T) => {
        if (T < DRAIN0) return 1;
        if (T >= DRAIN_END) return 0;
        const q = 1 - Math.pow(1 - OM.prog(T, DRAIN0, DRAIN_END), 2); // quick off the edges, slow into the cursor
        return 1 - (q + (1 - q) * bite(T));
      };
      // When a drain key goes: leftAt is monotone, so sample it once and search.
      const N = 600, LS = new Float32Array(N + 1);
      for (let i = 0; i <= N; i++) LS[i] = leftAt(DRAIN0 + ((DRAIN_END - DRAIN0) * i) / N);
      const goneAt = (key) => {
        let lo = 0, hi = N;
        while (hi - lo > 1) {
          const m = (lo + hi) >> 1;
          if (LS[m] > key) lo = m; else hi = m;
        }
        return DRAIN0 + ((DRAIN_END - DRAIN0) * hi) / N;
      };
      // The cells that fall: the wordmark's and the headline's, each with the moment it drains.
      let FALL = null;
      const falling = () => {
        const lay = O.layout();
        if (FALL && FALL.ok === lay.ok) return FALL.list;
        const list = [];
        OM.cells(OM.WORDMARK).forEach(([col, row]) => {
          const k = O.key(col, row);
          if (k >= 0) list.push({ x: L.x0 + col * L.cw, y: L.y0 + row * L.ch, w: L.cw, h: L.ch, ink: ink[OM.BANDS[row]], t: goneAt(k), s: OM.hash(col, row, 55) });
        });
        for (const k of lay.head) list.push({ x: O.H.x0 + k.q * O.H.cw, y: O.H.y0 + k.r * O.H.ch, w: O.H.cw, h: O.H.ch, ink: th.text, t: goneAt(k.key), s: OM.hash(k.q, k.r, 56) });
        FALL = { ok: lay.ok, list };
        return list;
      };
      const cx = L.x0 + (O.cursor.col + 0.5) * L.cw, cy = L.y0 + (O.cursor.row + 0.5) * L.ch;

      const draw = (ctx, T, dpr) => {
        if (T >= end - 0.1) return OM.handoff('night', ctx, T, dpr);
        if (T < DRAIN_END) {
          O.page(ctx, T, dpr, { left: leftAt(T) });
          // Drained cells drop away under gravity, drifting, shrinking and fading.
          for (const p of falling()) {
            const a = T - p.t;
            if (a <= 0 || a >= 0.75) continue;
            const f = 1 - a / 0.75;
            const sz = f * 0.8 + 0.2;
            ctx.globalAlpha = f;
            ctx.fillStyle = a < 0.06 ? ink.crest : p.ink;
            ctx.fillRect(p.x + (p.s - 0.5) * 90 * a + (p.w * (1 - sz)) / 2, p.y + 900 * a * a + 40 * p.s * a, p.w * sz, p.h * sz);
          }
          ctx.globalAlpha = 1;
          return;
        }
        // The cursor alone: on for half of every beat, crest as it strikes, until the last one.
        OM.handoff('night', ctx, T, dpr);
        const b = OM.lastHit(beats, T);
        if (b !== null && b < LAST && T - b < OM.SPB / 2) {
          ctx.fillStyle = T - b < 0.05 ? ink.crest : ink.lit;
          OM.cell(ctx, L, O.cursor.col, O.cursor.row, dpr);
        }
      };

      return {
        render(t, T) {
          const ctx = c.ensure();
          const dpr = c.dpr;
          ctx.globalAlpha = 1;
          draw(ctx, T, dpr);
          // A slow push on the cursor (it sits at the frame centre); the night frames at the end are at rest.
          const push = T >= end - 0.1 ? 0 : OM.ease.inOutSine(OM.prog(T, start, 298.6));
          const z = 1 + 0.28 * push;
          fx.apply(T, {
            amount: T >= end - 0.1 ? 0 : OM.smooth(OM.prog(T, start + 0.4, 296.4)),
            cam: { zoom: z, x: (960 - cx) * (z - 1), y: (540 - cy) * (z - 1) },
            p0: [cx / 1920, 1 - cy / 1080, 0, 0],
          });
        },
        release: () => {
          fx.release();
          c.release();
        },
      };
    },
  });
})();
