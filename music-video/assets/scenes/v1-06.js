// v1-06 · The forge. The glow v1-05 handed over settles into the fire light
// on an anvil [line]. The words are the metal: a hammer swings down onto
// the anvil face on each onset and forges the word there, white hot and
// squashed by the blow, sparks flying off its letters as cells; the metal
// cools crest to hover to lit. The four strong kicks are extra blows that
// reheat the word under the hammer, the key word at the end is the heaviest
// strike, and on the 63.042 downbeat the whole line flares. Then the metal is
// drawn out into one bar of crest cells across the frame: the line v1-07's
// copier lamp starts from.
OM.ownWords.add('v1-06');
(() => {
  const V = OM.v1;
  const WEIGHT = 800;
  const PROBE = V.ready('v1-06-type', WEIGHT);
  const GLSL = V.TEXTMASK + `
vec4 effect(vec2 uv) {
  vec2 u = cam(uv);
  float m = smoothstep(0.26, 0.34, uv.y) * (1.0 - smoothstep(0.6, 0.9, uv.y)) * uAmount * offText(uv); // heat rising off the anvil
  vec2 n = vec2(vnoise(uv * vec2(28.0, 9.0) - vec2(0.0, uTime * 2.2)), vnoise(uv * vec2(19.0, 7.0) - vec2(3.0, uTime * 1.7))) - 0.5;
  return src(u + n * 0.007 * m);
}`;
  OM.scene({
    id: 'v1-06',
    build(el, { start, duration }) {
      const cv = document.createElement('canvas');
      cv.className = 'om-fill';
      el.appendChild(cv);
      const c = OM.canvas(cv, { alpha: false });
      const fx = V.post(el, c, GLSL);
      const END = start + duration, H = V.HOLD;
      const ink = OM.fieldInks('tokyo-night'), th = OM.theme('tokyo-night');
      const on = OM.sung('v1-06').map((w) => w.t0);
      const N = on.length;
      const HM = OM.HOME, G = { x0: HM.x0, y0: HM.y0, cw: HM.cw / 2, ch: HM.ch / 2 };
      const KICKS = [59.791, 60.325, 60.86, 61.928], FLARE = 63.042;
      const DRAW0 = 63.12, DRAW1 = 63.3, FILL1 = END - H - 0.01;
      const FACE = 770; // the anvil's top face
      const hrow = OM.cellAt(HM, 960, 540).row;
      // Strikes: one per word, plus the kicks that fall between words, which re-hit the last word.
      const strikes = on.map((t, k) => ({ t, k, p: k === N - 1 ? 2 : 1 }));
      for (const t of KICKS) {
        if (on.some((o) => Math.abs(o - t) < 0.15)) continue;
        const k = OM.hitCount(on, t) - 1;
        if (k >= 0) strikes.push({ t, k, p: 0.55 });
      }
      strikes.sort((a, b) => a.t - b.t);

      const get = V.lazy(PROBE, () => {
        const L = V.layout('v1-06', { weight: WEIGHT, cap: 112, maxW: 1740 });
        const lh = L.cap * 1.5;
        return L.words.map((wd) => {
          const base = FACE - 22 - (L.rows - 1 - wd.row) * lh;
          const cells = V.raster(wd.text, L.font, L.size, wd.x, base, G, L.A);
          return { ...wd, base, top: base - L.cap, cx: wd.x + wd.w / 2, cells, cap: L.cap };
        });
      });
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
      const heat = (k, T) => {
        let h = T >= FLARE ? 0.9 * Math.exp(-(T - FLARE) / 0.5) : 0;
        for (const s of strikes) if (s.k === k && T >= s.t) h += s.p * Math.exp(-(T - s.t) / 0.8);
        return h;
      };
      const ANVIL = (() => {
        const p = new Path2D();
        p.moveTo(119, FACE + 14);
        p.lineTo(438, FACE);
        p.lineTo(1656, FACE);
        p.lineTo(1656, FACE + 44);
        p.lineTo(1279, FACE + 70);
        p.lineTo(1192, FACE + 170);
        p.lineTo(1380, FACE + 230);
        p.lineTo(540, FACE + 230);
        p.lineTo(728, FACE + 170);
        p.lineTo(641, FACE + 70);
        p.lineTo(438, FACE + 44);
        p.closePath();
        return p;
      })();

      // Camera: a slow push, punched on every hammer strike. Embers drift up off the fire.
      const FXP = (ctx, dpr, T) => {
        const e = V.env(T, start, END);
        const words = get();
        let x0 = 1920, x1 = 0, y0 = 1080, y1 = 0;
        for (const wd of words) { x0 = Math.min(x0, wd.x); x1 = Math.max(x1, wd.x + wd.w); y0 = Math.min(y0, wd.top); y1 = Math.max(y1, wd.base); }
        let punch = 0, jolt = 0;
        for (const s of strikes) {
          const age = T - s.t;
          if (age < 0) continue;
          punch += 0.035 * s.p * Math.exp(-age / 0.09);
          jolt += 10 * s.p * Math.exp(-age / 0.07) * Math.cos(age * 60);
        }
        const world = OM.smooth(OM.prog(T, start + H, start + 0.3)) * (1 - OM.prog(T, FLARE + 0.05, DRAW1));
        if (world > 0) {
          for (let i = 0; i < 36; i++) {
            const h = OM.hash(i, 1, 66), h2 = OM.hash(i, 2, 66);
            const rise = (T * (35 + 45 * h) + h2 * 640) % 640;
            const x = 520 + OM.hash(i, 3, 66) * 880 + 22 * Math.sin(T * 1.3 + i), y = FACE - 10 - rise;
            ctx.globalAlpha = world * (1 - rise / 640) * (0.5 + 0.5 * Math.sin(T * 9 + i));
            ctx.fillStyle = h > 0.6 ? ink.hover : ink.lit;
            ctx.fillRect(x, y, 4, 4);
          }
          ctx.globalAlpha = 1;
        }
        return { amount: e, cam: { zoom: 1 + (0.012 + 0.04 * OM.smooth(OM.prog(T, start, END)) + punch) * e, y: jolt * e }, p1: V.rect(x0 - 40, y0 - 50, x1 + 40, y1 + 40) };
      };
      return {
        render(t, T) {
          this.draw(t, T);
          fx.apply(T, FXP(c.ensure(), c.dpr, T));
        },
        draw(t, T) {
          const ctx = c.ensure();
          const dpr = c.dpr;
          if (T < start + H) return OM.handoff('glow', ctx, T, dpr);
          if (T >= END - H) return OM.handoff('line', ctx, T, dpr);
          const words = get();
          const settle = OM.smooth(OM.prog(T, start + H, start + 0.3));
          const draw = OM.smooth(OM.prog(T, DRAW0, DRAW1));
          const world = settle * (1 - OM.prog(T, FLARE + 0.05, DRAW1));
          ctx.fillStyle = ink.bg;
          ctx.fillRect(0, 0, 1920, 1080);
          // The handoff glow settles into the fire light over the anvil.
          const hot = Math.max(...words.map((wd) => heat(wd.k, T)), 0);
          pool(ctx, 960, OM.lerp(540, FACE - 40, settle), OM.lerp(620, 760, settle), OM.lerp(620, 300, settle), ink.lit,
            OM.lerp(0.5, 0.16 + 0.12 * Math.min(1.5, hot), settle) * (1 - draw));
          // The anvil.
          ctx.globalAlpha = world;
          ctx.fillStyle = th.surface;
          ctx.fill(ANVIL);
          ctx.strokeStyle = th['border-strong'];
          ctx.lineWidth = 2;
          ctx.stroke(ANVIL);
          ctx.fillStyle = ink.mid;
          ctx.fillRect(438, FACE, 1218, 3);
          // Anvil ring: the face rings on the kicks in the mid-line gap, its rim shivering crest.
          const ring = OM.pulse([60.325, 60.86], T, 0.08);
          if (ring > 0.02 && T >= 60.325) {
            ctx.fillStyle = ink.crest;
            ctx.globalAlpha = world * ring;
            for (let x = 438; x < 1656; x += 24) ctx.fillRect(x, FACE - 2 + 4 * ring * Math.sin(x * 0.05 + T * 90), 24, 3 + 3 * ring);
            ctx.globalAlpha = 1;
          }
          ctx.globalAlpha = 1;
          // The words: forged on their strike, squashed by it, cooling.
          for (const wd of words) {
            if (T < on[wd.k]) continue;
            const h = heat(wd.k, T);
            pool(ctx, wd.cx, wd.base - wd.cap / 2, wd.w / 2 + 90, 120, ink.lit, Math.min(0.35, 0.22 * h) * (1 - draw));
            let sq = 0;
            for (const s of strikes) if (s.k === wd.k && T >= s.t) sq = Math.max(sq, s.p * Math.exp(-(T - s.t) / 0.07));
            const sy = 1 - 0.32 * Math.min(1, sq), sx = 1 + 0.1 * Math.min(1, sq);
            for (const [q, r] of wd.cells) {
              const v = h + (OM.threshold(q, r) - 0.5) * 0.35;
              let x = G.x0 + q * G.cw, y = G.y0 + r * G.ch;
              x = wd.cx + (x - wd.cx) * sx;
              y = wd.base + (y - wd.base) * sy;
              let w = G.cw * sx, hh = G.ch * sy;
              if (draw > 0) {
                // Drawn out: every cell runs to the centre row.
                const ty = HM.y0 + (hrow + (r & 1) * 0.5) * HM.ch;
                y = OM.lerp(y, ty, draw);
                hh = OM.lerp(hh, G.ch, draw);
              }
              ctx.fillStyle = draw > 0.5 || v > 0.8 ? ink.crest : v > 0.45 ? ink.hover : ink.lit;
              ctx.fillRect(x, y, w, hh);
            }
          }
          // The bar runs out to the frame's edges.
          if (T >= DRAW1 - 0.02) {
            const span = words.reduce((s, wd) => [Math.min(s[0], wd.x), Math.max(s[1], wd.x + wd.w)], [1920, 0]);
            const f = OM.ease.inOutCubic(OM.prog(T, DRAW1 - 0.02, FILL1));
            const a = OM.lerp(span[0], -20, f), b = OM.lerp(span[1], 1940, f);
            ctx.fillStyle = ink.crest;
            for (let col = HM.cMin; col < HM.cMin + HM.cols; col++) {
              const x = HM.x0 + (col + 0.5) * HM.cw;
              if (x >= a && x <= b) OM.cell(ctx, HM, col, hrow, dpr);
            }
          }
          // The hammer: hangs raised over the next word, drops onto it, recoils.
          if (world > 0.01) {
            let i = strikes.findIndex((s) => s.t > T);
            if (i < 0) i = strikes.length;
            const prev = strikes[i - 1], next = strikes[i];
            const target = (s) => (s ? words[s.k] : null);
            const xOf = (s) => (s ? target(s).cx : 960), yOf = (s) => (s ? target(s).top : FACE);
            let x, y, ang;
            const since = prev ? T - prev.t : 9;
            const until = next ? next.t - T : 9;
            if (until < 0.1) {
              const a = OM.ease.inCubic(1 - until / 0.1);
              x = xOf(next);
              y = OM.lerp(yOf(next) - 300, yOf(next), a);
              ang = OM.lerp(-0.45, 0, a);
            } else {
              const up = OM.ease.outCubic(OM.clamp(since / 0.28));
              const mv = next ? OM.smooth(OM.prog(T, prev ? prev.t + 0.15 : start, next.t - 0.1)) : 0;
              x = OM.lerp(xOf(prev || next), xOf(next || prev), mv);
              y = OM.lerp(yOf(prev || next), OM.lerp(yOf(prev || next), yOf(next || prev), mv) - 300, up);
              ang = OM.lerp(0, -0.45, up);
            }
            ctx.save();
            ctx.globalAlpha = world;
            ctx.translate(x, y);
            ctx.rotate(ang);
            ctx.fillStyle = th['border-strong'];
            ctx.fillRect(80, -78, 680, 26); // the handle, up and to the right
            ctx.fillStyle = th['surface-2'];
            ctx.fillRect(-95, -112, 190, 112);
            ctx.fillStyle = th['text-muted'];
            ctx.fillRect(-95, -112, 190, 6);
            ctx.fillStyle = ink.mid;
            ctx.fillRect(-95, -6, 190, 6); // lit from below by the metal
            ctx.restore();
          }
          // Sparks off the letters: cells flung up and out, falling, cooling.
          ctx.globalAlpha = world;
          for (const s of strikes) {
            const age = T - s.t;
            if (age < 0 || age > 1.1) continue;
            const wd = words[s.k];
            if (!wd.cells.length) continue;
            const n = Math.round(34 * s.p * s.p);
            for (let i = 0; i < n; i++) {
              const h1 = OM.hash(i, Math.round(s.t * 1000), 61), h2 = OM.hash(i, Math.round(s.t * 1000), 62), h3 = OM.hash(i, Math.round(s.t * 1000), 63);
              const life = 0.4 + 0.6 * h3;
              if (age > life) continue;
              const [q, r] = wd.cells[Math.floor(h1 * wd.cells.length)];
              const a = -Math.PI / 2 + (h2 - 0.5) * 2.6, v = (380 + 700 * h3) * (0.8 + 0.3 * s.p);
              const x = G.x0 + q * G.cw + Math.cos(a) * v * age, y = G.y0 + r * G.ch + Math.sin(a) * v * age + 900 * age * age;
              const f = age / life;
              ctx.fillStyle = f < 0.25 ? ink.crest : f < 0.55 ? ink.hover : f < 0.8 ? ink.lit : ink.mid;
              ctx.fillRect(x, y, 6, 6);
            }
          }
          ctx.globalAlpha = 1;
        },
        release: () => {
          fx.release();
          c.release();
        },
      };
    },
  });
})();
