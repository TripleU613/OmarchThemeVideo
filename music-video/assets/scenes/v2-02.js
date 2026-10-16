// v2-02 · [line]. The grid from v2-01 re-tiles to one window per
// word, and the windows become an instrument: each word strikes its window like
// a key, the face flashes, the word rings inside it and rings of light spread
// out of the frame while the note holds; the voice shakes the letters. On the
// downbeat after the last word the whole desk sounds as one chord. The words
// clear and the empty seven-tile desk is the cut into v2-03.
OM.ownWords.add('v2-02');
OM.scene({
  id: 'v2-02',
  build(el, { start, duration }) {
    const V = OM.v2;
    const cv = document.createElement('canvas');
    cv.className = 'om-fill';
    el.appendChild(cv);
    // A luminance split in green tones only, pulsing with each note.
    const FX = `vec4 effect(vec2 uv) {
      vec2 q = cam(uv);
      vec4 c = src(q);
      vec2 o = vec2(uP0.x * 3.0 / uRes.x * (uRes.x / 1920.0) * 2.0, 0.0);
      float l1 = dot(src(q + o).rgb, vec3(0.3, 0.59, 0.11)), l2 = dot(src(q - o).rgb, vec3(0.3, 0.59, 0.11));
      vec3 g = vec3(0.62, 0.81, 0.42) * (l1 - l2) * 0.45;
      return vec4(c.rgb + g * uAmount, 1.0);
    }`;
    const c = OM.canvas(cv, { alpha: false });
    const fx = OM.post(el, c, { effect: FX });
    const ink = V.ink(), th = V.th();
    const sung = OM.sung('v2-02');
    const N = sung.length;
    const on = sung.map((w) => w.t0), off = sung.map((w) => w.t1);
    const END = start + duration;
    const FROM = V.grid(6), TO = V.grid(N);
    const CHORD = V.hitsIn(OM.T && OM.T.downbeats, on[N - 1], END, [122.903])[0];
    const KICKS = [119.211, 119.676, 120.279];
    const CL0 = END - 0.26, CL1 = END - 0.09;
    let fits = null;
    const fit = () => TO.map((r, k) => V.fitWord((sung[k] && sung[k].text) || '', r.x + r.w / 2, r.y + r.h / 2 + 10, r.w - 44, 112));

    return {
      render(t, T) {
        const ctx = c.ensure();
        if (T < start + V.HOLD_IN) return fx.apply(T), V.still(ctx, 6);
        if (T >= END - V.HOLD_OUT) return fx.apply(T), V.still(ctx, N);
        if (!fits || !V.met().ok) fits = fit();
        ctx.fillStyle = ink.bg;
        ctx.fillRect(0, 0, 1920, 1080);
        const clear = OM.ease.inCubic(OM.prog(T, CL0, CL1));
        // Re-tile: the six slide to their new tiles while the new one pops in (Hyprland's popin).
        const e = OM.ease.inOutCubic(OM.prog(T, start + V.HOLD_IN, on[0] + 0.5)); // eased out of the cut
        const chord = T >= CHORD ? Math.exp(-(T - CHORD) / 0.18) : 0;
        const kick = OM.pulse(KICKS, T, 0.08);
        const vox = OM.audio(T).vocal;
        const latest = OM.hitCount(on, T) - 1;
        TO.forEach((r1, k) => {
          const r = k < FROM.length ? V.lerpRect(FROM[k], r1, e) : r1;
          const pop = k < FROM.length ? 1 : e;
          const age = T - on[k];
          const played = age >= 0;
          const strike = played ? Math.exp(-age / 0.16) : 0;
          const lit = Math.max(strike, chord);
          let border = played ? (k === latest ? th.brand : ink.mid) : th['border-strong'];
          border = OM.mix(border, ink.crest, lit);
          const face = OM.mix(played ? OM.mix(th.bg, ink.dim, 0.18) : th.bg, ink.lit, 0.4 * lit);
          V.win(ctx, r, {
            border: OM.mix(border, th['border-strong'], clear), face: OM.mix(face, th.bg, clear),
            s: (0.87 + 0.13 * pop) * (1 + 0.012 * kick + 0.02 * strike), alpha: pop >= 1 ? 1 : OM.clamp(pop * 3),
          });
          if (!played) return;
          // The note rings out of the tile while it is held, and once more on the chord.
          const held = T <= off[k] + 0.25;
          for (let j = 0; j < 3; j++) {
            const ph = (age - j * 0.12) / 0.55;
            if (held && ph > 0 && ph < 1) V.ring(ctx, r, 6 + 70 * OM.ease.outCubic(ph), 3 - j * 0.6, ink.hover, (1 - ph) * 0.8 * (1 - clear));
          }
          if (chord > 0.02) V.ring(ctx, r, 6 + 60 * (1 - chord), 3, ink.crest, chord * (1 - clear));
          // The word: struck in crest, cooling to text; the voice shakes it while it sounds.
          const F = fits[k];
          const sounding = T <= off[k] ? vox : 0;
          const col = OM.mix(OM.mix(ink.crest, th.text, OM.clamp(age / 0.4)), ink.crest, chord);
          const s = 1 + 0.18 * strike + 0.05 * chord;
          const jx = 3 * sounding * Math.sin(T * 71 + k), jy = 3 * sounding * Math.cos(T * 53 + k * 2);
          V.drawWord(ctx, sung[k].text, r.x + r.w / 2 + jx, r.y + r.h / 2 + 10 + jy, F, col, { s, alpha: 1 - clear });
        });
        // Note particles rising off each struck window.
        TO.forEach((r1, k) => {
          const age = T - on[k];
          if (age < 0 || age > 1.0) return;
          for (let i = 0; i < 9; i++) {
            const hx = OM.hash(k, i, 221), hs = OM.hash(k, i, 222), l = 0.6 + 0.4 * hs;
            if (age > l) continue;
            ctx.globalAlpha = (1 - age / l) * (1 - clear);
            ctx.fillStyle = i % 3 ? ink.hover : ink.crest;
            const x = r1.x + r1.w * (0.1 + 0.8 * hx) + 14 * Math.sin(age * 9 + i), y = r1.y + 10 - age * (220 + 200 * hs);
            ctx.fillRect(x - 3, y - 3, i % 3 ? 5 : 8, i % 3 ? 5 : 8);
          }
          ctx.globalAlpha = 1;
        });
        const ce = V.camEnv(T, start, END), sway = 0.4 + vox;
        fx.apply(T, {
          amount: V.env(T, start, END) * OM.clamp(OM.pulse(on, T, 0.14) + chord),
          cam: { zoom: 1 + ce * 0.035, rot: ce * 0.007 * Math.sin((T - start) * 1.9) * sway, x: ce * 14 * Math.sin((T - start) * 1.3) * sway, y: ce * 6 * Math.cos((T - start) * 1.1) },
          p0: [1, 0, 0, 0],
        });
      },
      release: () => { fx.release(); c.release(); },
    };
  },
});
