// v2-04 · Double exposure. The desk from v2-03 boots twice at once: two
// translucent copies of the same machine slide out of register and drift, and
// the line is written across both of them, every word landing in both copies on
// its onset. The copies are pulled together and lock into perfect registration
// on the last word, everything snapping to full strength. After the downbeat the
// machine powers off, CRT style, on the kicks: down to a line, a dot, nothing.
OM.ownWords.add('v2-04');
OM.scene({
  id: 'v2-04',
  build(el, { start, duration }) {
    const V = OM.v2;
    const cv = document.createElement('canvas');
    cv.className = 'om-fill';
    el.appendChild(cv);
    // A third, screen-blended exposure ghosting off the frame, converging to nothing at the lock.
    const FX = `vec4 effect(vec2 uv) {
      vec2 q = cam(uv);
      vec3 a = src(q).rgb, b = src(q + uP0.xy).rgb;
      vec3 scr = 1.0 - (1.0 - a) * (1.0 - b * vec3(0.8, 1.0, 0.75));
      return vec4(mix(a, scr, uP0.z * uAmount), 1.0);
    }`;
    const c = OM.canvas(cv, { alpha: false });
    const fx = OM.post(el, c, { effect: FX });
    const off = document.createElement('canvas'); // one exposure, drawn once and printed twice
    const oc = OM.canvas(off, { alpha: false });
    const ink = V.ink(), th = V.th();
    const sung = OM.sung('v2-04');
    const N = sung.length;
    const on = sung.map((w) => w.t0);
    const END = start + duration;
    const LOCK = on[N - 1];
    const DB = V.hitsIn(OM.T && OM.T.downbeats, LOCK, END, [131.448])[0];
    const K1 = 132.331, K2 = 132.47; // kicks: collapse to a line, then to a dot
    const SLOT = V.grid(7);
    const TICKS = [131.26, 131.40, 131.54, 132.07], TICK_WIN = [0, 3, 5, 1]; // boot ticks: pause kicks, one window each, clear of the line
    const JOLT = 131.91, DIP = 132.07; // the snare jolts the copies out of register; the kick browns the tube out
    let F = null;
    const fit = () => V.layout(sung, { cap: 118, maxW: 1580, cx: 960, cy: 540, lead: 1.45 });

    /** The exposure: the desk, dimming back as the words arrive, and the words. */
    const expose = (x, T) => {
      x.fillStyle = ink.bg;
      x.fillRect(0, 0, 1920, 1080);
      const dim = OM.ease.inOutCubic(OM.prog(T, start + V.HOLD_IN, start + 0.7));
      const lock = T >= LOCK ? Math.exp(-(T - LOCK) / 0.2) : 0;
      const db = OM.pulse([DB], T, 0.12);
      SLOT.forEach((r, j) => {
        V.win(x, r, {
          border: OM.mix(OM.mix(th['border-strong'], th['border-subtle'] || ink.dim, dim), ink.crest, lock * 0.8),
          face: OM.mix(th.bg, ink.bg, dim * 0.55),
        });
        // Sprinkle, boot ticks: each pause kick wakes one window's prompt, its cursor flaring and border lit.
        TICKS.forEach((h, i) => {
          const ta = T - h;
          if (ta < 0 || ta > 0.5 || TICK_WIN[i] !== j) return;
          const g = Math.exp(-ta / 0.14);
          V.ring(x, r, 2, 2, ink.lit, g);
          x.fillStyle = OM.mix(th.brand, ink.crest, g);
          x.fillRect(r.x + 40, r.y + 24, 6 + 30 * g, 10);
        });
      });
      sung.forEach((w, k) => {
        if (T < w.t0) return;
        const a = F.at[k], age = T - w.t0;
        const col = OM.mix(OM.mix(ink.crest, th.text, OM.clamp(age / 0.4)), ink.crest, Math.max(lock, db));
        V.drawWord(x, w.text, a.cx, a.cy, F, col, { s: 1 + 0.2 * Math.exp(-age / 0.07) + 0.04 * lock });
      });
    };
    /** How far out of register the two copies are: out, drifting, then pulled in to lock. */
    const drift = (T) => {
      const out = OM.ease.inOutCubic(OM.prog(T, start + V.HOLD_IN, start + 1.0)); // eased out of the cut
      const pull = OM.ease.inCubic(OM.prog(T, LOCK - 1.1, LOCK));
      const a = out * (1 - pull) + (T >= JOLT ? 0.14 * Math.exp(-(T - JOLT) / 0.07) : 0); // sprinkle: registration jolt
      const d = T - start;
      return { a, x: a * (46 + 18 * Math.sin(d * 1.7)), y: a * (30 + 12 * Math.cos(d * 1.3)), r: a * 0.014 * Math.sin(d * 1.1 + 0.6), s: a * 0.025 };
    };

    return {
      render(t, T) {
        const ctx = c.ensure();
        if (T < start + V.HOLD_IN) return fx.apply(T), V.still(ctx, 7);
        if (T >= END - V.HOLD_OUT || T >= K2 + 0.5) return fx.apply(T), OM.handoff('night', ctx, T, c.dpr);
        if (!F || !V.met().ok) F = fit();
        const x = oc.ensure();
        expose(x, T);
        ctx.fillStyle = ink.bg;
        ctx.fillRect(0, 0, 1920, 1080);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        const W = cv.width, H = cv.height;
        if (T < K1) {
          // Two prints of the same exposure; in register they are one.
          const D = drift(T);
          const print = (sgn, alpha, op) => {
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.globalCompositeOperation = op;
            ctx.translate(W / 2 + sgn * D.x * c.dpr, H / 2 + sgn * D.y * c.dpr);
            ctx.rotate(sgn * D.r);
            ctx.scale(1 + sgn * D.s, 1 + sgn * D.s);
            ctx.drawImage(off, -W / 2, -H / 2, W, H);
            ctx.restore();
          };
          print(1, 1, 'source-over');
          print(-1, 0.8, 'lighten'); // the brighter of the two wins: both copies of the line stay legible
        } else {
          // Power off: squash to a bright line on one kick, to a dot on the next.
          const v = OM.ease.inCubic(OM.prog(T, K1, K2));
          const hz = OM.ease.inCubic(OM.prog(T, K2, K2 + 0.16));
          const sy = Math.max(0.004, 1 - v), sx = Math.max(0.006, 1 - hz);
          ctx.save();
          ctx.translate(W / 2, H / 2);
          ctx.scale(sx, sy);
          ctx.globalAlpha = 1;
          ctx.drawImage(off, -W / 2, -H / 2, W, H);
          ctx.restore();
          const glow = v * v;
          ctx.globalAlpha = glow * (1 - OM.prog(T, K2 + 0.16, K2 + 0.32));
          ctx.fillStyle = ink.crest;
          const lw = W * sx, lh = Math.max(3 * c.dpr, H * sy * 0.12);
          ctx.fillRect(W / 2 - lw / 2, H / 2 - lh / 2, lw, lh);
          ctx.globalAlpha = 1;
        }
        ctx.setTransform(c.dpr, 0, 0, c.dpr, 0, 0);
        // Sprinkle, brownout: the tube sags on the kick before power-off.
        const dip = T >= DIP && T < K1 ? Math.exp(-(T - DIP) / 0.06) : 0;
        if (dip > 0.02) { ctx.fillStyle = V.rgba(ink.bg, 0.4 * dip); ctx.fillRect(0, 0, 1920, 1080); }
        // Phosphor: the dot's afterglow lingering on the tube after power-off.
        const ph = T >= K2 + 0.12 ? 1 - OM.prog(T, K2 + 0.12, K2 + 0.48) : 0;
        if (ph > 0) {
          V.pool(ctx, 960, 540, 90, 90, ink.lit, 0.35 * ph * ph);
          ctx.fillStyle = V.rgba(ink.crest, ph);
          for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) if (Math.abs(i) + Math.abs(j) <= 2) ctx.fillRect(958 + i * 6, 538 + j * 6, 4, 4);
        }
        const ce = V.camEnv(T, start, END), D = T < K1 ? drift(T) : { a: 0, x: 0, y: 0 };
        fx.apply(T, {
          amount: V.env(T, start, END),
          cam: { zoom: 1 + ce * 0.045, x: ce * 0.4 * D.x, y: ce * 0.3 * D.y },
          p0: [(D.x * 1.6) / 1920, (-D.y * 1.6) / 1080, 0.35 * D.a, 0],
        });
      },
      release: () => { fx.release(); c.release(); oc.release(); },
    };
  },
});
