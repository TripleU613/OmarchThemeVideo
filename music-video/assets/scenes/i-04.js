// i-04 · The title card, as a rack focus. It opens on i-03's last frame: the
// mark, sharp, on the home lattice. Focus pulls toward the camera: the mark
// melts into square bokeh (an out-of-focus cell spreads into the aperture's
// shape, and this aperture is square) while in front of it the song title
// condenses out of a haze. The big kick gives a first glimpse; through the
// pull-back the accelerating roll makes the focus hunt, one step per hit,
// overshooting and undershooting closer each time; on the 32.95 downbeat it
// locks: the title snaps crisp with a crest flash and a small push. The credit
// racks into focus on the ad-lib. The title is set in lattice cells like the
// wordmark, the subtitle and credit in mono, the way the homepage hero is built.
// On the 35.11 downbeat the glow blooms into white: the out-handoff.
(() => {
  const FONT = "800 132px 'JetBrains Mono'";
  window.__hf = window.__hf || {};
  window.__hf.buildReady = window.__hf.buildReady || {};
  window.__hf.buildReady['i-04-type'] = document.fonts.load(FONT);

  /** Scale v about k by s, then shift by o: the camera on one plane. */
  const at = (v, s, o, k) => k + o + (v - k) * s;

  /** One line of a fractional box filter (radius r, in grid pixels), in place, via prefix sums. */
  const boxLine = (a, off, stride, n, r, P) => {
    const ri = Math.floor(r), f = r - ri, k = 1 / (1 + 2 * r);
    P[0] = 0;
    for (let i = 0; i < n; i++) P[i + 1] = P[i] + a[off + i * stride];
    for (let i = 0; i < n; i++) {
      let s = P[Math.min(n, i + ri + 1)] - P[Math.max(0, i - ri)];
      if (f > 0) {
        if (i - ri - 1 >= 0) s += f * (P[i - ri] - P[i - ri - 1]);
        if (i + ri + 1 < n) s += f * (P[i + ri + 2] - P[i + ri + 1]);
      }
      a[off + i * stride] = s * k;
    }
  };

  /**
   * Square-aperture defocus for a plane of lattice cells: the cells are splatted
   * into a supersampled float grid, box-filtered at any fractional radius (the
   * box is the aperture), and drawn scaled up smoothly. Float all the way, so a
   * wide blur keeps its light instead of rounding away in 8-bit.
   */
  const bokeh = ({ cols, rows, sub, rMax, cellW, cellH, x0, y0 }) => {
    const pad = Math.ceil(rMax * sub) + 2;
    const W = cols * sub + 2 * pad, H = rows * sub + 2 * pad;
    const ch = [0, 1, 2, 3].map(() => new Float32Array(W * H));
    const P = new Float64Array(Math.max(W, H) + 1);
    const cnv = document.createElement('canvas');
    cnv.width = W;
    cnv.height = H;
    const cx = cnv.getContext('2d');
    const img = cx.createImageData(W, H);
    return (ctx, cells, colorOf, r, alpha, s, ox, oy) => {
      if (alpha <= 0.002) return;
      const [R, G, B, A] = ch;
      for (const a of ch) a.fill(0);
      for (const cl of cells) {
        const [cr, cg, cb] = colorOf(cl);
        const gx = pad + cl.gq * sub, gy = pad + cl.gr * sub;
        for (let j = 0; j < sub; j++)
          for (let i = 0; i < sub; i++) {
            const k = (gy + j) * W + gx + i;
            R[k] = cr; G[k] = cg; B[k] = cb; A[k] = 1;
          }
      }
      const rs = Math.min(r, rMax) * sub;
      for (const a of ch) {
        for (let y = 0; y < H; y++) boxLine(a, y * W, 1, W, rs, P);
        for (let x = 0; x < W; x++) boxLine(a, x, W, H, rs, P);
      }
      const d = img.data;
      for (let k = 0, p = 0; k < W * H; k++, p += 4) {
        const a = A[k];
        if (a < 1e-4) { d[p + 3] = 0; continue; }
        d[p] = R[k] / a; d[p + 1] = G[k] / a; d[p + 2] = B[k] / a; d[p + 3] = Math.min(255, a * 255);
      }
      cx.putImageData(img, 0, 0);
      ctx.globalAlpha = alpha;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      const gx0 = x0 - (pad / sub) * cellW, gy0 = y0 - (pad / sub) * cellH;
      ctx.drawImage(cnv, at(gx0, s, ox, 960), at(gy0, s, oy, 540), (W / sub) * cellW * s, (H / sub) * cellH * s);
      ctx.globalAlpha = 1;
    };
  };

  OM.scene({
    id: 'i-04',
    build(el) {
      const cv = document.createElement('canvas');
      cv.className = 'om-fill';
      el.appendChild(cv);
      const c = OM.canvas(cv, { alpha: false });
      const L = OM.HOME;
      const ink = OM.fieldInks('tokyo-night');
      const th = OM.theme('tokyo-night');
      const INKS = [ink.dim, ink.mid, ink.lit, ink.hover, ink.crest];
      const RGB = INKS.map(OM.rgb);

      // ---- timing (audiomap: kick 30.79, accelerating roll + risers into the 33.0 surge, ad-lib 34.58) ----
      const OPEN = 28.65;
      const KICK = 30.79;
      const HUNT = [31.3, 31.556, 31.811, 32.09, 32.345, 32.647, 32.879];
      const LOCK = OM.downbeatsIn(32.5, 33.5)[0]; // 32.949
      const CREDIT = OM.beatsIn(34.4, 34.8)[0]; // 34.575
      const END = 36.711;
      const BLOOM = OM.downbeatsIn(35, 35.2)[0]; // 35.109
      const WHITE = END - 0.08; // the last frames are exactly the white handoff
      const white = OM.theme('white').bg;
      // Focus distance: 0 = the mark (far), 1 = the title (near).
      const guess = (j) => 1 + (j % 2 ? -1 : 1) * 0.42 * Math.pow(0.66, j);
      const focus = (T) => {
        if (T < KICK) return 0.45 * OM.ease.inOutSine(OM.prog(T, OPEN, KICK));
        if (T < HUNT[0]) return OM.lerp(0.45, 0.82, OM.ease.outCubic(OM.prog(T, KICK, KICK + 0.33)));
        if (T >= LOCK) return 1;
        const k = OM.hitCount(HUNT, T) - 1;
        return OM.lerp(k === 0 ? 0.82 : guess(k - 1), guess(k), OM.ease.outCubic(OM.prog(T, HUNT[k], HUNT[k] + 0.08)));
      };
      const BLUR_MARK = 6, BLUR_TITLE = 6; // cells of defocus per unit of focus distance

      // ---- the mark, exactly as i-03 leaves it: 60x60 cells, inks from the hero's noise ----
      const N = 60, HN = N / 2;
      const home = OM.cellAt(L, 960, 540);
      const markX0 = L.x0 + (home.col - HN) * L.cw, markY0 = L.y0 + (home.row - HN) * L.ch;
      const markCells = [];
      for (let v = 0; v < N; v++) for (let u = 0; u < N; u++) if (OM.LOGO.rows[v >> 2][u >> 2] === '1') markCells.push({ gq: u, gr: v });
      const markInk = (u, v, T) => {
        const t2 = OM.threshold(u, v);
        const n = OM.heroNoise(u / 9 + T * 0.14, v / 9 - T * 0.055);
        const val = 0.3 + 0.7 * n * n + 0.12 * Math.sin(T * 1.1 + OM.heroJitter[(v * 37 + u * 11) & 4095] * 6.283);
        return val > 0.62 + 0.3 * t2 ? 3 : val > 0.2 + 0.25 * t2 ? 2 : 1;
      };
      const markBokeh = bokeh({ cols: N, rows: N, sub: 3, rMax: BLUR_MARK * 1.45, cellW: L.cw, cellH: L.ch, x0: markX0, y0: markY0 });

      // ---- the title: JetBrains Mono ExtraBold rasterized onto a half-size lattice ----
      const cw = L.cw / 2, ch = L.ch / 2;
      const TITLE = 'WE CAN FIX EVERYTHING';
      let type = null;
      const rasterize = () => {
        const S = 4;
        const m = document.createElement('canvas').getContext('2d');
        m.font = FONT;
        const met = m.measureText(TITLE);
        const w = Math.ceil(met.width) + 8, asc = Math.ceil(met.actualBoundingBoxAscent) + 4, h = asc + Math.ceil(met.actualBoundingBoxDescent) + 4;
        const cnv = document.createElement('canvas');
        cnv.width = w * S;
        cnv.height = h * S;
        const x = cnv.getContext('2d', { willReadFrequently: true });
        x.scale(S, S);
        x.font = FONT;
        x.fillStyle = '#fff';
        x.fillText(TITLE, 4, asc);
        const px = x.getImageData(0, 0, cnv.width, cnv.height).data;
        const cols = Math.ceil(w / cw), rows = Math.ceil(h / ch);
        const lit = [];
        for (let r = 0; r < rows; r++)
          for (let q = 0; q < cols; q++) {
            let sum = 0, n = 0;
            for (let yy = Math.floor(r * ch * S); yy < Math.min(cnv.height, Math.floor((r + 1) * ch * S)); yy++)
              for (let xx = Math.floor(q * cw * S); xx < Math.min(cnv.width, Math.floor((q + 1) * cw * S)); xx++) { sum += px[(yy * cnv.width + xx) * 4 + 3]; n++; }
            if (n && sum / n > 120) lit.push([q, r]);
          }
        const r0 = Math.min(...lit.map((p) => p[1])), r1 = Math.max(...lit.map((p) => p[1]));
        const q0 = Math.min(...lit.map((p) => p[0])), q1 = Math.max(...lit.map((p) => p[0]));
        const R = r1 - r0 + 1, C = q1 - q0 + 1;
        // Banded like the wordmark, crest at the top; no dim rows, so it reads over the bokeh.
        const band = (r) => { const f = r / Math.max(1, R - 1); return f < 0.3 ? 4 : f < 0.45 ? 3 : f < 0.72 ? 2 : 1; };
        const x0 = 960 - (C * cw) / 2, y0 = 486 - (R * ch) / 2;
        return {
          ok: document.fonts.check(FONT),
          R, x0, y0,
          cells: lit.map(([q, r]) => ({ gq: q - q0, gr: r - r0, ink: band(r - r0) })),
          blur: bokeh({ cols: C, rows: R, sub: 2, rMax: BLUR_TITLE, cellW: cw, cellH: ch, x0, y0 }),
        };
      };

      /** Crisp lattice cells on a plane, edges snapped to device pixels so neighbours butt exactly. */
      const crisp = (ctx, dpr, cells, x0, y0, w, h, fill, alpha, s, ox, oy) => {
        if (alpha <= 0.002) return;
        const snap = (v) => Math.round(v * dpr) / dpr;
        ctx.globalAlpha = alpha;
        for (const cl of cells) {
          ctx.fillStyle = fill(cl);
          const xa = snap(at(x0 + cl.gq * w, s, ox, 960)), ya = snap(at(y0 + cl.gr * h, s, oy, 540));
          const xb = snap(at(x0 + (cl.gq + 1) * w, s, ox, 960)), yb = snap(at(y0 + (cl.gr + 1) * h, s, oy, 540));
          ctx.fillRect(xa, ya, xb - xa, yb - ya);
        }
        ctx.globalAlpha = 1;
      };
      /** A plane at defocus r: crisp cells cross-fading into its square bokeh. */
      const plane = (ctx, dpr, P, r, alpha, s, ox, oy) => {
        const soft = OM.smooth(OM.clamp((r - 0.06) / 0.35));
        if (soft < 1) crisp(ctx, dpr, P.cells, P.x0, P.y0, P.w, P.h, (cl) => INKS[P.ink(cl)], alpha * (1 - soft), s, ox, oy);
        if (soft > 0) P.blur(ctx, P.cells, (cl) => RGB[P.ink(cl)], r, alpha * soft, s, ox, oy);
      };
      /** Mono text on a plane, defocused with the same radius (a Gaussian of matching spread; canvas blur is in device pixels). */
      const text = (ctx, dpr, str, font, color, x, y, spacing, rPx, alpha) => {
        if (alpha <= 0.003) return;
        ctx.font = font;
        ctx.letterSpacing = spacing;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = color;
        ctx.globalAlpha = alpha;
        ctx.filter = rPx > 0.3 ? `blur(${(rPx * 0.58 * dpr).toFixed(2)}px)` : 'none';
        ctx.fillText(str, x, y);
        ctx.filter = 'none';
        ctx.globalAlpha = 1;
        ctx.letterSpacing = '0px';
        ctx.textAlign = 'left';
      };

      return {
        render(t, T) {
          const ctx = c.ensure();
          const dpr = c.dpr;
          if (T >= WHITE) return OM.handoff('white', ctx, T, dpr);
          if (!type || (!type.ok && document.fonts.check(FONT))) type = rasterize();
          ctx.fillStyle = ink.bg;
          ctx.fillRect(0, 0, 1920, 1080);
          const d = focus(T);
          // Camera: a slow drift (the near plane moves more than the far: parallax) and a push that lands on the lock.
          const age = T - OPEN;
          const dx = 10 * Math.sin(age * 0.6), dy = 6 * Math.sin(age * 0.43);
          const sFar = 1 + 0.06 * OM.smooth(OM.prog(T, OPEN, END));
          const punch = T >= LOCK ? 0.018 * Math.exp(-(T - LOCK) / 0.18) : 0;
          const sNear = OM.lerp(0.95, 1, OM.smooth(OM.prog(T, OPEN, LOCK))) + punch + 0.012 * OM.prog(T, LOCK + 0.5, END);

          // Far plane: the mark, its light spreading as it defocuses; after the surge it breathes with the kick.
          const rMark = BLUR_MARK * d;
          const breath = T >= LOCK ? 0.85 + 0.3 * OM.audio(T).kick : 1;
          plane(ctx, dpr, {
            cells: markCells, x0: markX0, y0: markY0, w: L.cw, h: L.ch, blur: markBokeh,
            ink: (cl) => markInk(cl.gq, cl.gr, T),
          }, rMark, OM.lerp(1, 0.42, OM.smooth(OM.clamp(rMark / 2.5))) * breath, sFar, dx * 0.35, dy * 0.35);

          // Near plane: the title, invisible at the cut, condensing out of its haze as focus arrives.
          const rTitle = BLUR_TITLE * Math.abs(1 - d);
          const show = OM.smooth(OM.clamp(d / 0.3));
          const flash = T >= LOCK ? (T - LOCK) / 0.1 : -1;
          plane(ctx, dpr, {
            cells: type.cells, x0: type.x0, y0: type.y0, w: cw, h: ch, blur: type.blur,
            ink: (cl) => {
              if (flash >= 0 && cl.gr <= flash * type.R && OM.threshold(cl.gq, cl.gr) > (T - LOCK - 0.1 - cl.gr * 0.006) / 0.45) return 4;
              return cl.ink;
            },
          }, rTitle, show, sNear, dx, dy);

          // Subtitle on the near plane; the credit racks in on its own on the ad-lib.
          text(ctx, dpr, 'THE ULTIMATE MACHINE', "500 34px 'JetBrains Mono'", th.text, at(960, sNear, dx, 960), at(598, sNear, dy, 540), '0.34em', rTitle * cw * sNear, show * 0.92);
          if (T >= CREDIT - 0.05) {
            const p = OM.ease.outCubic(OM.prog(T, CREDIT, CREDIT + 0.3));
            text(ctx, dpr, 'Kevin Koontz / REARRANGED', "400 24px 'JetBrains Mono'", th['text-muted'], at(960, sNear, dx, 960), at(660, sNear, dy, 540), '0.08em', 14 * (1 - p), OM.clamp(p * 2));
          }

          // The ending: on the 35.11 downbeat the mark's glow behind the title swells, warms to
          // white and floods the frame; the screen's light becomes the white world verse 1 opens on.
          if (T >= BLOOM) {
            const w = OM.prog(T, BLOOM, WHITE);
            const core = OM.mix(ink.lit, white, OM.smooth(OM.clamp(w * 1.6)));
            const R = 120 + 1500 * Math.pow(w, 1.6);
            const g = ctx.createRadialGradient(960, 540, 0, 960, 540, R);
            const [r0, g0, b0] = OM.rgb(core), [r1, g1, b1] = OM.rgb(white);
            g.addColorStop(0, `rgba(${r0},${g0},${b0},${OM.clamp(0.25 + w)})`);
            g.addColorStop(0.55, `rgba(${r1},${g1},${b1},${OM.clamp(w * 1.2) * 0.9})`);
            g.addColorStop(1, `rgba(${r1},${g1},${b1},0)`);
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, 1920, 1080);
            ctx.globalAlpha = OM.smooth(OM.prog(T, BLOOM + 0.8, WHITE));
            ctx.fillStyle = white;
            ctx.fillRect(0, 0, 1920, 1080);
            ctx.globalAlpha = 1;
          }
        },
        release: () => c.release(),
      };
    },
  });
})();
