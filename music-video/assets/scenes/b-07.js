// b-07 · One desk, a lifetime. The lamp's spot falls on a desk, and the same
// desk lives three lives: a kid beside a deep-bezelled box screen, a teen with
// a notebook, an adult at a wide monitor. The line is typed onto that screen as
// it is sung, each word slamming in on its onset; on the onsets where life
// moves on, the machine and the person change in one cut and the words carry
// over, reflowed onto the bigger glass, so the whole line reads on the last
// screen. The cursor beats with the kick train. On the snare the screen powers
// off into one bright point, which settles at the centre as the spark.
OM.ownWords.add('b-07');
// The b-07 -> b-08 cut, shared by both scenes: the desk's plank broken into a
// row of standing dominoes along its own lattice row, the first one lit by the
// screen's last point of light, which lands on it on the 221.89 kick.
(() => {
  const B = OM.bridge, L = OM.HOME;
  const r0 = Math.floor((800 - L.y0) / L.ch), r1 = Math.floor((821 - L.y0) / L.ch), rF = Math.floor((999 - L.y0) / L.ch);
  const c0 = OM.cellAt(L, 160, 811).col, c1 = OM.cellAt(L, 1759, 811).col;
  const legs = [OM.cellAt(L, 211, 900).col, OM.cellAt(L, 1709, 900).col];
  // The desk drawn in standing dominoes: its plank rows, and its two legs down to the floor.
  const cells = [];
  for (let row = r0; row <= r1; row++) for (let col = c0; col <= c1; col++) cells.push({ col, row, leg: false });
  for (const col of legs) for (let row = r1 + 1; row <= rF; row++) cells.push({ col, row, leg: true });
  B.DROW = { row: r1, r0, r1, c0, c1, legs, cells };
  B.DOMINO_CUT = 221.9;
  B.STAND_W = 0.35;
  B.dominoCut = (ctx) => {
    const ink = OM.fieldInks('tokyo-night');
    ctx.fillStyle = ink.bg;
    ctx.fillRect(0, 0, 1920, 1080);
    for (const q of cells) {
      ctx.fillStyle = q.col === c0 && q.row === r1 ? ink.crest : ink.mid;
      ctx.fillRect(L.x0 + q.col * L.cw, L.y0 + q.row * L.ch, L.cw * B.STAND_W, L.ch);
    }
  };
})();
OM.scene({
  id: 'b-07',
  build(el, { start, duration }) {
    const B = OM.bridge;
    const cv = document.createElement('canvas');
    cv.className = 'om-fill';
    el.appendChild(cv);
    const c = OM.canvas(cv, { alpha: false });
    const fx = OM.post(el, c, { effect: `vec4 effect(vec2 uv) {
  vec2 q = cam(uv);
  vec4 base = src(q);
  vec4 R = uP0;
  vec2 lc = (q - R.xy) / (R.zw - R.xy);
  vec4 col = base;
  if (lc.x > 0.0 && lc.x < 1.0 && lc.y > 0.0 && lc.y < 1.0) {
    vec2 c = lc - 0.5;
    vec2 l2 = 0.5 + c * (1.0 - uP1.x * 0.16 * dot(c, c));
    vec4 s = src(R.xy + l2 * (R.zw - R.xy));
    float rows = (R.w - R.y) * 1080.0 / 3.0;
    float scan = 1.0 - uP1.x * 0.16 * (0.5 + 0.5 * sin(lc.y * rows * 6.2832));
    float vig = 1.0 - uP1.x * 0.35 * pow(length(c) * 1.4, 3.0);
    vec3 sc = s.rgb * scan * vig;
    sc += vec3(0.75, 0.79, 0.96) * uP1.y * 0.05 * clamp(1.0 - abs(lc.x + lc.y - 1.2) * 3.0, 0.0, 1.0);
    col = vec4(sc, 1.0);
  }
  return mix(base, col, uAmount);
}` });
    const END = start + duration;
    const ink = OM.fieldInks('tokyo-night');
    const th = OM.theme('tokyo-night');
    const sung = OM.sung('b-07');
    const on = sung.map((w) => B.land(w.t0, start));
    const n = on.length;
    // Life stages: where each begins (word index), the glass, its bezel and the person's height.
    const STAGES = [
      { from: 0, w: 960, bez: 30, tall: 250, stand: 14 },
      { from: Math.min(3, n - 1), w: 1240, bez: 12, tall: 380, stand: 6 },
      { from: Math.min(5, n - 1), w: 1500, bez: 10, tall: 470, stand: 56 },
    ];
    const KICKS = [218.686, 218.802, 219.057, 219.336, 219.591, 219.87, 220.125, 220.381, 220.822, 220.938, 221.077];
    const OFF = 221.17, DESK = 800, LANDD = 221.89;
    const LH = OM.HOME;
    /** The screen's last point of light: on the glass until it has collapsed, then arcing down onto the first domino. */
    const pointAt = (T, S) => {
      const u = OM.prog(T, OFF + 0.35, LANDD);
      const xA = LH.x0 + (B.DROW.c0 + B.STAND_W / 2) * LH.cw, yA = LH.y0 + (B.DROW.row + 0.5) * LH.ch;
      return { x: OM.lerp(960, xA, OM.smooth(u)), y: OM.lerp(S.cy, yA, OM.ease.inCubic(u)) - 160 * Math.sin(Math.PI * u) };
    };

    const lay = B.lazy(() =>
      STAGES.map((s, i) => {
        const last = i + 1 < STAGES.length ? STAGES[i + 1].from - 1 : n - 1;
        const set = B.set(sung.slice(0, last + 1), { weight: 700, cap: 84, minCap: 66, maxW: s.w - 2 * s.bez - 60, cx: 960, cy: 0, lead: 1.55, maxRows: 4 });
        const h = Math.max(300, set.rows.length * set.lineH + 110);
        const y = DESK - s.stand - h;
        return { ...s, set, h, x: 960 - s.w / 2, y, cy: y + h / 2 };
      }), 700);
    const stageAt = (T) => {
      let i = 0;
      STAGES.forEach((s, k) => { if (T >= on[s.from] && k > 0 && s.from > STAGES[k - 1].from) i = k; });
      return i;
    };
    const spot = (ctx, a, ret = 0) => {
      // ret 0..1: the lamp's beam retracts up into the lamp, its pool drawn in after it.
      if (ret >= 1) return;
      const yb = 880 * (1 - ret);
      ctx.globalAlpha = a;
      const g = ctx.createLinearGradient(0, 0, 0, 880);
      g.addColorStop(0, B.rgba(ink.lit, 0.1));
      g.addColorStop(1, B.rgba(ink.lit, 0.03));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(900, 0); ctx.lineTo(1020, 0); ctx.lineTo(OM.lerp(1020, 1400, yb / 880), yb); ctx.lineTo(OM.lerp(900, 520, yb / 880), yb);
      ctx.closePath();
      ctx.fill();
      ctx.save();
      ctx.translate(960, OM.lerp(880, 0, ret));
      ctx.scale(1 - ret, 0.25 * (1 - ret));
      const p = ctx.createRadialGradient(0, 0, 0, 0, 0, 440);
      p.addColorStop(0, B.rgba(ink.lit, 0.42));
      p.addColorStop(1, B.rgba(ink.lit, 0));
      ctx.fillStyle = p;
      ctx.fillRect(-440, -440, 880, 880);
      ctx.restore();
      ctx.globalAlpha = 1;
    };
    /** A person seen side-on, standing at the desk's end: square head, shoulders, body. */
    const person = (ctx, x, tall, flash) => {
      const head = tall * 0.17, body = tall * 0.45, legs = tall - head - body - 8;
      const top = 1000 - tall;
      ctx.fillStyle = OM.mix(th['surface-2'], ink.crest, flash * 0.4);
      ctx.fillRect(x - head / 2, top, head, head);
      ctx.fillRect(x - tall * 0.11, top + head + 8, tall * 0.22, body);
      ctx.fillRect(x - tall * 0.09, top + head + 8 + body, tall * 0.07, legs);
      ctx.fillRect(x + tall * 0.02, top + head + 8 + body, tall * 0.07, legs);
      // The screen's light on the face side.
      ctx.fillStyle = B.rgba(ink.lit, 0.55);
      ctx.fillRect(x - head / 2, top, 3, head);
      ctx.fillRect(x - tall * 0.11, top + head + 8, 3, body);
      // An arm reaching for the keys.
      ctx.fillStyle = OM.mix(th['surface-2'], ink.crest, flash * 0.4);
      ctx.fillRect(x - tall * 0.11 - tall * 0.1, top + head + 8 + body * 0.35, tall * 0.1, tall * 0.05);
    };

    return {
      draw(t, T) {
        const ctx = c.ensure();
        const dpr = c.dpr;
        if (T < start + 0.05) return OM.handoff('spot', ctx, T, dpr);
        if (T >= B.DOMINO_CUT) return B.dominoCut(ctx);
        ctx.fillStyle = ink.bg;
        ctx.fillRect(0, 0, 1920, 1080);
        const stages = lay();
        const si = stageAt(T);
        const S = stages[si];
        const off = OM.prog(T, OFF, OFF + 0.35);
        const room = 1;
        // After the power-off, everything goes somewhere: the beam retracts, the person walks off,
        // the monitor folds into its stand and the stand into the desk, the legs fold up, the plank breaks into dominoes.
        spot(ctx, 1, OM.ease.inCubic(OM.prog(T, OFF + 0.03, OFF + 0.4)));
        const fBez = OM.ease.inCubic(OM.prog(T, OFF + 0.35, OFF + 0.48)), fStand = OM.ease.inCubic(OM.prog(T, OFF + 0.44, OFF + 0.54));
        const fLegs = 0, plank = OM.ease.inOutCubic(OM.prog(T, 221.62, 221.86));
        const walk = 520 * OM.ease.inCubic(OM.prog(T, OFF + 0.03, OFF + 0.45));
        const cut = OM.pulse([on[STAGES[1].from], on[STAGES[2].from]], T, 0.1) * (si > 0 ? 1 : 0);
        const appear = OM.ease.outCubic(OM.prog(T, start + 0.05, on[0]));

        ctx.globalAlpha = room * appear;
        // The desk.
        const legH = (1000 - DESK - 22) * (1 - fLegs);
        if (plank <= 0) {
          ctx.fillStyle = th.surface;
          ctx.fillRect(200, DESK + 22, 22, legH);
          ctx.fillRect(1698, DESK + 22, 22, legH);
        }
        if (plank <= 0) {
          ctx.fillStyle = th['surface-2'];
          ctx.fillRect(160, DESK, 1600, 22);
          ctx.fillStyle = th['border-strong'];
          ctx.fillRect(160, DESK, 1600, 2);
        } else {
          // The desk breaks along the lattice: every cell of plank and leg stands up as a domino.
          const DR = B.DROW;
          for (const q of DR.cells) {
            const gx = LH.x0 + q.col * LH.cw, gy = LH.y0 + q.row * LH.ch;
            const sx = q.leg ? (q.col === DR.legs[0] ? 200 : 1698) : Math.max(160, gx), sw = q.leg ? 22 : Math.min(1760, gx + LH.cw) - sx;
            const sy = q.leg ? Math.max(DESK + 22, gy) : Math.max(DESK, gy), sh = q.leg ? Math.min(1000, gy + LH.ch) - sy : Math.min(DESK + 22, gy + LH.ch) - sy;
            const u = OM.clamp(plank * 1.3 - 0.3 * ((q.col - DR.c0) / (DR.c1 - DR.c0)));
            ctx.fillStyle = OM.mix(q.leg ? th.surface : th['surface-2'], ink.mid, u);
            ctx.fillRect(OM.lerp(sx, gx, u), OM.lerp(sy, gy, u), OM.lerp(Math.max(0, sw), LH.cw * B.STAND_W, u), OM.lerp(Math.max(0, sh), LH.ch, u));
          }
        }
        if (walk < 400) person(ctx, 1830 - (2 - si) * 10 + walk, S.tall, cut);

        // The machine of this life.
        ctx.fillStyle = th['surface-2'];
        if (si === 0) ctx.fillRect(S.x + 60, DESK - S.stand, S.w - 120, S.stand);
        if (si === 1) { ctx.fillRect(S.x - 40, DESK - 8, S.w + 80, 8); ctx.fillStyle = th['border-strong']; ctx.fillRect(S.x - 40, DESK - 8, S.w + 80, 2); }
        if (si === 2) { const sh = S.stand * (1 - fStand); ctx.fillRect(950, DESK - sh, 20, sh); ctx.fillRect(860, DESK - 8 * (1 - fStand), 200, 8 * (1 - fStand)); ctx.fillStyle = th.surface; ctx.fillRect(700, DESK - 6 * (1 - fStand), 520, 6 * (1 - fStand)); }
        ctx.fillStyle = OM.mix(th['surface-2'], ink.crest, cut * 0.5);
        if (fBez < 1) ctx.fillRect(S.x, S.y + S.h * fBez, S.w, S.h * (1 - fBez));
        ctx.globalAlpha = room * appear;

        // The glass, and its light on the room.
        const gx = S.x + S.bez, gy = S.y + S.bez, gw = S.w - 2 * S.bez, gh = S.h - 2 * S.bez;
        ctx.globalAlpha = appear;
        B.pool(ctx, 960, S.cy, S.w * 0.75 * (1 - off), ink.lit, 0.12 * room);
        // Powering off: the glass collapses to a line, then to a point.
        const vy = 1 - OM.ease.inCubic(OM.prog(off, 0, 0.5)), vx = 1 - OM.ease.inCubic(OM.prog(off, 0.4, 1));
        const ph = Math.max(2, gh * vy), pw = Math.max(8, gw * vx);
        ctx.fillStyle = off > 0 ? OM.mix(th.bg, ink.crest, OM.prog(off, 0, 0.3)) : th.bg;
        if (off < 1) ctx.fillRect(960 - pw / 2, S.cy - ph / 2, pw, ph);
        ctx.strokeStyle = ink.mid;
        ctx.lineWidth = 2;
        if (off === 0) ctx.strokeRect(gx + 1, gy + 1, gw - 2, gh - 2);

        if (off === 0) {
          // The line so far, typed on this life's glass: each word slams in on its onset.
          const set = S.set;
          ctx.textAlign = 'left';
          ctx.textBaseline = 'alphabetic';
          let cx = 0, cyy = 0;
          set.words.forEach((w) => {
            const o = on[w.k];
            if (T < o) return;
            const a = T - o;
            const slam = Math.exp(-a / 0.08);
            const k = 1 + 0.3 * slam;
            const y = S.cy + w.y;
            ctx.save();
            ctx.translate(w.x + w.w / 2, y - set.cap / 2);
            ctx.scale(k, k);
            ctx.font = set.font;
            ctx.fillStyle = OM.mix(w.k === n - 1 ? ink.hover : th.text, ink.crest, Math.exp(-a / 0.2));
            ctx.fillText(w.text, -w.w / 2, set.cap / 2);
            ctx.restore();
            cx = w.x + w.w + set.adv * 0.3; cyy = y;
          });
          // The cursor, beating with the kicks.
          if (cyy) {
            const beat = OM.pulse(KICKS, T, 0.06);
            ctx.fillStyle = B.rgba(ink.lit, 0.4 + 0.6 * beat);
            ctx.fillRect(cx, cyy - set.cap, set.adv * 0.6, set.cap);
          }
        }
        ctx.globalAlpha = 1;

        // The point left on the glass arcs down onto the first domino.
        if (off >= 1 && T < LANDD) {
          const p = pointAt(T, S);
          B.pool(ctx, p.x, p.y, 72, ink.lit, 0.4);
          ctx.fillStyle = ink.crest;
          ctx.fillRect(p.x - LH.cw / 2, p.y - LH.ch / 2, LH.cw, LH.ch);
        } else if (T >= LANDD) {
          ctx.fillStyle = ink.crest;
          ctx.fillRect(LH.x0 + B.DROW.c0 * LH.cw, LH.y0 + B.DROW.row * LH.ch, LH.cw * B.STAND_W, LH.ch);
        }
      },
      render(t, T) {
          this.draw(t, T);
          const e = B.env(T, start, END);
          const ctx = c.ensure();
          ctx.globalAlpha = 1;
          if (e > 0) {

            // Keystroke Taps and Afterglow Pips: the person's hand strikes the keys on the kicks; once the screen is off, the last point pips on each hit.
            {
              const ik = OM.fieldInks('tokyo-night');
              const S = lay()[stageAt(T)], si = stageAt(T);
              const tap = OM.pulse([220.94, 221.08], T, 0.06) * (1 - OM.prog(T, OFF, OFF + 0.2));
              if (tap > 0.03) {
                const tall = S.tall, x = 1830 - (2 - si) * 10 - tall * 0.21, y = 1000 - tall + tall * 0.17 + 8 + tall * 0.45 * 0.35 + 4 * tap;
                ctx.globalAlpha = e * tap;
                ctx.fillStyle = ik.crest;
                ctx.fillRect(x - 10, y, 10, tall * 0.05);
                ctx.fillRect(x - 40, DESK - 4, 26, 3);
              }
              const pip = OM.pulse([221.61, 221.7, 221.89], T, 0.08) * (1 - OM.prog(T, B.DOMINO_CUT - 0.03, B.DOMINO_CUT));
              if (T > OFF + 0.35 && pip > 0.03) {
                const { x, y } = pointAt(Math.min(T, LANDD), S);
                // The dying point flares wide: a halo and long crest arms of light.
                ctx.globalAlpha = 1;
                B.pool(ctx, x, y, 320, ik.lit, 0.6 * pip);
                B.pool(ctx, x, y, 110, ik.crest, 0.5 * pip);
                const arm = 60 + 260 * pip;
                ctx.globalAlpha = pip;
                ctx.fillStyle = ik.crest;
                ctx.fillRect(x - arm, y - 3, 2 * arm, 6);
                ctx.fillRect(x - 3, y - arm * 0.55, 6, arm * 1.1);
              }
              ctx.globalAlpha = 1;
            }

            // Dust turning in the lamp's light.
            B.motes(ctx, T, { seed: 707, n: 50, color: OM.fieldInks('tokyo-night').hover, alpha: 0.35 * e * (1 - OM.prog(T, OFF, OFF + 0.4)), x: 600, y: 0, w: 720, h: 860, vx: 8, vy: 6, size: 3 });
          }
          ctx.globalAlpha = 1;
          fx.apply(T, (() => {
            const S = lay()[stageAt(T)];
            const gx = S.x + S.bez, gy = S.y + S.bez, gw = S.w - 2 * S.bez, gh = S.h - 2 * S.bez;
            const si = stageAt(T);
            const step = [STAGES[1], STAGES[2]].reduce((s, st) => s + 0.045 * OM.smooth(OM.prog(T, on[st.from], on[st.from] + 0.35)), 0);
            return {
              amount: e * (1 - OM.prog(T, OFF - 0.05, OFF + 0.1)),
              cam: { zoom: 1 + e * (0.02 + step + 0.02 * OM.prog(T, start, END)) },
              p0: [gx / 1920, 1 - (gy + gh) / 1080, (gx + gw) / 1920, 1 - gy / 1080],
              p1: [si === 0 ? 1 : 0, si === 0 ? 0 : 1, 0, 0],
            };
          })());
        },
        release: () => { fx.release(); c.release(); },
    };
  },
});
