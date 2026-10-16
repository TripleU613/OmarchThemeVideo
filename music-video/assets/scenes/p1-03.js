// p1-03 · Clockwork. The layout's lattice fades as loose gears come flying in.
// Every sung word is cut into the dial plate of one gear: the gear slams into
// mesh with the train on the word's onset, a crest flash at the teeth it
// bites, and the word stamps onto its plate. The kicks wind the train half a
// tooth. The key word's gear is the big one, landing on the drop; on the
// downbeat the mechanism starts ticking, one tooth per eighth and then per
// sixteenth on the kick roll, faster and faster. Then the words go dark and
// the whole train is crushed edge-on into one crest line across the frame:
// the paper's edge that p1-04 opens.
OM.ownWords.add('p1-03');
OM.scene({
  id: 'p1-03',
  build(el, { start, duration }) {
    const cv = document.createElement('canvas');
    cv.className = 'om-fill';
    el.appendChild(cv);
    const c = OM.canvas(cv, { alpha: false });
    const END = start + duration;
    const ink = OM.fieldInks('tokyo-night');
    const th = OM.theme('tokyo-night');
    const { rgba, pool, font, sm, decay } = OM.p1;
    const words = OM.sung('p1-03');
    const on = words.map((w) => w.t0);
    const K = words.length - 1;
    const KICKS = [76.974, 77.485];
    const DOWN = 78.065, ROLL = 78.832;
    const OFF = [78.79, END - 0.1]; // words dark, then the crush
    const L = OM.HOME, H = OM.cellAt(L, 960, 540);
    const YC = L.y0 + (H.row + 0.5) * L.ch; // the centre row: where the line will be
    const P = 38; // tooth pitch, px along the pitch circle
    // Ticks: every eighth from the downbeat, every sixteenth on the roll.
    const TICKS = [];
    for (let x = DOWN; x < ROLL - 0.01; x += OM.SPB / 2) TICKS.push(x);
    for (let x = ROLL; x < OFF[0]; x += OM.SPB / 4) TICKS.push(x);

    /** The train: gear k is sized to its word; gears alternate above and below the centre row. */
    const layout = (ctx) => {
      let px = 118, G;
      for (; px > 56; px *= 0.96) {
        G = words.map((w, k) => {
          const f = k === K ? px * 1.35 : px;
          ctx.font = font(800, f);
          const tw = ctx.measureText(w.text).width;
          const R = Math.max(k === K ? 150 : 95, Math.hypot(tw / 2 + 14, f * 0.42)); // dial plate
          const N = Math.max(12, Math.ceil((2 * Math.PI * (R + 64)) / P));
          return { f, tw, R, N, r: (N * P) / (2 * Math.PI) };
        });
        // Mesh distances with an alternating rise, then centre the chain.
        let x = 0;
        G.forEach((g, k) => {
          g.y = YC + (k % 2 ? 1 : -1) * Math.min(110, g.r * 0.35) * (k === K ? 0.4 : 1);
          if (k) {
            const a = G[k - 1], d = a.r + g.r, dy = g.y - a.y;
            x += Math.sqrt(Math.max(1, d * d - dy * dy));
          }
          g.x = x;
        });
        const span = x + G[0].r + G[K].r + 2 * 0.32 * P;
        const tall = Math.max(...G.map((g) => Math.abs(g.y - YC) + g.r + 14));
        if (span <= 1840 && tall <= 520) break;
      }
      const x0 = 960 - (G[K].x + G[K].r - G[0].r) / 2;
      G.forEach((g) => (g.x += x0));
      // Phases so the teeth interlock: s_a + s_b = 1/2 at each contact.
      G[0].th = -Math.PI / 2;
      G[0].dir = 1;
      for (let k = 1; k <= K; k++) {
        const a = G[k - 1], b = G[k];
        const al = Math.atan2(b.y - a.y, b.x - a.x);
        const sa = (((al - a.th) * a.N) / (2 * Math.PI)) % 1;
        b.th = al + Math.PI - (0.5 - sa) * ((2 * Math.PI) / b.N);
        b.dir = -a.dir;
      }
      return G;
    };

    /** Drive, in teeth: the kicks wind it half a tooth, then a tooth per tick, snapping. */
    const drive = (T) => {
      let s = 0;
      for (const k of KICKS) s += 0.5 * OM.ease.outBack(OM.prog(T, k, k + 0.09), 2.5);
      for (const x of TICKS) s += OM.ease.outBack(OM.prog(T, x, x + 0.07), 2);
      return s;
    };

    const gear = (ctx, g, th0, glow, key) => {
      const ro = g.r + 0.3 * P, rr = g.r - 0.32 * P, w = (2 * Math.PI) / g.N;
      ctx.beginPath();
      for (let i = 0; i < g.N; i++) {
        const a = th0 + i * w;
        const pts = [[a - 0.5 * w, rr], [a - 0.2 * w, ro], [a + 0.2 * w, ro], [a + 0.5 * w, rr]];
        pts.forEach(([an, r], n) => (i || n ? ctx.lineTo : ctx.moveTo).call(ctx, Math.cos(an) * r, Math.sin(an) * r));
      }
      ctx.closePath();
      ctx.fillStyle = key ? OM.mix(th['surface-2'], ink.dim, 0.6) : th.surface;
      ctx.fill();
      ctx.strokeStyle = OM.mix(key ? ink.lit : ink.mid, ink.crest, glow);
      ctx.lineWidth = 2.5;
      ctx.stroke();
      // Rim, and lightening holes that turn with the gear between rim and plate.
      const rin = g.r - 0.75 * P;
      ctx.strokeStyle = th['border-strong'];
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, rin, 0, Math.PI * 2);
      ctx.stroke();
      const hr = (rin - g.R) / 2;
      if (hr > 5) {
        ctx.fillStyle = ink.bg;
        const n = Math.max(6, Math.round((2 * Math.PI * (g.R + hr)) / (hr * 4)));
        for (let i = 0; i < n; i++) {
          const a = th0 + (i * 2 * Math.PI) / n;
          ctx.beginPath();
          ctx.arc(Math.cos(a) * (g.R + hr), Math.sin(a) * (g.R + hr), hr * 0.62, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };

    // Specular sweep: a bright diagonal band raking across the gear faces after each lock (mid tones only, so type stays put).
    const fx = OM.post(el, c, {
      effect: `vec4 effect(vec2 uv) {
  vec2 s = cam(uv);
  vec4 c = src(s);
  float d = dot(s * vec2(uRes.x / uRes.y, 1.0), normalize(vec2(1.0, 0.55)));
  float band = exp(-pow((d - uP0.x) / 0.07, 2.0)) + 0.4 * exp(-pow((d - uP0.x + 0.16) / 0.03, 2.0));
  float lum = dot(c.rgb, vec3(0.3, 0.59, 0.11));
  float m = smoothstep(0.05, 0.1, lum) * (1.0 - smoothstep(0.38, 0.5, lum));
  c.rgb += vec3(0.855, 0.925, 0.776) * band * m * 0.55 * uAmount;
  return c;
}`,
    });
    const LOCKS = [...on, DOWN];
    return {
      render(t, T) {
        const ctx = c.ensure();
        const dpr = c.dpr;
        if (T < start + 0.05) return fx.apply(T), OM.handoff('grid', ctx, T, dpr);
        if (T > END - 0.07) return fx.apply(T), OM.handoff('line', ctx, T, dpr);
        ctx.fillStyle = ink.bg;
        ctx.fillRect(0, 0, 1920, 1080);
        // The grid it cut in on, fading as the parts arrive.
        const gA = 1 - sm(T, start + 0.05, on[1]);
        if (gA > 0) {
          const snap = (v) => Math.round(v * dpr) / dpr;
          ctx.globalAlpha = gA;
          ctx.fillStyle = th['border-subtle'];
          for (let col = L.cMin; col <= L.cMin + L.cols; col++) ctx.fillRect(snap(L.x0 + col * L.cw), 0, 1, 1080);
          for (let row = L.rMin; row <= L.rMin + L.rows; row++) ctx.fillRect(0, snap(L.y0 + row * L.ch), 1920, 1);
          ctx.globalAlpha = 1;
        }
        const G = layout(ctx);
        const s = drive(T);
        const drop = decay(T, on[K], 0.16), down = decay(T, DOWN, 0.12);
        const tick = TICKS.reduce((m, x) => Math.max(m, decay(T, x, 0.05)), 0);
        const crush = OM.ease.inOutCubic(OM.prog(T, OFF[0] + 0.01, OFF[1]));
        const dark = sm(T, OFF[0], OFF[0] + 0.08);
        // The drop shakes the frame.
        const shake = 14 * drop * Math.sin((T - on[K]) * 90);
        ctx.save();
        ctx.translate(960, YC + shake);
        ctx.scale(1 + 0.12 * crush, Math.max(0.002, 1 - crush));
        ctx.translate(-960, -YC);
        // Back light behind the train, pumping on the ticks.
        pool(ctx, 960, YC, 900, 420, ink.lit, (0.05 + 0.1 * sm(T, on[K], DOWN) + 0.12 * drop + 0.06 * tick) * (1 - crush));
        G.forEach((g, k) => {
          // Flying in: the part accelerates into its mesh and hits on the onset.
          const inbound = k === 0 ? Math.max(0.06, on[0] - start - 0.06) : 0.3;
          const q = OM.prog(T, on[k] - inbound, on[k]);
          if (q <= 0) return;
          const inq = OM.ease.inCubic(q);
          const from = k % 2 ? 1 : -1;
          const dx = (OM.hash(k, 1, 9) - 0.5) * 700, dy = from * (760 + 200 * OM.hash(k, 2, 9));
          const hit = decay(T, on[k], 0.08);
          const bx = g.x + dx * (1 - inq), by = g.y + dy * (1 - inq) - from * 12 * hit * Math.cos((T - on[k]) * 60);
          const spin = (1 - inq) * 2.2 * Math.PI * (k % 2 ? -1 : 1);
          const th0 = g.th + spin + g.dir * s * ((2 * Math.PI) / g.N);
          const glow = Math.min(1, hit * 1.4 + (k === K ? drop : 0.5 * drop) + 0.6 * tick);
          ctx.save();
          ctx.translate(bx, by);
          gear(ctx, g, th0, glow, k === K);
          // Dial plate: fixed, the word stamped on it at the onset.
          ctx.fillStyle = k === K ? OM.mix(ink.lit, ink.crest, drop) : OM.mix(th['surface-2'], th['border-strong'], hit);
          ctx.beginPath();
          ctx.arc(0, 0, g.R, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = OM.mix(k === K ? ink.crest : th['border-strong'], ink.crest, hit);
          ctx.lineWidth = 3;
          ctx.stroke();
          if (T >= on[k] && words[k].text && dark < 1) {
            const st = 1 + 0.25 * decay(T, on[k], 0.05);
            ctx.scale(st, st);
            ctx.font = font(800, g.f);
            ctx.textAlign = 'center';
            ctx.textBaseline = 'alphabetic';
            ctx.globalAlpha = 1 - dark;
            ctx.fillStyle = k === K ? th['brand-ink'] : OM.mix(th.text, ink.crest, hit);
            ctx.fillText(words[k].text, 0, g.f * 0.36);
            ctx.globalAlpha = 1;
          }
          ctx.restore();
          // The bite: a crest flash where it meets the gear before it.
          if (k && hit > 0.02) {
            const a = G[k - 1];
            const px = a.x + ((g.x - a.x) * a.r) / (a.r + g.r), py = a.y + ((g.y - a.y) * a.r) / (a.r + g.r);
            pool(ctx, px, py, 120 + (k === K ? 180 : 0), 120 + (k === K ? 180 : 0), ink.crest, 0.7 * hit);
          }
        });
        // Sparks where the teeth bite: a burst at each lock and each tick, closed-form arcs.
        for (let k = 1; k <= K; k++) {
          if (T < on[k]) continue;
          const a = G[k - 1], g = G[k];
          const px = a.x + ((g.x - a.x) * a.r) / (a.r + g.r), py = a.y + ((g.y - a.y) * a.r) / (a.r + g.r);
          for (const h of [on[k], ...TICKS]) {
            const age = T - h;
            if (age < 0 || age > 0.3) continue;
            const n = Math.round(h * 100) + k * 7;
            for (let m = 0; m < (h === on[k] ? 14 : 6); m++) {
              const an = OM.hash(n, m, 31) * Math.PI * 2, sp = 250 + 650 * OM.hash(n, m, 32);
              const x = px + Math.cos(an) * sp * age, y = py + Math.sin(an) * sp * age + 900 * age * age;
              ctx.fillStyle = rgba(m % 3 ? ink.hover : ink.crest, 1 - age / 0.3);
              ctx.fillRect(x - 1.5, y - 1.5, 3, 3);
            }
          }
        }
        ctx.restore();
        // The crushed train becomes the crest line.
        const lineA = sm(T, OFF[1] - 0.11, OFF[1]);
        if (lineA > 0) {
          ctx.globalAlpha = lineA;
          ctx.fillStyle = ink.crest;
          for (let col = L.cMin; col < L.cMin + L.cols; col++) OM.cell(ctx, L, col, H.row, dpr);
          ctx.globalAlpha = 1;
        }
        // Camera: a ratchet roll, one click per lock, unwinding before the crush.
        let rot = 0;
        LOCKS.forEach((h, i) => (rot += (i === LOCKS.length - 1 ? 0.012 : 0.008) * OM.ease.outBack(OM.prog(T, h, h + 0.1), 3)));
        rot *= 1 - OM.ease.inOutCubic(OM.prog(T, 78.62, 78.98));
        if (Math.abs(rot) < 1e-7) rot = 0;
        const last = LOCKS.filter((h) => h <= T).pop();
        const q = last === undefined ? 1 : OM.prog(T, last, last + 0.45);
        const amount = OM.post.envelope(T, start, END, { ramp: 0.2 }) * Math.sin(Math.PI * q) * (1 - crush);
        fx.apply(T, { amount, cam: { rot, zoom: 1 + 1.25 * Math.abs(rot) }, p0: [OM.lerp(-0.2, 2.1, q), 0, 0, 0] });
      },
      release: () => (fx.release(), c.release()),
    };
  },
});
