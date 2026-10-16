// p1-01 · Crate digging. The stage spotlight from the cut falls on a record
// crate. Each sung word is a sleeve: on its onset that sleeve is yanked up
// out of the crate and slaps into a row above it, title out, so the line is
// pulled record by record. The key word is the lit sleeve, pulled on the
// downbeat with the spot flaring and its vinyl sliding out. Then the sleeves
// drop back into the crate and the spotlight closes down to a single point
// of light on the floor: the pen p1-02 starts with.
OM.ownWords.add('p1-01');
(() => {
  const rgba = (hex, a) => {
    const [r, g, b] = OM.rgb(hex);
    return `rgba(${r},${g},${b},${a})`;
  };
  /** handoff.js's elliptical pool of light. */
  const pool = (ctx, x, y, rx, ry, hex, a) => {
    if (a <= 0.002 || rx <= 0) return;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1, ry / rx);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
    g.addColorStop(0, rgba(hex, a));
    g.addColorStop(1, rgba(hex, 0));
    ctx.fillStyle = g;
    ctx.fillRect(-rx, -rx, 2 * rx, 2 * rx);
    ctx.restore();
  };
  const font = (w, px) => `${w} ${px}px 'JetBrains Mono'`;
  const PEN = { x: 960, y: 880, s: 16 };
  // Shared by the whole pre-chorus (scene files load in timeline order).
  OM.p1 = {
    rgba, pool, font,
    sm: (T, a, b) => OM.smooth(OM.prog(T, a, b)),
    decay: (T, t0, half) => (T < t0 ? 0 : Math.pow(0.5, (T - t0) / half)),
    PEN,
    /** The pen dot on the night: the p1-01 -> p1-02 seam, drawn by both scenes. */
    pen: (ctx, dpr, k = 1) => {
      const ink = OM.fieldInks('tokyo-night');
      pool(ctx, PEN.x, PEN.y, 64, 64, ink.lit, 0.45 * k);
      const s = PEN.s * k, snap = (v) => Math.round(v * dpr) / dpr;
      ctx.fillStyle = ink.crest;
      ctx.fillRect(snap(PEN.x - s / 2), snap(PEN.y - s / 2), snap(s), snap(s));
    },
    /** Widest font px (<= max) at which words idx fit in maxW, set as one run. */
    fit: (ctx, words, idx, weight, maxW, max, min = 40) => {
      let px = max;
      for (; px > min; px *= 0.97) {
        ctx.font = font(weight, px);
        let w = 0;
        idx.forEach((k, n) => (w += (n && words[k].space ? ctx.measureText(' ').width : 0) + ctx.measureText(words[k].text).width));
        if (w <= maxW) break;
      }
      return px;
    },
  };
  window.__hf = window.__hf || {};
  window.__hf.buildReady = window.__hf.buildReady || {};
  window.__hf.buildReady['p1-type'] = Promise.all([800, 700, 500].map((w) => document.fonts.load(font(w, 100))));

  OM.scene({
    id: 'p1-01',
    build(el, { start, duration }) {
      const cv = document.createElement('canvas');
      cv.className = 'om-fill';
      el.appendChild(cv);
      const c = OM.canvas(cv, { alpha: false });
      const END = start + duration;
      const ink = OM.fieldInks('tokyo-night');
      const th = OM.theme('tokyo-night');
      const words = OM.sung('p1-01');
      const on = words.map((w) => w.t0);
      const K = words.length - 1;
      const { sm, decay } = OM.p1;
      const KICK = 73.607, DOWN = on[K];
      const DROP = 74.58; // sleeves fall back into the crate
      const CLOSE = [74.64, END - 0.08]; // the spot closes to the pen

      // Crate: front face 660..1260 x 770..950, sitting in the spot's floor pool.
      const CX0 = 640, CX1 = 1280, CY0 = 770, CY1 = 950;
      const SH = 300; // sleeve height
      const ROW_Y = 330; // row centre
      const layout = (ctx) => {
        const pad = 64, gap = 26;
        const big = 1.22; // the key sleeve is bigger
        let px = 120;
        for (; px > 70; px *= 0.97) {
          let tot = 0;
          words.forEach((w, k) => {
            const f = k === K ? px * big : px;
            ctx.font = font(800, f);
            tot += Math.max(k === K ? SH * big : SH, ctx.measureText(w.text).width + pad * 2) + gap;
          });
          if (tot - gap <= 1820) break;
        }
        const out = [];
        let tot = 0;
        words.forEach((w, k) => {
          const f = k === K ? px * big : px;
          ctx.font = font(800, f);
          const tw = ctx.measureText(w.text).width;
          const h = k === K ? SH * big : SH;
          out.push({ f, tw, w: Math.max(h, tw + pad * 2), h });
          tot += out[k].w + gap;
        });
        let x = 960 - (tot - gap) / 2;
        out.forEach((s) => ((s.x = x + s.w / 2), (x += s.w + gap)));
        return out;
      };

      /** One sleeve, centred at (x, y), face w x h. */
      const sleeve = (ctx, s, k, x, y, sc, glow, vinyl) => {
        const w = s.w * sc, h = s.h * sc, key = k === K;
        ctx.save();
        ctx.translate(x, y);
        // The record peeking out of the top: a dark disc with a lit label.
        const vr = h * 0.42, vy = -h / 2 + vr * 0.35 - vinyl * h * 0.42;
        ctx.fillStyle = '#08080c';
        ctx.beginPath();
        ctx.arc(w * 0.18, vy, vr, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = th['border-strong'];
        ctx.lineWidth = 1.5;
        for (let r = 0.55; r < 1; r += 0.15) {
          ctx.beginPath();
          ctx.arc(w * 0.18, vy, vr * r, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.fillStyle = key ? ink.crest : ink.mid;
        ctx.beginPath();
        ctx.arc(w * 0.18, vy, vr * 0.3, 0, Math.PI * 2);
        ctx.fill();
        // The sleeve face.
        ctx.fillStyle = key ? OM.mix(ink.lit, ink.crest, glow) : OM.mix(th['surface-2'], th['border-strong'], glow * 0.6);
        ctx.fillRect(-w / 2, -h / 2, w, h);
        // Cover art: a dither of lattice cells across the top band.
        const cs = 14 * sc;
        ctx.fillStyle = key ? ink.mid : ink.dim;
        for (let j = 0; j < 7; j++)
          for (let i = 0; i * cs < w - cs; i++)
            if (OM.hash(i + k * 31, j, 7) < 0.62 - j * 0.08) ctx.fillRect(-w / 2 + cs * 0.5 + i * cs, -h / 2 + cs * 0.5 + j * cs, cs - 2, cs - 2);
        ctx.strokeStyle = key ? ink.crest : OM.mix(th['border-strong'], ink.crest, glow);
        ctx.lineWidth = 3;
        ctx.strokeRect(-w / 2, -h / 2, w, h);
        // Title: the sung word, big, low on the sleeve.
        if (words[k].text) {
          ctx.font = font(800, s.f * sc);
          ctx.textAlign = 'center';
          ctx.textBaseline = 'alphabetic';
          ctx.fillStyle = key ? th['brand-ink'] : OM.mix(th.text, ink.crest, glow);
          ctx.fillText(words[k].text, 0, h / 2 - h * 0.14);
        }
        ctx.restore();
      };

      return {
        render(t, T) {
          const ctx = c.ensure();
          const dpr = c.dpr;
          if (T < Math.max(start + 0.045, on[0])) return OM.handoff('spot', ctx, T, dpr);
          if (T > END - 0.07) {
            ctx.fillStyle = ink.bg;
            ctx.fillRect(0, 0, 1920, 1080);
            return OM.p1.pen(ctx, dpr);
          }
          ctx.fillStyle = ink.bg;
          ctx.fillRect(0, 0, 1920, 1080);
          const S = layout(ctx);
          const cl = OM.ease.inOutCubic(OM.prog(T, CLOSE[0], CLOSE[1]));
          const flare = decay(T, DOWN, 0.18), kick = decay(T, KICK, 0.1);
          // The spotlight: handoff's cone and floor pool, flaring on the key pull, closing to the pen.
          const coneA = (1 + 1.2 * flare + 0.4 * kick) * (1 - cl);
          if (coneA > 0.003) {
            const g = ctx.createLinearGradient(0, 0, 0, 880);
            g.addColorStop(0, rgba(ink.lit, Math.min(0.4, 0.1 * coneA)));
            g.addColorStop(1, rgba(ink.lit, Math.min(0.2, 0.03 * coneA)));
            ctx.fillStyle = g;
            const k = 1 - cl;
            ctx.beginPath();
            ctx.moveTo(960 - 60 * k, 0);
            ctx.lineTo(960 + 60 * k, 0);
            ctx.lineTo(960 + 440 * k, 880);
            ctx.lineTo(960 - 440 * k, 880);
            ctx.closePath();
            ctx.fill();
          }
          pool(ctx, 960, 880, OM.lerp(440, 64, cl), OM.lerp(110, 64, cl), ink.lit, OM.lerp(0.42 + 0.25 * flare, 0.45, cl));

          const crateA = 1 - sm(T, CLOSE[0], CLOSE[0] + 0.1);
          const rise = OM.ease.outExpo(OM.prog(T, on[0], on[0] + 0.12)); // the crate is pushed into the light on w0
          const cy = (1 - rise) * 260;
          if (crateA > 0.01) {
            ctx.save();
            ctx.globalAlpha = crateA;
            ctx.translate(0, cy);
            // The records still in the crate: tops riffling on the hi-hat fill.
            const step = Math.floor(T / (OM.SPB / 4));
            for (let i = 0; i < 9; i++) {
              const jig = T < 73.166 ? 10 * OM.hash(i, step, 3) : 0;
              const top = CY0 - 120 + i * 13 + jig - 18 * kick * (i % 2);
              ctx.fillStyle = [th['surface-2'], ink.dim, th['border-strong'], th.surface][i % 4];
              ctx.fillRect(CX0 + 30 + i * 3, top, CX1 - CX0 - 60 - i * 6, CY0 - top + 10);
              ctx.fillStyle = rgba(ink.hover, 0.5);
              ctx.fillRect(CX0 + 30 + i * 3, top, CX1 - CX0 - 60 - i * 6, 2);
            }
            ctx.restore();
          }
          // Pulled sleeves: up out of the crate on the onset, into the row.
          for (let k = 0; k <= K; k++) {
            if (T < on[k] || !S[k]) continue;
            const s = S[k];
            const up = OM.prog(T, on[k], on[k] + (k === K ? 0.16 : 0.13));
            const back = OM.ease.inCubic(OM.prog(T, DROP + (K - k) * 0.025, DROP + (K - k) * 0.025 + 0.12));
            const p = OM.ease.outBack(up, 1.4);
            const x = OM.lerp(960, s.x, OM.ease.outExpo(up));
            const y = OM.lerp(CY0 + 120, ROW_Y - 10 * kick, p) + back * 620;
            const sc = OM.lerp(0.6, 1, OM.ease.outExpo(up)) * (k === K ? 1 + 0.08 * flare : 1);
            const glow = decay(T, on[k], 0.12) + (k === K ? 0 : 0.5 * flare);
            const vinyl = k === K ? 0.5 * OM.ease.outBack(OM.prog(T, DOWN + 0.05, DOWN + 0.3), 1.6) : 0;
            sleeve(ctx, s, k, x, y, sc, Math.min(1, glow), vinyl);
          }
          // The crate front, over everything that is still inside it.
          if (crateA > 0.01) {
            ctx.save();
            ctx.globalAlpha = crateA;
            ctx.translate(0, cy);
            ctx.fillStyle = th.surface;
            ctx.fillRect(CX0, CY0, CX1 - CX0, CY1 - CY0);
            ctx.fillStyle = th['border-strong'];
            for (let r = 1; r < 3; r++) ctx.fillRect(CX0, CY0 + r * 60, CX1 - CX0, 3);
            ctx.fillStyle = OM.mix(ink.lit, ink.crest, flare);
            ctx.fillRect(CX0, CY0, CX1 - CX0, 4); // the rim, catching the spot
            ctx.fillStyle = '#08080c';
            ctx.fillRect(900, CY0 + 30, 120, 22); // hand hole
            ctx.restore();
          }
          if (cl > 0) OM.p1.pen(ctx, dpr, OM.ease.outBack(OM.prog(T, CLOSE[1] - 0.06, CLOSE[1]), 2));
        },
        release: () => c.release(),
      };
    },
  });
})();
