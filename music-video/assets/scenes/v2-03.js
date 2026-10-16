// v2-03 · Break it, [line]. Each of the first words stamps into its
// window and the window breaks out of the tiling, the word's letters coming
// apart from it as it tumbles away. On the snare the tape catches: rewind
// marks, tracking lines, and through the accelerating roll everything runs back
// up the path it fell, the letters re-forming their words in their tiles. The
// last words stamp into the one window that never broke, the line reads whole,
// and the words clear to the empty desk for v2-04.
OM.ownWords.add('v2-03');
OM.scene({
  id: 'v2-03',
  build(el, { start, duration }) {
    const V = OM.v2;
    const cv = document.createElement('canvas');
    cv.className = 'om-fill';
    el.appendChild(cv);
    // Rewind: tracking bands that shear sideways, a scrub blur along x, a green cast; all off outside the rewind.
    const FX = `vec4 effect(vec2 uv) {
      vec2 q = cam(uv);
      vec4 base = src(q);
      float rw = uP0.x * uAmount;
      if (rw <= 0.0) return base;
      float band = floor(q.y * 18.0 + uTime * 30.0);
      float sh = step(0.72, hash(vec2(band, 3.0))) * (hash(vec2(band, 7.0)) - 0.5) * 0.03;
      vec3 acc = vec3(0.0);
      for (int i = 0; i < 6; i++) acc += src(q + vec2(sh + (float(i) - 2.5) * 0.0025, 0.0)).rgb;
      acc /= 6.0;
      float l = dot(acc, vec3(0.3, 0.59, 0.11));
      vec3 g = mix(acc, vec3(l * 0.78, l * 1.02, l * 0.62), 0.45);
      float line = smoothstep(0.96, 1.0, fract(q.y * 18.0 + uTime * 30.0)) * 0.12;
      return vec4(mix(base.rgb, g + vec3(0.52, 0.66, 0.35) * line, rw), 1.0);
    }`;
    const c = OM.canvas(cv, { alpha: false });
    const fx = OM.post(el, c, { effect: FX });
    const ink = V.ink(), th = V.th();
    const sung = OM.sung('v2-03');
    const on = sung.map((w) => w.t0);
    const END = start + duration;
    const SLOT = V.grid(7);
    const NB = Math.min(6, sung.length); // words that break their window
    const REST = sung.slice(NB).map((w, i) => ({ ...w, i: NB + i })); // words stamped into the last window
    const R0 = Math.max(on[NB - 1] + 0.03, 124.761), R1 = 125.504; // the snare and its accelerating roll
    const DB = V.hitsIn(OM.T && OM.T.downbeats, start, END, [125.039, 127.176]);
    const CL0 = END - 0.26, CL1 = END - 0.09;
    const G = 2600;
    const rng = OM.rng(2303);
    const PHYS = SLOT.map(() => ({ vx: (rng() - 0.5) * 560, vy: -200 - rng() * 220, w: (rng() - 0.5) * 2.4 }));
    let F = null;
    const fit = () => {
      const r6 = SLOT[6];
      return {
        tile: SLOT.slice(0, NB).map((r, k) => V.fitWord(sung[k].text, r.x + r.w / 2, r.y + r.h / 2 + 10, r.w - 44, 112)),
        rest: V.layout(REST, { cap: 96, maxW: r6.w - 50, cx: r6.x + r6.w / 2, cy: r6.y + r6.h / 2 + 10, lead: 1.5 }),
        lp: sung.slice(0, NB).map((w, k) => [...w.text].map(() => ({ vx: (rng() - 0.5) * 300, vy: (rng() - 0.6) * 260, w: (rng() - 0.5) * 9 }))),
      };
    };
    const back = (T) => OM.ease.inOutCubic(OM.prog(T, R0, R1));
    /** Seconds a window has fallen at T, running back to 0 through the rewind. */
    const tau = (k, T) => Math.max(0, Math.min(T, R0) - (on[k] + 0.08)) * (1 - back(T));

    const letters = (ctx, k, cx, cy, ta, rot, alpha, col) => {
      const L = F.tile[k], text = sung[k].text, n = text.length;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = L.font;
      ctx.fillStyle = col;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      for (let j = 0; j < n; j++) {
        const P = F.lp[k][j];
        const lx = (j - (n - 1) / 2) * L.A;
        ctx.save();
        ctx.translate(cx + Math.cos(rot) * lx + P.vx * ta, cy + Math.sin(rot) * lx + P.vy * ta + 600 * ta * ta);
        ctx.rotate(rot + P.w * ta);
        ctx.fillText(text[j], 0, L.capPx / 2);
        ctx.restore();
      }
      ctx.restore();
    };

    return {
      render(t, T) {
        const ctx = c.ensure();
        if (T < start + V.HOLD_IN || T >= END - V.HOLD_OUT) return fx.apply(T), V.still(ctx, 7);
        if (!F || !V.met().ok) F = fit();
        ctx.fillStyle = ink.bg;
        ctx.fillRect(0, 0, 1920, 1080);
        const clear = OM.ease.inCubic(OM.prog(T, CL0, CL1));
        const rew = T >= R0 && T < R1 + 0.08;
        const db = OM.pulse(DB, T, 0.1);
        // Tiles: the unbroken ones settle, the broken ones tumble; draw the fallen on top.
        const order = [...SLOT.keys()].sort((a, b) => (a < NB ? tau(a, T) : 0) - (b < NB ? tau(b, T) : 0));
        for (const k of order) {
          const r = SLOT[k];
          const ta = k < NB ? tau(k, T) : 0;
          const P = PHYS[k];
          const x = P.vx * ta, y = P.vy * ta + 0.5 * G * ta * ta, rot = P.w * ta * ta * 1.4;
          const age = T - (k < NB ? on[k] : REST.length ? on[NB] : Infinity);
          const stamp = age >= 0 ? Math.exp(-age / 0.12) : 0;
          const brd = OM.mix(rew ? ink.mid : th['border-strong'], ink.crest, stamp);
          V.win(ctx, r, { x, y, rot, border: OM.mix(brd, th['border-strong'], clear), face: OM.mix(th.bg, ink.dim, 0.5 * stamp) });
          if (db > 0.05 && ta === 0) V.ring(ctx, r, 6, 2, ink.lit, db * 0.7 * (1 - clear));
          if (k >= NB || T < on[k]) continue;
          // The word rides its window, its letters coming apart as it falls.
          const s = 1 + 0.2 * Math.exp(-(T - on[k]) / 0.07);
          const col = OM.mix(ink.crest, th.text, OM.clamp((T - on[k]) / 0.35));
          const cx = r.x + r.w / 2 + x, cy = r.y + r.h / 2 + 10 + y;
          if (ta === 0) V.drawWord(ctx, sung[k].text, cx, cy, F.tile[k], rew ? ink.hover : col, { s, alpha: 1 - clear });
          else letters(ctx, k, cx, cy, ta, rot, 1 - clear, rew ? ink.hover : col);
        }
        // The last window: the remaining words stamp in, one per row.
        REST.forEach((w, j) => {
          if (T < w.t0) return;
          const a = F.rest.at[j], age = T - w.t0;
          const col = OM.mix(ink.crest, th.text, OM.clamp(age / 0.35));
          V.drawWord(ctx, w.text, a.cx, a.cy, F.rest, col, { s: 1 + 0.2 * Math.exp(-age / 0.07), alpha: 1 - clear });
          if (age < 0.25) V.ring(ctx, SLOT[6], 4 + 22 * OM.ease.outCubic(age / 0.25), 3, ink.crest, 1 - age / 0.25);
        });
        // The tape catching: rewind marks and tracking lines while time runs back.
        if (rew) {
          const p = OM.prog(T, R0, R1 + 0.08);
          const hic = T >= 125.16 ? Math.exp(-(T - 125.16) / 0.1) : 0; // sprinkle: the tape hiccups on the kick
          const fl = Math.max(Math.floor(T * 30) % 2 ? 1 : 0.55, hic);
          if (hic > 0.03) {
            ctx.fillStyle = OM.v2.rgba(ink.crest, 0.35 * hic);
            ctx.fillRect(0, 300 + 420 * OM.hash(1, 2, 3), 1920, 4 + 10 * hic);
          }
          ctx.fillStyle = OM.v2.rgba(ink.crest, fl);
          for (let i = 0; i < 2; i++) {
            ctx.beginPath();
            const hs = 1 + 0.5 * hic;
            ctx.moveTo(150 + i * 44 * hs, 930 - 30 * hs);
            ctx.lineTo(150 + (i * 44 - 44) * hs, 930);
            ctx.lineTo(150 + i * 44 * hs, 930 + 30 * hs);
            ctx.closePath();
            ctx.fill();
          }
          for (let i = 0; i < 3; i++) {
            const yy = ((1 - p) * 1400 + i * 380) % 1180 - 50;
            ctx.fillStyle = OM.v2.rgba(ink.hover, 0.18);
            ctx.fillRect(0, yy, 1920, 6 + i * 3);
            ctx.fillStyle = OM.v2.rgba(ink.bg, 0.5);
            ctx.fillRect(0, yy + 10 + i * 3, 1920, 18);
          }
        }
        // Debris: chips knocked off each window as it breaks, flying with it and back again in the rewind.
        for (let k = 0; k < NB; k++) {
          const ta = tau(k, T);
          if (ta <= 0) continue;
          const r = SLOT[k];
          for (let i = 0; i < 10; i++) {
            const hx = OM.hash(k, i, 31), hv = OM.hash(k, i, 32), hw = OM.hash(k, i, 33);
            const x = r.x + r.w * hx + (hv - 0.5) * 700 * ta, y = r.y + r.h + (-300 - 300 * hw) * ta + 0.5 * G * ta * ta;
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(hw * 6 + ta * (hv - 0.5) * 20);
            ctx.fillStyle = i % 2 ? th['border-strong'] : ink.mid;
            ctx.fillRect(-6, -3, 12 + 10 * hv, 6);
            ctx.restore();
          }
        }
        const ce = V.camEnv(T, start, END);
        const fall = OM.ease.inOutSine(OM.prog(T, on[0], R0)) * (1 - back(T));
        fx.apply(T, {
          amount: V.env(T, start, END),
          cam: { zoom: 1 + ce * (0.015 + 0.03 * fall), rot: ce * 0.03 * fall, y: ce * 10 * fall },
          p0: [Math.sin(Math.PI * OM.prog(T, R0, R1 + 0.08)), 0, 0, 0],
        });
      },
      release: () => { fx.release(); c.release(); },
    };
  },
});
