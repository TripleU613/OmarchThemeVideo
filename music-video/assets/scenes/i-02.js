// i-02 · Dawn behind the name. It opens on i-01's horizon: the night, one mid
// line, the cursor on it. Stars come out over the first bar. On the 9.27
// downbeat the cursor ignites and a flash runs out along the horizon; the sun
// rises from it behind the wordmark, which stands on the horizon as a dark
// mountain range, rim-lit. The light is the homepage field's own dither, and
// the letters cut it into shafts: each sky cell is shadowed where a letter
// stands between it and the sun, so rays stream up through the gaps and the
// counters. The 12.93 kick bursts the shafts; the downbeats pulse them and the
// snares flick the stars, which fade as the sky fills. A lake below mirrors
// it. The dawn holds from 19.96, the frame i-03 opens on (OM.intro.dawn).
// Camera: a crane, low and close on the range by the kick, then lifting out
// and settling at rest for the cut. Shader: crepuscular rays, the lit cells
// smeared back along the line to the sun so shafts stream between the
// letters. Extras: the brightest stars glint out one by one as the sky
// fills, and one long flare runs along the horizon on the kick.
OM.scene({
  id: 'i-02',
  build(el, { start, duration }) {
    const cv = document.createElement('canvas');
    cv.className = 'om-fill';
    el.appendChild(cv);
    const c = OM.canvas(cv, { alpha: false });
    const fx = OM.post(el, c, { effect: `
vec4 effect(vec2 uv) {
  vec2 p = cam(uv);
  vec4 c = src(p);
  if (uAmount <= 0.0) return c;
  vec2 d = (p - uP0.xy) * uP0.z / 32.0;
  vec2 q = p;
  float w = 1.0;
  vec3 acc = vec3(0.0);
  for (int i = 0; i < 32; i++) {
    q -= d;
    acc += max(src(q).rgb - 0.28, 0.0) * w;
    w *= 0.94;
  }
  acc /= 14.0;
  return vec4(c.rgb + acc * uAmount * uP0.w * vec3(0.78, 1.0, 0.62), 1.0);
}` });
    const { L, ink, HR, R0, C0, C1, home, sunRow, DAWN0, KICK, dawn, FREEZE } = OM.intro;
    const END = start + duration;
    const horizonY = L.y0 + (HR + 0.5) * L.ch;
    // The brightest stars, the same cells the dawn paints, each with its own moment to go out.
    const GLINTS = [];
    for (let row = R0; row < HR - 3; row++)
      for (let col = C0; col < C1; col++) {
        const inW = row >= 0 && row < OM.WORDMARK.h && col >= 0 && col < OM.WORDMARK.w && OM.WORDMARK.rows[row][col] === '1';
        if (!inW && OM.hash(col, row, 7) < 0.016 && OM.hash(col, row, 8) > 0.7)
          GLINTS.push({ x: L.x0 + (col + 0.5) * L.cw, y: L.y0 + (row + 0.5) * L.ch, at: 10.4 + 4.6 * OM.hash(col, row, 11) });
      }
    return {
      render(t, T) {
        const ctx = c.ensure();
        dawn(ctx, T, c.dpr);
        const Tc = Math.min(T, FREEZE);

        // Glints: a four-point star flares and dies where each bright star goes out.
        for (const g of GLINTS) {
          const age = Tc - g.at;
          if (age < 0 || age > 0.5) continue;
          const k = Math.sin((Math.PI * age) / 0.5), len = 8 + 20 * k;
          ctx.globalAlpha = 0.9 * k;
          ctx.fillStyle = ink.crest;
          ctx.fillRect(g.x - len, g.y - 1, 2 * len, 2);
          ctx.fillRect(g.x - 1, g.y - len, 2, 2 * len);
        }
        ctx.globalAlpha = 1;

        // The dawn flare: one long thin line of light along the horizon from the kick.
        const fa = T >= KICK ? Math.exp(-(Tc - KICK) / 1.6) * OM.smooth(OM.prog(Tc, KICK, KICK + 0.06)) * (1 - OM.smooth(OM.prog(Tc, 16, 18))) : 0;
        if (fa > 0.01) {
          const reach = 1100 * OM.ease.outCubic(OM.prog(Tc, KICK, KICK + 0.7));
          for (const [h, a] of [[18, 0.12], [6, 0.3], [2, 0.8]]) {
            const gr = ctx.createLinearGradient(960 - reach, 0, 960 + reach, 0);
            gr.addColorStop(0, 'rgba(218,236,198,0)');
            gr.addColorStop(0.5, `rgba(218,236,198,${a * fa})`);
            gr.addColorStop(1, 'rgba(218,236,198,0)');
            ctx.fillStyle = gr;
            ctx.fillRect(960 - reach, horizonY - h / 2, 2 * reach, h);
          }
        }

        // Camera: a crane, low and close on the range by the kick, lifting out and settling at rest by the hold.
        const down = OM.ease.inOutSine(OM.prog(T, start + 0.1, KICK));
        const up = OM.ease.inOutSine(OM.prog(T, KICK + 0.3, 19.6));
        const lift = down * (1 - up);
        const sunY = L.y0 + (sunRow(T) + 0.5) * L.ch;
        fx.apply(T, {
          amount: OM.post.envelope(T, start, END, { ramp: 0.6, hold: 0.12 }) * OM.smooth(OM.prog(T, DAWN0, DAWN0 + 2.5)),
          cam: { zoom: 1 + 0.075 * lift, y: -55 * lift },
          p0: [0.5, 1 - sunY / 1080, 0.55, 1.2 + 1.6 * (T >= KICK ? Math.exp(-(T - KICK) / 0.6) : 0)],
        });
      },
      release: () => {
        fx.release();
        c.release();
      },
    };
  },
});
