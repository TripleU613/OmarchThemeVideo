// v1-02 · Puppet strings. The phone v1-01 left us on turns out to hang from
// strings, and so does everything on it. Each word is a glossy UI chip that
// drops in on its strings on its onset and jerks to a stop, swinging; on each
// one the camera tilts a step up the strings. After the line has read, the
// tilt runs all the way up (perc fill into the 45.836 downbeat) to the hand on
// the control bar that owns them; on the downbeat it yanks every string, then
// lifts out of frame and leaves the white page for v1-03.
OM.ownWords.add('v1-02');
(() => {
  const V = OM.v1;
  const WEIGHT = 800;
  const PROBE = V.ready('v1-02-type', WEIGHT);
  const GLSL = V.TEXTMASK + `
vec4 effect(vec2 uv) {
  float top = smoothstep(0.55, 1.0, uv.y) * uAmount * offText(uv); // the strings sway most near the top
  vec2 u = cam(uv);
  u.x += (sin(uv.y * 9.0 + uTime * 1.7) * 0.006 + sin(uv.y * 23.0 - uTime * 2.3) * 0.002) * top;
  return src(u);
}`;
  OM.scene({
    id: 'v1-02',
    build(el, { start, duration }) {
      const cv = document.createElement('canvas');
      cv.className = 'om-fill';
      el.appendChild(cv);
      const c = OM.canvas(cv, { alpha: false });
      const fx = V.post(el, c, GLSL);
      const END = start + duration, H = V.HOLD, H0 = 0.045; // the first word lands 0.06s in
      const W = OM.theme('white'), WI = OM.fieldInks('white');
      const on = OM.sung('v1-02').map((w) => w.t0);
      const N = on.length;
      const PH = V.PHONE;
      const TILT0 = 45.25, YANK = 45.836, GONE = END - H - 0.02;
      const BAR = -720; // the control bar's height in world px (the phone's centre is 540)
      const ROW0 = 150; // the chips' rows are centred here

      const lay = V.lazy(PROBE, () => {
        const L = V.layout('v1-02', { weight: WEIGHT, cap: 66, maxW: 1500 });
        const lh = L.cap + 76;
        return {
          ...L,
          chips: L.words.map((wd) => ({ ...wd, y: ROW0 + (wd.row - (L.rows - 1) / 2) * lh, h: L.cap + 52, px: 26 })),
        };
      });
      // The camera: one eased step up per word, the big tilt to the hand, then out past it.
      const camY = (T) => {
        let y = 0;
        on.forEach((t0, k) => (y += k ? 55 * OM.ease.outExpo(OM.prog(T, t0 - 0.06, t0 + 0.45)) : 170 * OM.ease.inOutCubic(OM.prog(T, start, t0 + 0.55)))); // eased off the cut
        y += 1000 * OM.ease.inOutCubic(OM.prog(T, TILT0, YANK));
        y += 1500 * OM.ease.inOutCubic(OM.prog(T, YANK + 0.1, 46.15)); // settled on white well before the cut
        return y;
      };
      // A chip's drop: falls from out of frame to arrive on its onset, then jerks on the string.
      const drop = (T, t0) => {
        if (T < t0 - 0.12) return null;
        if (T < t0) return { dy: -900 * OM.ease.inCubic(1 - OM.prog(T, t0 - 0.12, t0)), rot: 0 };
        const a = T - t0;
        const j = Math.exp(-a / 0.2);
        return { dy: 34 * j * Math.cos((a / 0.19) * Math.PI * 2) - 4 * j, rot: 0.05 * Math.exp(-a / 0.5) * Math.sin(a * 9 + t0) };
      };
      const yank = (T) => (T < YANK ? 0 : 1) * Math.exp(-(T - YANK) / 0.12) * 40;
      // String pluck: on the 45.53 kick in the pause every string twangs, bowing and settling.
      const PLUCK = 45.53;
      let pluck = 0;
      const string = (ctx, x0, y0, x1, y1) => {
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.quadraticCurveTo((x0 + x1) / 2 + pluck, (y0 + y1) / 2, x1, y1);
        ctx.stroke();
      };
      const barX = (x) => 960 + (x - 960) * 0.42;

      // Camera: a small nod down as each chip lands on its strings, at 1.03; dust falling through the light.
      const FXP = (ctx, dpr, T) => {
        const e = V.env(T, start, END);
        const L = lay(), cy = camY(T);
        let x0 = 1920, x1 = 0, y0 = 1080, y1 = 0;
        for (const ch of L.chips) { x0 = Math.min(x0, ch.x - ch.px); x1 = Math.max(x1, ch.x + ch.w + ch.px); y0 = Math.min(y0, ch.y + cy - ch.h / 2 - 40); y1 = Math.max(y1, ch.y + cy + ch.h / 2 + 40); }
        let nod = 0;
        for (const t0 of on) if (T >= t0) nod += 12 * Math.exp(-(T - t0) / 0.12) * Math.sin(Math.min(Math.PI, ((T - t0) / 0.1) * Math.PI));
        if (e > 0) {
          ctx.fillStyle = WI.dim;
          for (let i = 0; i < 70; i++) {
            const h = OM.hash(i, 1, 21), s = 2 + 2 * OM.hash(i, 2, 21);
            const y = ((OM.hash(i, 3, 21) * 1080 + T * (30 + 50 * h)) % 1100) - 10, x = OM.hash(i, 4, 21) * 1920 + 14 * Math.sin(T * 0.8 + i);
            ctx.globalAlpha = 0.7 * e;
            ctx.fillRect(x, y, s, s);
          }
          ctx.globalAlpha = 1;
        }
        return { amount: e, cam: { zoom: 1 + 0.03 * e, y: nod * e }, p1: V.rect(x0 - 30, y0, x1 + 30, y1) };
      };
      return {
        render(t, T) {
          this.draw(t, T);
          fx.apply(T, FXP(c.ensure(), c.dpr, T));
        },
        draw(t, T) {
          const ctx = c.ensure();
          const dpr = c.dpr;
          if (T < start + H0) return V.phoneFrame(ctx);
          if (T >= END - H) return OM.handoff('white', ctx, T, dpr);
          pluck = T >= PLUCK ? 26 * Math.exp(-(T - PLUCK) / 0.18) * Math.sin((T - PLUCK) * 38) : 0;
          const L = lay();
          const cy = camY(T), Y = (y) => y + cy;
          const yk = yank(T);
          ctx.fillStyle = W.bg;
          ctx.fillRect(0, 0, 1920, 1080);
          const strings = OM.prog(T, start + H0, start + 0.3);
          ctx.strokeStyle = WI.mid;
          ctx.lineWidth = 1.5;
          // The phone hangs too, and its icons jerk with every word.
          const sx = 960 - PH.w / 2, sy = Y(540 - PH.h / 2) - yk;
          ctx.globalAlpha = strings;
          for (const dx of [-1, 1]) string(ctx, 960 + dx * (PH.w / 2 + 10), sy - PH.bez, barX(960 + dx * 700), Y(BAR) - yk);
          ctx.globalAlpha = 1;
          V.phoneBody(ctx, 960, sy + PH.h / 2);
          const icons = V.ICONS.map((ic, i) => {
            let dy = 0;
            for (const t0 of on) if (T >= t0) dy += 7 * Math.exp(-(T - t0) / 0.15) * Math.sin((T - t0) * 40 + i);
            return { ...ic, dy };
          });
          V.appGrid(ctx, sx, sy, 1, icons);
          // The chips.
          ctx.font = L.font;
          ctx.textBaseline = 'alphabetic';
          for (const ch of L.chips) {
            const d = drop(T, on[ch.k]);
            if (!d) continue;
            const w = ch.w + 2 * ch.px, h = ch.h;
            const x = ch.x - ch.px, y = Y(ch.y) + d.dy - yk * 1.6;
            ctx.globalAlpha = strings;
            for (const dx of [0.18, 0.82]) string(ctx, x + w * dx, y - h / 2, barX(x + w * dx), Y(BAR) - yk);
            ctx.globalAlpha = 1;
            ctx.save();
            ctx.translate(x + w / 2, y - h / 2);
            ctx.rotate(d.rot);
            ctx.translate(-(x + w / 2), -(y - h / 2));
            ctx.fillStyle = W['border-subtle'];
            ctx.beginPath();
            ctx.roundRect(x + 5, y - h / 2 + 9, w, h, 22);
            ctx.fill();
            ctx.fillStyle = W.surface;
            ctx.strokeStyle = W['border-strong'];
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.roundRect(x, y - h / 2, w, h, 22);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = WI.dim;
            ctx.fillRect(x + w * 0.18 - 5, y - h / 2 - 1, 10, 6);
            ctx.fillRect(x + w * 0.82 - 5, y - h / 2 - 1, 10, 6);
            ctx.fillStyle = W.text;
            ctx.fillText(ch.text, ch.x, y + L.cap / 2);
            ctx.restore();
            ctx.strokeStyle = WI.mid;
            ctx.lineWidth = 1.5;
          }
          // The control bar and the hand that holds it.
          const by = Y(BAR) - yk;
          if (by > -400) {
            const tip = Math.sin(OM.clamp((T - YANK) / 0.3) * Math.PI) * 0.06;
            ctx.save();
            ctx.translate(960, by);
            ctx.rotate(tip);
            ctx.fillStyle = WI.lit;
            ctx.fillRect(-680, -14, 1360, 28);
            ctx.fillRect(-14, -230, 28, 300);
            ctx.fillStyle = W.text;
            // A blocky hand gripping the bar from above: palm, four curled fingers, thumb.
            ctx.beginPath();
            ctx.roundRect(-110, -250, 220, 190, 34);
            ctx.fill();
            for (let f = 0; f < 4; f++) {
              ctx.beginPath();
              ctx.roundRect(-104 + f * 54, -80, 46, 112, 20);
              ctx.fill();
            }
            ctx.beginPath();
            ctx.roundRect(96, -190, 54, 120, 24);
            ctx.fill();
            ctx.fillRect(-90, -520, 180, 280); // the wrist, up out of frame
            ctx.restore();
          }
        },
        release: () => {
          fx.release();
          c.release();
        },
      };
    },
  });
})();
