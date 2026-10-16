// v1-08 · Ownership (keep): enrolling a fingerprint, the way Omarchy sets one
// up with fprintd. The spark v1-07 left is the reader waking: the
// square-spiral mark grows out of it as the print's core. Every sung word is
// one more press: the print's contact sweeps a step further down each time,
// fresh ridges crest then cool, and the ridge the press reaches carries the
// word, written along it in place of the ridge: the first half of the line
// over the top of the whorl, the second under it, like the lettering on a
// coin, so the print reads top to bottom. On the 71.634 downbeat enrollment
// completes: a crest wave runs out along the ridges and the pad lights. Then
// the print lies down into a pool of light on the floor under a spotlight:
// the stage pre-chorus 1 opens on.
OM.ownWords.add('v1-08');
(() => {
  const V = OM.v1;
  const WEIGHT = 800;
  const PROBE = V.ready('v1-08-type', WEIGHT);
  OM.scene({
    id: 'v1-08',
    build(el, { start, duration }) {
      const cv = document.createElement('canvas');
      cv.className = 'om-fill';
      el.appendChild(cv);
      const c = OM.canvas(cv, { alpha: false });
      const END = start + duration, H = V.HOLD;
      const ink = OM.fieldInks('tokyo-night'), th = OM.theme('tokyo-night');
      const sung = OM.sung('v1-08');
      const on = sung.map((w) => w.t0);
      const N = on.length;
      const HM = OM.HOME, hc = OM.cellAt(HM, 960, 540);
      const PX = HM.x0 + (hc.col + 0.5) * HM.cw, PY = HM.y0 + (hc.row + 0.5) * HM.ch; // the spark's centre
      const S = 8, Gp = { x0: PX - S / 2, y0: PY - S / 2, cw: S, ch: S }; // print cell (0,0) sits on the spark
      const DONE = 71.634, SNARES = [68.104, 68.778, 69.404, 71.053, 71.471];
      const LIE0 = 72.2, LIE1 = END - H - 0.01, PRESS = 0.22, CAPMAX = 62;
      const TOPS = Math.ceil(N / 2), RINGS = Math.max(TOPS, N - TOPS);
      // Top words run outer to inner, bottom words inner to outer, so the stack reads in order.
      const ring = (k) => (k < TOPS ? TOPS - 1 - k : k - TOPS);
      const ringR = (k) => 172 + ring(k) * Math.min(92, 276 / Math.max(1, RINGS - 1));
      const RMAX = 172 + (RINGS - 1) * Math.min(92, 276 / Math.max(1, RINGS - 1)) + CAPMAX / 2 + 24;

      const get = V.lazy(PROBE, () => {
        const mt = V.metrics(WEIGHT);
        // Each word on its ring: top arcs for even words, bottom arcs for odd.
        const rings = sung.map((w, k) => {
          const s = w.text.toUpperCase(), R = ringR(k), n = Math.max(1, s.length);
          const size = Math.min(CAPMAX / mt.cap, (0.8 * Math.PI * R) / (n * mt.adv));
          const A = mt.adv * size, cap = mt.cap * size, span = (n * A) / R;
          return { s, R, size, A, cap, span, top: k < TOPS, font: V.font(WEIGHT, size) };
        });
        // The contact's front (y below the centre) after press k: just past word k's ridge.
        const reach = (k) => (k < 0 ? -RMAX - 1 : k >= N - 1 ? RMAX + 1 : rings[k].top ? -rings[k].R + CAPMAX / 2 + 14 : rings[k].R + CAPMAX / 2 + 14);
        const cells = [];
        const lim = Math.ceil(RMAX / S);
        for (let r = -lim; r <= lim; r++)
          for (let q = -lim; q <= lim; q++) {
            const x = q * S, y = r * S, rr = Math.hypot(x, y);
            if (rr > RMAX) continue;
            const lc = q + 7, lr = r + 7;
            if (lc >= 0 && lc < 15 && lr >= 0 && lr < 15) {
              if (OM.LOGO.rows[lr][lc] === '1') cells.push({ q, r, y, e: rr / RMAX, logo: true });
              continue;
            }
            if (rr < 96) continue;
            const ang = Math.atan2(y, x);
            const ph = rr + 6 * Math.sin(ang * 3 + rr * 0.02) + 4 * Math.sin(ang * 5 - rr * 0.013);
            if (((ph % 22) + 22) % 22 > 9) continue;
            // The words' channels: no ridge where a word is written.
            let cut = false;
            for (const g of rings) {
              if (Math.abs(rr - g.R) > g.cap / 2 + 9) continue;
              const mid = g.top ? -Math.PI / 2 : Math.PI / 2;
              let d = ang - mid;
              d = Math.atan2(Math.sin(d), Math.cos(d));
              if (Math.abs(d) < g.span / 2 + 0.06) { cut = true; break; }
            }
            if (!cut) cells.push({ q, r, y, e: rr / RMAX, logo: false });
          }
        for (const cl of cells) {
          let k = 0;
          while (k < N && cl.y > reach(k)) k++;
          cl.at = (cl.logo ? on[0] - 0.1 : on[Math.min(k, N - 1)]) + PRESS * 0.4;
        }
        return { rings, cells, reach };
      });
      const contact = (P, T) => {
        const k = OM.hitCount(on, T);
        if (k === 0) return P.reach(-1);
        return OM.lerp(P.reach(k - 2), P.reach(k - 1), OM.ease.outExpo(OM.clamp((T - on[k - 1]) / PRESS)));
      };
      const pool = (ctx, x, y, rx, ry, hex, a) => {
        if (a <= 0.002) return;
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(1, ry / rx);
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
        g.addColorStop(0, V.rgba(hex, a));
        g.addColorStop(1, V.rgba(hex, 0));
        ctx.fillStyle = g;
        ctx.fillRect(-rx, -rx, 2 * rx, 2 * rx);
        ctx.restore();
      };
      const spot = (ctx, a) => {
        const g = ctx.createLinearGradient(0, 0, 0, 880);
        g.addColorStop(0, V.rgba(ink.lit, 0.1 * a));
        g.addColorStop(1, V.rgba(ink.lit, 0.03 * a));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(900, 0);
        ctx.lineTo(1020, 0);
        ctx.lineTo(1400, 880);
        ctx.lineTo(520, 880);
        ctx.closePath();
        ctx.fill();
        pool(ctx, 960, 880, 440, 110, ink.lit, 0.42 * a);
      };

      return {
        render(t, T) {
          const ctx = c.ensure();
          const dpr = c.dpr;
          if (T < start + H) return OM.handoff('spark', ctx, T, dpr);
          if (T >= END - H) return OM.handoff('spot', ctx, T, dpr);
          const P = get();
          ctx.fillStyle = ink.bg;
          ctx.fillRect(0, 0, 1920, 1080);
          const lie = OM.smooth(OM.prog(T, LIE0, LIE1));
          if (lie > 0) spot(ctx, lie);
          const wake = OM.prog(T, start + H, on[0]);
          pool(ctx, PX, PY, 72, 72, ink.lit, 0.4 * (1 - wake)); // the spark's halo, fading as the core grows
          ctx.save();
          ctx.globalAlpha = 1 - lie;
          ctx.translate(960, OM.lerp(PY, 880, lie));
          ctx.scale(OM.lerp(1, 440 / RMAX, lie), OM.lerp(1, 110 / RMAX, lie));
          ctx.translate(-PX, -PY);
          // The reader pad's corner brackets, lit when enrollment completes, blinking on the snares.
          const done = T >= DONE;
          const B = RMAX + 26, arm = 120;
          ctx.globalAlpha = (1 - lie) * OM.smooth(wake);
          ctx.fillStyle = done || OM.pulse(SNARES, T, 0.06) > 0.5 ? ink.crest : ink.mid;
          for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
            ctx.fillRect(PX + sx * B - (sx > 0 ? 8 : 0), PY + sy * B - (sy > 0 ? 8 : 0), -sx * arm, 8);
            ctx.fillRect(PX + sx * B - (sx > 0 ? 8 : 0), PY + sy * B - (sy > 0 ? 8 : 0), 8, -sy * arm);
          }
          ctx.globalAlpha = 1 - lie;
          // The print.
          const front = contact(P, T);
          const wave = done ? OM.ease.outCubic(OM.prog(T, DONE, DONE + 0.6)) * 1.15 : -1;
          for (const k of P.cells) {
            const th2 = OM.threshold(k.q + 64, k.r + 64);
            if (k.logo) {
              if (k.e > wake * 0.2) continue; // the core grows out of the spark
            } else if (k.y > front || OM.clamp((k.y - front + 40) / 40) > th2) continue; // dithered front
            const age = T - k.at;
            let fill = k.logo ? (done ? ink.crest : ink.lit) : k.e < 0.4 ? ink.lit : ink.mid;
            if (age < 0.5) fill = th2 > age / 0.5 ? ink.crest : age < 0.25 ? ink.hover : fill;
            if (wave >= 0 && Math.abs(k.e - wave) < 0.05) fill = ink.crest;
            ctx.fillStyle = fill;
            ctx.fillRect(Gp.x0 + k.q * S, Gp.y0 + k.r * S, S, S);
          }
          // The words, written along their rings, pressed in on their onsets.
          ctx.textBaseline = 'alphabetic';
          P.rings.forEach((g, k) => {
            const age = T - on[k];
            if (age < 0) return;
            const kick = 1 + 0.08 * Math.exp(-age / 0.06);
            const hit = wave >= 0 && Math.abs(g.R / RMAX - wave) < 0.08;
            ctx.fillStyle = age < 0.3 || hit ? ink.crest : ink.hover;
            ctx.font = g.font;
            const n = g.s.length;
            for (let i = 0; i < n; i++) {
              const off = ((i + 0.5 - n / 2) * g.A) / g.R;
              const ang = g.top ? -Math.PI / 2 + off : Math.PI / 2 - off;
              const rb = (g.top ? g.R - g.cap / 2 : g.R + g.cap / 2) * kick;
              ctx.save();
              ctx.translate(PX + Math.cos(ang) * rb, PY + Math.sin(ang) * rb);
              ctx.rotate(g.top ? ang + Math.PI / 2 : ang - Math.PI / 2);
              ctx.fillText(g.s[i], -g.A / 2, 0);
              ctx.restore();
            }
          });
          ctx.restore();
        },
        release: () => c.release(),
      };
    },
  });
})();
