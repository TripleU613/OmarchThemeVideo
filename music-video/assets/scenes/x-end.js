// x-end · The last pixel bursts into the portrait. From o-01's cut frame (the
// whole home drained into one lit pixel) the pixel charges on the hi-hat roll,
// flickering faster as sparks keep spiralling into it. The snare cracks it open
// and the kick blows it apart: the owner's dot-matrix portrait of DHH, arms
// folded, the Omarchy mark on his shirt, flies out of it tile by tile on spiral
// paths that unwind the vortex the other way, the face landing first, every
// tile cooling from crest into its own shade as it settles. By 297.7 the whole
// portrait has formed, and it holds, steady, to the end.
(() => {
  // The owner's portrait: 220 x 346 dots, nibble-packed 4-bit shades (0 = no dot), used as given.
  const COLS = 220, ROWS = 346;
  const ENCODED = '';
  // Its own geometry and ordered dither, kept from the file: 4 x 3.08 px pitch, 2.65 x 2.25 px dots, centred.
  const PIX_X = 4.0, PIX_Y = 3.08, DOT_W = 2.65, DOT_H = 2.25;
  const OX = Math.round((1920 - COLS * PIX_X) / 2), OY = Math.round((1080 - ROWS * PIX_Y) / 2);
  const BAYER = [0, 48, 12, 60, 3, 51, 15, 63, 32, 16, 44, 28, 35, 19, 47, 31, 8, 56, 4, 52, 11, 59, 7, 55, 40, 24, 36, 20, 43, 27, 39, 23, 2, 50, 14, 62, 1, 49, 13, 61, 34, 18, 46, 30, 33, 17, 45, 29, 10, 58, 6, 54, 9, 57, 5, 53, 42, 26, 38, 22, 41, 25, 37, 21];
  const decode = () => {
    const raw = atob(ENCODED);
    const shades = new Uint8Array(COLS * ROWS);
    for (let i = 0, j = 0; i < raw.length && j < shades.length; i++) {
      const n = raw.charCodeAt(i);
      shades[j++] = n >> 4;
      if (j < shades.length) shades[j++] = n & 15;
    }
    return shades;
  };
  /** Whether the dot at (col, row) is drawn: the file's density against its own permuted 8x8 threshold. */
  const dotOn = (shade, col, row) => {
    if (!shade) return false;
    const s = (shade - 1) / 14;
    const th = (BAYER[(row & 7) * 8 + ((col + Math.floor(row / 64)) & 7)] + 0.5) / 64;
    return 0.14 + 0.86 * Math.pow(s, 0.8) > th;
  };
  const TC = 4, TR = 4; // a tile: two 2x4 glyph clusters side by side
  const CX = 960, CY = 540;
  const FACE = { x: OX + 112 * PIX_X, y: OY + 95 * PIX_Y }; // where the face sits: it lands first
  const SNARE = 295.079, KICK = 295.381, FORMED = 297.7;

  // Phosphor: lit dots bloom green while they fly (uP0.y bloom), and once the portrait rests a
  // very faint flicker runs through its dots (uP0.x shimmer). Off, it is the raw frame.
  const FX = `
vec4 effect(vec2 uv) {
  vec2 p = cam(uv);
  vec3 c = src(p).rgb;
  if (uAmount <= 0.0) return vec4(c, 1.0);
  vec2 px = 1.0 / uRes * (uRes.x / 1920.0);
  vec3 b = vec3(0.0);
  if (uP0.y > 0.0) {
    for (int i = 0; i < 12; i++) {
      float a = float(i) * 0.5236 + 0.26;
      vec2 o = vec2(cos(a), sin(a));
      for (int j = 1; j <= 3; j++) {
        vec3 s = src(p + o * px * float(j) * 6.0).rgb;
        b += s * smoothstep(0.3, 0.8, dot(s, vec3(0.3, 0.55, 0.15))) / float(j);
      }
    }
    b /= 22.0;
  }
  vec2 dp = (p * uRes) / (uRes.x / 1920.0);
  float n = vnoise(vec2(dp.x / 16.0, dp.y / 12.3) + vec2(0.0, uTime * 5.0)) - 0.5;
  float roll = exp(-pow((uv.y - fract(1.0 - uTime * 0.31)) / 0.035, 2.0));
  vec3 green = vec3(0.62, 0.81, 0.42);
  c = c * (1.0 + uAmount * uP0.x * (0.16 * n + 0.07 * roll)) + uAmount * uP0.y * b * green * 1.3;
  return vec4(c, 1.0);
}`;

  OM.scene({
    id: 'x-end',
    build(el, { start, duration }) {
      const cv = document.createElement('canvas');
      cv.className = 'om-fill';
      el.appendChild(cv);
      const c = OM.canvas(cv, { alpha: false });
      const fx = OM.post(el, c, { effect: FX });
      const ink = OM.fieldInks('tokyo-night');
      const end = start + duration;
      const HOLD0 = start + 0.07;
      const SHADE = Array.from({ length: 16 }, (_, k) => {
        const s = k / 15;
        const stops = [[0, ink.dim], [0.22, ink.mid], [0.5, ink.lit], [0.78, ink.hover], [1, ink.crest]];
        let i = 0;
        while (i < stops.length - 2 && s > stops[i + 1][0]) i++;
        return OM.mix(stops[i][1], stops[i + 1][1], OM.prog(s, stops[i][0], stops[i + 1][0]));
      });

      // ---- the portrait, prepainted once per device scale: its dots, a crest-hot copy, a soft halo ----
      let PRE = null;
      const prepaint = (dpr) => {
        if (PRE && PRE.dpr === dpr) return PRE;
        const data = decode();
        const W = Math.round(COLS * PIX_X * dpr), H = Math.round((OY + ROWS * PIX_Y) * dpr) - Math.round(OY * dpr);
        const mk = () => {
          const k = document.createElement('canvas');
          k.width = W;
          k.height = H;
          return k;
        };
        const dots = mk(), hot = mk(), halo = mk();
        const g = dots.getContext('2d'), gh = hot.getContext('2d');
        gh.fillStyle = ink.crest;
        const oy = Math.round(OY * dpr);
        const yAt = (row) => Math.round((OY + row * PIX_Y) * dpr) - oy;
        const dw = Math.max(1, Math.round(DOT_W * dpr)), dh = Math.max(1, Math.round(DOT_H * dpr));
        const used = new Uint8Array(Math.ceil(COLS / TC) * Math.ceil(ROWS / TR));
        for (let row = 0; row < ROWS; row++)
          for (let col = 0; col < COLS; col++) {
            const sh = data[row * COLS + col];
            if (!dotOn(sh, col, row)) continue;
            const x = Math.round(col * PIX_X * dpr), y = yAt(row);
            g.fillStyle = SHADE[sh];
            g.fillRect(x, y, dw, dh);
            gh.fillRect(x, y, dw, dh);
            used[Math.floor(row / TR) * Math.ceil(COLS / TC) + Math.floor(col / TC)] = 1;
          }
        const gl = halo.getContext('2d');
        gl.filter = `blur(${5 * dpr}px)`;
        gl.globalAlpha = 0.32;
        gl.drawImage(dots, 0, 0);
        // The tiles: device-pixel source rects, each flight seeded and timed.
        const tiles = [];
        const nx = Math.ceil(COLS / TC), ny = Math.ceil(ROWS / TR);
        const ox = Math.round(OX * dpr);
        const ds = [];
        for (let ty = 0; ty < ny; ty++)
          for (let tx = 0; tx < nx; tx++) {
            if (!used[ty * nx + tx]) continue;
            const sx = Math.round(tx * TC * PIX_X * dpr), sx2 = Math.round(Math.min(COLS, (tx + 1) * TC) * PIX_X * dpr);
            const sy = yAt(ty * TR), sy2 = ty + 1 < ny ? yAt((ty + 1) * TR) : H;
            const hx = (ox + (sx + sx2) / 2) / dpr, hy = (oy + (sy + sy2) / 2) / dpr;
            ds.push(Math.hypot(hx - FACE.x, (hy - FACE.y) * 0.85));
            tiles.push({ sx, sy, sw: sx2 - sx, sh: sy2 - sy, hx, hy, i: tiles.length });
          }
        // Landing order: nearest the face first, with a seeded shuffle so the image resolves as a cloud, not a ring.
        const rank = ds.map((d, i) => [d, i]).sort((a, b) => a[0] - b[0]);
        rank.forEach(([, i], k) => {
          const t = tiles[i], h = OM.hash(i, 1, 613), h2 = OM.hash(i, 2, 613);
          const order = OM.clamp(0.62 * (k / rank.length) + 0.38 * h);
          t.s = order < 0.33 ? SNARE + 0.03 * h2 : KICK + 0.035 * h2; // the inner cloud cracks out on the snare, the rest on the kick
          t.e = 295.85 + (FORMED - 0.05 - 295.85) * order;
          t.r = Math.hypot(t.hx - CX, t.hy - CY);
          t.th = Math.atan2(t.hy - CY, t.hx - CX);
          t.turn = 2.4 + 1.8 * h2; // radians of unwinding on the way out
          t.cool = 0.22 + 0.4 * OM.hash(i, 3, 613);
        });
        PRE = { dpr, dots, hot, halo, tiles, ox, oy, W, H };
        return PRE;
      };

      // ---- the charge: the pixel flickers ever faster, sparks still spiralling into it ----
      const charge = (ctx, T, dpr) => {
        OM.finale.pixel(ctx, dpr);
        if (T < HOLD0) return;
        const p = OM.prog(T, HOLD0, SNARE);
        const tau = T - HOLD0, rate = (30 - 5) / (SNARE - HOLD0);
        const phase = 5 * tau + 0.5 * rate * tau * tau;
        const f = OM.hash(Math.floor(phase), 0, 517);
        const lvl = f > 0.82 ? 2 : f > 0.3 ? 1 : 0;
        // Sparks: the vortex's last debris, still turning clockwise as it falls in.
        const n = Math.round(6 + 34 * p);
        for (let i = 0; i < n; i++) {
          const h1 = OM.hash(i, 1, 523), h2 = OM.hash(i, 2, 523), h3 = OM.hash(i, 3, 523);
          const per = 0.45 + 0.5 * h2;
          const a = (T - HOLD0 + h3 * per) / per;
          const u = a - Math.floor(a);
          if (T - HOLD0 < (1 - h3) * per * 0.2) continue;
          const r = (60 + 260 * h1) * Math.pow(1 - u, 2.2);
          const th = h1 * 6.283 + Math.floor(a) * 2.1 + OM.finale.SPIN * 4 * u * u;
          ctx.fillStyle = u > 0.8 ? ink.crest : h2 > 0.5 ? ink.lit : ink.mid;
          const s = (h2 > 0.8 ? 2 : 1) * (u > 0.7 ? 1 : 1.5);
          ctx.fillRect(Math.round((CX + r * Math.cos(th)) * dpr) / dpr, Math.round((CY + r * Math.sin(th)) * dpr) / dpr, s, s);
        }
        // The core: a halo that swells with the charge, the pixel growing and flickering through the inks.
        const glow = (0.3 + 0.5 * p) * (lvl === 0 ? 0.35 : lvl === 2 ? 1.25 : 1);
        const rad = 16 + 120 * p * p;
        const [r0, g0, b0] = OM.rgb(ink.lit);
        const gr = ctx.createRadialGradient(CX, CY, 0, CX, CY, rad);
        gr.addColorStop(0, `rgba(${r0},${g0},${b0},${Math.min(0.85, glow)})`);
        gr.addColorStop(1, `rgba(${r0},${g0},${b0},0)`);
        ctx.fillStyle = gr;
        ctx.fillRect(CX - rad, CY - rad, 2 * rad, 2 * rad);
        const sz = Math.round((1 + 5 * Math.pow(p, 1.5)) * dpr) / dpr;
        ctx.fillStyle = lvl === 2 ? ink.crest : lvl === 1 ? ink.hover : ink.lit;
        const x = Math.round((CX - sz / 2) * dpr) / dpr, y = Math.round((CY - sz / 2) * dpr) / dpr;
        ctx.fillRect(x, y, sz, sz);
      };

      // ---- the burst: tiles fly out of the core on unwinding spirals and land in place ----
      const burst = (ctx, T, dpr) => {
        const P = prepaint(dpr);
        ctx.fillStyle = ink.bg;
        ctx.fillRect(0, 0, 1920, 1080);
        const formed = OM.smooth(OM.prog(T, 296.4, FORMED));
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.imageSmoothingEnabled = false;
        if (formed > 0) {
          ctx.globalAlpha = formed;
          ctx.drawImage(P.halo, P.ox, P.oy);
          ctx.globalAlpha = 1;
        }
        if (T >= FORMED) {
          ctx.drawImage(P.dots, P.ox, P.oy);
        } else {
          const cx = CX * dpr, cy = CY * dpr;
          for (const t of P.tiles) {
            if (T < t.s) continue;
            const u = OM.prog(T, t.s, t.e);
            const src = u < t.cool ? P.hot : P.dots;
            if (u >= 1) {
              ctx.drawImage(src, t.sx, t.sy, t.sw, t.sh, P.ox + t.sx, P.oy + t.sy, t.sw, t.sh);
              continue;
            }
            const q = 1 - Math.pow(1 - u, 3.2);
            const r = t.r * q * (1 + 0.1 * Math.sin(Math.PI * q)) * dpr;
            const th = t.th + OM.finale.SPIN * t.turn * Math.pow(1 - q, 1.3);
            const sc = 0.3 + 0.7 * q;
            const w = t.sw * sc, h = t.sh * sc;
            ctx.drawImage(src, t.sx, t.sy, t.sw, t.sh, Math.round(cx + r * Math.cos(th) - w / 2), Math.round(cy + r * Math.sin(th) - h / 2), Math.max(1, Math.round(w)), Math.max(1, Math.round(h)));
          }
        }
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        // What is left of the core after the crack: a crest knot that the kick blows out.
        if (T < KICK + 0.35) {
          const a = T < KICK ? 1 : Math.exp(-(T - KICK) / 0.08);
          const rad = (T < KICK ? 90 + 40 * Math.exp(-(T - SNARE) / 0.05) : 90 + 260 * (T - KICK));
          const [r0, g0, b0] = OM.rgb(ink.hover);
          const gr = ctx.createRadialGradient(CX, CY, 0, CX, CY, rad);
          gr.addColorStop(0, `rgba(${r0},${g0},${b0},${0.75 * a})`);
          gr.addColorStop(1, `rgba(${r0},${g0},${b0},0)`);
          ctx.fillStyle = gr;
          ctx.fillRect(CX - rad, CY - rad, 2 * rad, 2 * rad);
          const sz = Math.round((T < KICK ? 6 + 6 * Math.exp(-(T - SNARE) / 0.06) : 6 * a) * dpr) / dpr;
          if (sz > 0) {
            ctx.fillStyle = ink.crest;
            ctx.fillRect(Math.round((CX - sz / 2) * dpr) / dpr, Math.round((CY - sz / 2) * dpr) / dpr, sz, sz);
          }
        }
      };

      return {
        render(t, T) {
          const ctx = c.ensure();
          const dpr = c.dpr;
          ctx.globalAlpha = 1;
          if (T < SNARE) charge(ctx, T, dpr);
          else burst(ctx, T, dpr);
          // Camera: a slow push on the charging pixel, a punch on the snare, then the kick throws it back
          // with a counter-roll that unwinds to rest as the portrait forms. Held still from 297.9.
          let z = 1, rot = 0;
          if (T < SNARE) z = 1 + 0.08 * OM.ease.inCubic(OM.prog(T, HOLD0, SNARE));
          else if (T < KICK) z = 1.08 + 0.025 * (1 - Math.exp(-(T - SNARE) / 0.04));
          else {
            const zk = 1.08 + 0.025 * (1 - Math.exp(-(KICK - SNARE) / 0.04));
            const e = 1 - OM.ease.outCubic(OM.prog(T, KICK, 297.9));
            z = 1 + (zk - 1) * e;
            rot = -OM.finale.SPIN * 0.04 * e;
          }
          // Effect: bloom from the late charge through the flight, then only the faint shimmer, still by 299.7.
          const bloom = T < SNARE ? 0.6 * OM.smooth(OM.prog(T, 294.3, SNARE)) : 1 - 0.85 * OM.smooth(OM.prog(T, KICK, FORMED)) - 0.15 * OM.smooth(OM.prog(T, FORMED, 298.4));
          const shim = OM.smooth(OM.prog(T, 297.0, 297.9)) * 0.35 * (1 - OM.smooth(OM.prog(T, 299.2, 299.7)));
          const cut = T < HOLD0 || T >= end - 0.07;
          fx.apply(T, {
            amount: !cut && (bloom > 0 || shim > 0) ? 1 : 0,
            cam: cut ? null : { zoom: z, rot },
            p0: [shim, Math.max(0, bloom), 0, 0],
          });
        },
        release: () => {
          fx.release();
          c.release();
          PRE = null;
        },
      };
    },
  });
})();
