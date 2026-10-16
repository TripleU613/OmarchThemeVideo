// c3-09 · Collapse and rebirth (keep). The girders' lattice is the home grid,
// and the line is set into it in lit cells: the first word flashes up on its
// onset, the second lands under the downbeat and holds. On the name's onset
// everything collapses: every lit cell is pulled out of the words into the
// mark at the centre, which locks solid and pulses on the kick and downbeat.
// On the next kick the mark detonates, a square shock ring runs out, and behind
// it the homepage field and the wordmark are reborn, cell by cell, across the
// held note, settling into the field with the wordmark at home.
OM.ownWords.add('c3-09');
OM.scene({
  id: 'c3-09',
  build(el, { start, duration }) {
    const C = OM.c3;
    const cv = document.createElement('canvas');
    cv.className = 'om-fill';
    el.appendChild(cv);
    const c = OM.canvas(cv, { alpha: false });
    const END = start + duration;
    const L = OM.HOME;
    const ink = C.ink;
    const words = OM.sung('c3-09');
    const on = words.map((w) => w.t0);
    const n = words.length;
    const NAME = C.nameIndex(words);
    const PULL = on[NAME], LOCK = 278.547, BOOM = 278.802, REST = 279.4;
    const home = OM.cellAt(L, 960, 540);
    // The mark: the 15x15 logo, each logo pixel a 2x2 block of home cells, centred.
    const mark = [];
    for (const [mc, mr] of OM.cells(OM.LOGO))
      for (let b = 0; b < 2; b++) for (let a = 0; a < 2; a++) mark.push([home.col - 15 + mc * 2 + a, home.row - 15 + mr * 2 + b]);
    const WM = OM.cells(OM.WORDMARK);
    const STEP = 9; // the film's lattice type: JetBrains Mono 800 in 8px cells on a 9px pitch

    const type = C.lazy(() => {
      const ks = words.map((_, k) => k).filter((k) => k !== NAME);
      const place = C.layout(words, [{ ks, cap: 120, minCap: 70, cy: 500 }]);
      const pts = C.wordPts(words, place, 800, STEP);
      const cells = [];
      ks.forEach((k) => {
        const P = pts[k];
        for (let i = 0; i < P.length; i += 2) cells.push({ k, x: P[i], y: P[i + 1], slot: mark[cells.length % mark.length] });
      });
      return { place, cells };
    });

    // Camera: a crash zoom into the collapse, an explosive pull back on the rebirth. Effect: a
    // shockwave ring that refracts the frame as it runs out, riding the drawn ring.
    const FX = `vec4 effect(vec2 uv) {
  vec2 p = cam(uv);
  vec2 px = vec2(p.x * 1920.0, (1.0 - p.y) * 1080.0) - vec2(960.0, 540.0);
  vec2 e = px * vec2(1.0, 1.7);
  float d = length(e) - uP0.x;
  float ring = exp(-d * d / 2400.0) * uAmount;
  vec2 dir = normalize(e + 1e-4) / vec2(1.0, 1.7);
  vec2 q = px - dir * ring * 26.0;
  vec3 c = src((q + vec2(960.0, 540.0)) / vec2(1920.0, -1080.0) + vec2(0.0, 1.0)).rgb;
  return vec4(c + ring * 0.25 * vec3(0.73, 0.87, 0.59), 1.0);
}`;
    const fxAt = (T) => {
      const out = OM.ease.outExpo(OM.clamp((T - BOOM) / 1.0));
      const back = OM.ease.outExpo(OM.clamp((T - BOOM) / 0.7));
      const shake = C.decay(T, BOOM, 0.08);
      return {
        amount: T >= BOOM && T < BOOM + 1 ? 1 - out : 0, p0: [out * 1500, 0, 0, 0],
        cam: { zoom: 1 + 0.22 * OM.ease.inCubic(OM.prog(T, PULL - 0.05, PULL + 0.32)) * (1 - back), x: 14 * shake * Math.sin(T * 97), y: 10 * shake * Math.cos(T * 83) },
      };
    };
    return OM.c3.withFx(el, c, start, END, FX, fxAt)({
      render(t, T) {
        const ctx = c.ensure();
        const dpr = c.dpr;
        if (C.seam(ctx, T, dpr, start, END, 'grid', 'word')) return;
        if (T >= REST) {
          // The reborn wordmark performs on the last four kicks (event times), the last the biggest, then lands
          // back exactly on the field with the wordmark at home before the cut.
          const KK = [279.429, 279.615, 280.149, 280.497], KS = [0.55, 0.7, 0.85, 1.25];
          const gate = 1 - C.sm(T, 280.58, END - 0.08);
          // Field heartbeat: the field glows out from the name on every kick.
          let hb = 0;
          KK.forEach((k, i) => (hb = Math.max(hb, KS[i] * C.decay(T, k, 0.09))));
          hb *= gate;
          if (hb < 0.003) return OM.handoff('word', ctx, T, dpr);
          // Letter punch: the wordmark jumps up a cell on each kick (two on the last), and a crest wave sweeps its letters.
          let lift = 0;
          KK.forEach((k, i) => { const a = T - k; if (a >= 0 && a < 0.09 && gate > 0.5) lift = Math.max(lift, i === 3 ? 2 : 1); });
          ctx.fillStyle = ink.bg;
          ctx.fillRect(0, 0, 1920, 1080);
          const g = [{ x: 960, y: 540, strength: 0.45 * hb, reach: 380 + 700 * hb }];
          OM.hero(ctx, T, dpr, { inks: ink, L, word: false, gain: 0.8, bg: false, glows: g });
          // Lattice rings: each kick throws a ring of lit cells out through the field.
          KK.forEach((k, i) => {
            const age = T - k, life = i === 3 ? 0.18 : 0.3;
            if (age < 0 || age >= life) return;
            const r = 140 + age * (i === 3 ? 3800 : 2600), f = (1 - age / life) * gate, w = L.cw * (i === 3 ? 2 : 1.2);
            ctx.fillStyle = f > 0.5 ? ink.hover : ink.lit;
            for (let row = L.rMin; row < L.rMin + L.rows; row++)
              for (let col = L.cMin; col < L.cMin + L.cols; col++) {
                const d = Math.hypot(L.x0 + (col + 0.5) * L.cw - 960, (L.y0 + (row + 0.5) * L.ch - 540) * 1.7);
                if (Math.abs(d - r) < w && OM.hash(col, row, 0x909) < 0.35 + 0.5 * f) OM.cell(ctx, L, col, row, dpr);
              }
          });
          const sweep = (col) => KK.some((k, i) => {
            const a = T - k, dur = i === 3 ? 0.18 : 0.25;
            return a >= 0 && a < dur && gate > 0.3 && Math.abs(col - (-5 + (a / dur) * 91)) < (i === 3 ? 6 : 4);
          });
          // The beat's glow stays out of the letters: the field inside the wordmark's box (empty at rest, the hero
          // clears it) is held dark, so only the letters light.
          ctx.fillStyle = ink.bg;
          ctx.fillRect(L.x0 - L.cw, L.y0 - 3 * L.ch, 83 * L.cw, 24 * L.ch);
          const Lw = lift ? Object.assign({}, L, { y0: L.y0 - lift * L.ch }) : L;
          OM.paintWord(ctx, Lw, dpr, ink, { glows: g, wordInk: (row, col) => (sweep(col) ? ink.crest : null) });
          return;
        }
        const { cells } = type();
        ctx.fillStyle = ink.bg;
        ctx.fillRect(0, 0, 1920, 1080);

        if (T < BOOM) {
          // The grid, fading as the line collapses out of it.
          const gA = 1 - C.sm(T, PULL, PULL + 0.3);
          if (gA > 0) {
            ctx.globalAlpha = gA;
            OM.handoff('grid', ctx, T, dpr);
            ctx.globalAlpha = 1;
          }
          const pull = OM.ease.inOutExpo(OM.prog(T, PULL - 0.03, PULL + 0.32));
          for (const cl of cells) {
            const t0 = on[cl.k];
            if (T < t0) continue;
            const hit = C.decay(T, t0, 0.12);
            const sx = L.x0 + (cl.slot[0] + 0.5) * L.cw, sy = L.y0 + (cl.slot[1] + 0.5) * L.ch;
            const x = OM.lerp(cl.x, sx, pull), y = OM.lerp(cl.y, sy, pull);
            const v = 0.7 + hit + (pull > 0 && pull < 1 ? 0.6 : 0);
            ctx.fillStyle = v > 1.1 ? ink.crest : v > 0.6 ? ink.hover : ink.lit;
            const s = OM.lerp(STEP - 1, L.cw, pull);
            ctx.fillRect(Math.round(x - s / 2), Math.round(y - s / 2), Math.round(s), Math.round(s));
          }
          // The mark, locked solid once the cells arrive, pulsing on the kick and the downbeat.
          if (pull >= 0.98) {
            const p = C.decay(T, PULL + 0.32, 0.12) + C.decay(T, LOCK, 0.1) + 0.6 * C.decay(T, 278.57, 0.14);
            C.pool(ctx, 960, 540, 520, ink.lit, 0.18 + 0.3 * p);
            ctx.fillStyle = p > 0.6 ? ink.crest : p > 0.25 ? ink.hover : ink.lit;
            for (const [col, row] of mark) OM.cell(ctx, L, col, row, dpr);
          }
          return;
        }
        // Rebirth: the field and the wordmark arriving behind the shock ring, settling to the site's own state.
        const out = OM.ease.outExpo(OM.clamp((T - BOOM) / 1.0));
        const r = out * 1500;
        const settle = C.sm(T, BOOM + 0.35, REST - 0.05);
        const inR = (x, y) => Math.hypot(x - 960, (y - 540) * 1.7) < r;
        OM.hero(ctx, T, dpr, {
          inks: ink, L, word: false, gain: OM.lerp(1.25, 0.8, settle), bg: false,
          mask: (col, row) => (inR(L.x0 + (col + 0.5) * L.cw, L.y0 + (row + 0.5) * L.ch) ? 1 : 0),
          glows: settle < 1 ? [{ x: 960, y: 540, strength: (1 - settle) * (1 - out * 0.6), reach: Math.max(1, r) }] : [],
        });
        for (const [col, row] of WM) {
          const x = L.x0 + (col + 0.5) * L.cw, y = L.y0 + (row + 0.5) * L.ch;
          if (!inR(x, y)) continue;
          const fresh = Math.hypot(x - 960, (y - 540) * 1.7) > r - 160 && settle < 1;
          ctx.fillStyle = fresh ? ink.crest : settle < 0.5 && (1 - settle) * OM.hash(col, row, 5) > 0.4 ? ink.hover : ink[OM.BANDS[row]];
          OM.cell(ctx, L, col, row, dpr);
        }
        // Particles blown out of the mark.
        for (let j = 0; j < 300; j++) {
          const age = T - BOOM;
          if (age > 1.2) break;
          const a = OM.hash(j, 1, 99) * Math.PI * 2, sp = 500 + 900 * OM.hash(j, 2, 99);
          const r = sp * OM.ease.outCubic(age / 1.2);
          ctx.fillStyle = C.rgba(j % 3 ? ink.hover : ink.crest, 1 - age / 1.2);
          const s = OM.lerp(5, 2, age / 1.2);
          ctx.fillRect(Math.round(960 + Math.cos(a) * r - s / 2), Math.round(540 + Math.sin(a) * r * 0.6 - s / 2), Math.round(s), Math.round(s));
        }
        // The mark burning off at the centre, and the ring.
        const mA = 1 - C.sm(T, BOOM, BOOM + 0.25);
        if (mA > 0) {
          ctx.globalAlpha = mA;
          ctx.fillStyle = ink.crest;
          for (const [col, row] of mark) OM.cell(ctx, L, col, row, dpr);
          ctx.globalAlpha = 1;
        }
        if (out < 1) {
          ctx.strokeStyle = ink.crest;
          ctx.lineWidth = L.cw * (1 - out) * 2 + 1;
          ctx.globalAlpha = 1 - out;
          ctx.strokeRect(960 - r, 540 - r / 1.7, r * 2, (r * 2) / 1.7);
          ctx.globalAlpha = 1;
        }
      },
      release: () => c.release(),
    });
  },
});
