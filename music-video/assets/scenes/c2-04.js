// c2-04 · Skyline. The glow from the cut sinks to the horizon and becomes the
// light dome over a night city whose windows are the film's lattice cells.
// Each word is spelled in windows across the towers, switching on in a fast
// wave on its onset, crest at the front and holding green; the key word's
// downbeat sends a wave through every window in the city. Snares wake scattered
// windows. After the line has read together the city goes dark window by
// window, the facades dissolve, and only the lattice it was built on is left:
// the grid of the next cut.
OM.ownWords.add('c2-04');
(() => {
  const W = 800;
  OM.c2.ready('c2-04', W);
  const { pool, sm, decay } = OM.c2;

  const FX = `vec4 effect(vec2 uv) {
    vec2 p = cam(uv);
    if (uAmount <= 0.0) return src(p);
    // City bloom: the lit windows glow into the night air, and flicker faintly.
    vec4 c = src(p);
    vec3 b = vec3(0.0);
    vec2 px = 6.0 / uRes;
    for (int i = -3; i <= 3; i++) for (int k = -3; k <= 3; k++) b += max(src(p + vec2(float(i), float(k)) * px).rgb - 0.45, 0.0);
    b /= 49.0;
    float fl = 0.92 + 0.08 * hash(floor(p * vec2(132.0, 75.0)) + floor(uTime * 8.0));
    c.rgb = c.rgb * mix(1.0, fl, uAmount * step(0.3, c.g)) + b * vec3(0.7, 1.0, 0.6) * 1.8 * uAmount;
    return c;
  }`;

  OM.scene({
    id: 'c2-04',
    build(el, { start, duration }) {
      const cv = document.createElement('canvas');
      cv.className = 'om-fill';
      el.appendChild(cv);
      const c = OM.canvas(cv, { alpha: false });
      const fx = OM.post(el, c, { effect: FX });
      const END = start + duration;
      const ink = OM.fieldInks('tokyo-night'), th = OM.theme('tokyo-night');
      const words = OM.sung('c2-04');
      const on = words.map((w) => w.t0);
      // The key word: the longest held one (the city-wide wave lands with it).
      let K = 0;
      words.forEach((w, k) => { if (w.t1 - w.t0 > words[K].t1 - words[K].t0) K = k; });
      const DB1 = OM.downbeatsIn(171.6, 172)[0] || 171.851, DB2 = OM.downbeatsIn(173.8, 174.2)[0] || 173.987;
      const SNARES = [170.365, 170.852, 171.433, 171.897, 172.176, 172.71, 172.965, 173.383];
      const OUT = DB2, GONE = 174.42;
      const HM = OM.HOME, V = 5200;

      const get = OM.c2.lazy(W, () => {
        const L = OM.c2.layout(words, { weight: W, cap: 150, maxW: 1800, cy: 580, rows: 3, lead: 1.32, minCap: 100 });
        const lit = new Map(); // "col,row" -> { k, t } when the window lights
        const colsWithText = new Map(); // col -> top text row
        words.forEach((wd, k) => {
          const p = L.place[k];
          if (!p) return;
          for (const cl of OM.c2.raster(wd.text, p.x, p.base, L.px, W, HM.cw, HM.ch, HM.x0, HM.y0, 0.36)) {
            lit.set(cl.i + ',' + cl.j, { k, t: on[k] + (cl.x - p.x) / V });
            colsWithText.set(cl.i, Math.min(colsWithText.get(cl.i) ?? 999, cl.j));
          }
        });
        // Towers left to right; an alley only where no letter would be cut.
        const rng = OM.rng(0xc204), bottom = HM.rMin + HM.rows;
        const top = new Map();
        let col = HM.cMin;
        while (col < HM.cMin + HM.cols) {
          const w = 4 + Math.floor(rng() * 8);
          const x = HM.x0 + col * HM.cw;
          const edge = Math.abs(x - 960) / 960;
          let t = OM.cellAt(HM, 0, 200 + 520 * edge * edge + 140 * rng()).row;
          for (let i = col; i < col + w; i++) if (colsWithText.has(i)) t = Math.min(t, colsWithText.get(i) - 2 - Math.floor(rng() * 4));
          for (let i = col; i < col + w; i++) top.set(i, t);
          col += w;
          if (!colsWithText.has(col)) col += 1; // the alley
        }
        return { lit, top, bottom };
      });

      // Flat per-window tables, built once.
      let wins = null;
      const win = () => {
        const g = get();
        if (wins && wins.src === g) return wins;
        const list = [];
        for (const [col, t0] of g.top) for (let row = t0; row < g.bottom; row++) list.push([col, row]);
        const n = list.length, F = (f) => Float32Array.from(list, f);
        wins = {
          src: g, n,
          col: Int32Array.from(list, ([c0]) => c0), row: Int32Array.from(list, ([, r]) => r),
          x: F(([c0]) => HM.x0 + c0 * HM.cw), y: F(([, r]) => HM.y0 + r * HM.ch),
          k: Int32Array.from(list, ([c0, r]) => { const w = g.lit.get(c0 + ',' + r); return w ? w.k : -1; }),
          t: Float64Array.from(list, ([c0, r]) => { const w = g.lit.get(c0 + ',' + r); return w ? w.t : 0; }),
          h4: F(([c0, r]) => OM.hash(c0, r, 4)), h5: F(([c0, r]) => OM.hash(c0, r, 5)),
          r: F(([c0, r]) => Math.hypot(HM.x0 + c0 * HM.cw - 960, (HM.y0 + r * HM.ch - 560) * 1.4)),
        };
        return wins;
      };
      // The towers' facades and dark windows, cached per dpr.
      let city = null;
      const cityCanvas = (dpr) => {
        const g = get();
        if (city && city.dpr === dpr && city.src === g) return city.cv;
        const cvs = document.createElement('canvas');
        cvs.width = 1920 * dpr;
        cvs.height = 1080 * dpr;
        const x = cvs.getContext('2d');
        x.setTransform(dpr, 0, 0, dpr, 0, 0);
        for (const [col, t0] of g.top)
          for (let row = t0; row < g.bottom; row++) {
            x.fillStyle = th.surface;
            OM.cell(x, HM, col, row, dpr);
            x.fillStyle = th['bg-deep'];
            x.fillRect(HM.x0 + col * HM.cw + 2, HM.y0 + row * HM.ch + 2, HM.cw - 4, HM.ch - 4);
          }
        city = { dpr, src: g, cv: cvs };
        return cvs;
      };

      return {
        draw(t, T) {
          const ctx = c.ensure();
          const dpr = c.dpr;
          if (T < start + 0.05) return OM.handoff('glow', ctx, T, dpr);
          if (T > END - 0.07) return OM.handoff('grid', ctx, T, dpr);
          const { lit, top, bottom } = get();
          ctx.fillStyle = ink.bg;
          ctx.fillRect(0, 0, 1920, 1080);
          // The glow sinks behind the skyline into its light dome.
          const sink = OM.ease.inOutCubic(OM.prog(T, start, start + 0.7));
          const out = sm(T, OUT, GONE);
          pool(ctx, 960, OM.lerp(540, 980, sink), 620 + 500 * sink, OM.lerp(620, 300, sink), ink.lit, OM.lerp(0.5, 0.2, sink) * (1 - out));

          const facade = sm(T, start, start + 0.35) * (1 - out);
          const nSn = OM.hitCount(SNARES, T);
          const sn = SNARES.reduce((a, s) => Math.max(a, decay(T, s, 0.1)), 0);
          const dbA = T - DB1;
          // Darkening: windows go out right to left, a beat's worth of sweep.
          const sweep = 2100 - 2400 * OM.prog(T, OUT, OUT + 0.3);
          // The towers and their dark windows are static: one cached layer, faded as a whole.
          if (facade > 0) {
            ctx.globalAlpha = facade;
            ctx.drawImage(cityCanvas(dpr), 0, 0, 1920, 1080);
            ctx.globalAlpha = 1;
          }
          // Only lit windows are drawn per frame, batched by ink.
          const W2 = win();
          const INKS = [ink.dim, ink.mid, ink.lit, ink.hover, ink.crest];
          const full = INKS.map(() => []), inset = INKS.map(() => []);
          const CI = { [ink.dim]: 0, [ink.mid]: 1, [ink.lit]: 2, [ink.hover]: 3, [ink.crest]: 4 };
          for (let n = 0; n < W2.n; n++) {
            const x = W2.x[n], y = W2.y[n], k = W2.k[n];
            if (x > sweep && T >= OUT) continue;
            let p = null;
            if (k >= 0 && T >= W2.t[n]) {
              const a = T - W2.t[n];
              p = a < 0.06 ? ink.crest : k === K ? (a < 0.4 ? ink.hover : ink.crest) : a < 0.2 ? ink.crest : ink.hover;
              if (sn > 0.5 && OM.hash(W2.col[n], W2.row[n], nSn) < 0.3) p = ink.crest;
              full[CI[p]].push(n);
              continue;
            }
            if (W2.h4[n] < 0.02 + 0.006 * nSn) p = W2.h5[n] < 0.5 ? ink.dim : ink.mid;
            // The city-wide wave on the key word's downbeat, out from the centre.
            if (dbA >= 0 && dbA < 0.7) {
              const front = dbA * 2600 - W2.r[n];
              if (front > 0 && front < 90) p = front < 30 ? ink.lit : ink.mid;
            }
            if (p) inset[CI[p]].push(n);
          }
          INKS.forEach((col, i) => {
            if (!full[i].length && !inset[i].length) return;
            ctx.fillStyle = col;
            ctx.beginPath();
            for (const n of full[i]) {
              const x0 = Math.round(W2.x[n] * dpr) / dpr, y0 = Math.round(W2.y[n] * dpr) / dpr;
              ctx.rect(x0, y0, Math.round((W2.x[n] + HM.cw) * dpr) / dpr - x0, Math.round((W2.y[n] + HM.ch) * dpr) / dpr - y0);
            }
            for (const n of inset[i]) ctx.rect(W2.x[n] + 2, W2.y[n] + 2, HM.cw - 4, HM.ch - 4);
            ctx.fill();
          });
          // The lattice the city stood on comes through as it goes.
          const g = sm(T, OUT + 0.1, GONE);
          if (g > 0) {
            const snap = (v) => Math.round(v * dpr) / dpr;
            ctx.fillStyle = OM.c2.rgba(th['border-subtle'], g);
            for (let cc = HM.cMin; cc <= HM.cMin + HM.cols; cc++) ctx.fillRect(snap(HM.x0 + cc * HM.cw), 0, 1, 1080);
            for (let r = HM.rMin; r <= HM.rMin + HM.rows; r++) ctx.fillRect(0, snap(HM.y0 + r * HM.ch), 1920, 1);
          }
        },
        render(t, T) {
          this.draw(t, T);
          const ctx = c.ensure();
          if (OM.c2.live(T, start, END)) {
          const { top } = get();
          const out = sm(T, OUT, GONE);
          // Searchlights sweeping the sky.
          for (const [bx, ph] of [[330, 0], [1610, 2.1]]) {
            const ang = -Math.PI / 2 + 0.5 * Math.sin(T * 0.8 + ph);
            ctx.save();
            ctx.translate(bx, 1080);
            ctx.rotate(ang + Math.PI / 2);
            const g = ctx.createLinearGradient(0, 0, 0, -1100);
            g.addColorStop(0, OM.c2.rgba(ink.lit, 0.12 * (1 - out) * sm(T, start, start + 0.6)));
            g.addColorStop(1, OM.c2.rgba(ink.lit, 0));
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.moveTo(-8, 0);
            ctx.lineTo(8, 0);
            ctx.lineTo(90, -1100);
            ctx.lineTo(-90, -1100);
            ctx.fill();
            ctx.restore();
          }
          // Warning lights blinking on the tower tops.
          let prev = null;
          for (const [col, r] of top) {
            if (r !== prev && OM.hash(col, 0, 41) < 0.5) {
              const on2 = (T * 1.2 + OM.hash(col, 1, 41)) % 1 < 0.35;
              if (on2 && !out && T > start + 0.5) {
                ctx.fillStyle = ink.crest;
                ctx.fillRect(HM.x0 + col * HM.cw + 3, HM.y0 + (r - 1) * HM.ch + 4, 7, 7);
              }
            }
            prev = r;
          }
          }
          // Helicopter pass: a slow track across the city with an altitude bob.
          OM.c2.apply(fx, T, start, END, { amount: 1, x: 40 - 80 * OM.prog(T, start, END), y: 10 * Math.sin(T * 1.6), rot: 0.008 * Math.sin(T * 0.5) });
        },
        release: () => {
          city = null;
          wins = null;
          fx.release();
          c.release();
        },
      };
    },
  });
})();
