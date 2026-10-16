// v2-04 · Two boots, one self. Out of the night two machines boot side by
// side, each scrolling its own, different boot log, ticking forward on the
// snares. On every onset both logs print a lit line and its cells fly out of
// both panes together into the centre, where the word lands in lattice type:
// two different boots spelling the same line. The panes slide together as the
// line fills, and on the last word, the key word, both boots implode into it:
// the logs, the frames, everything, leaving only the self that survived the
// reboot. In the pause, echo lines from both sides are absorbed into it on the
// kicks, it blinks through a reboot on the snare and holds, the tube browns
// out, and on the last kicks it powers off, CRT style, into the night.
OM.ownWords.add('v2-04');
OM.scene({
  id: 'v2-04',
  build(el, { start, duration }) {
    const V = OM.v2, LT = OM.v2lat;
    const cv = document.createElement('canvas');
    cv.className = 'om-fill';
    el.appendChild(cv);
    // A second print of the frame, screen-blended at the two boots' separation, converging to nothing at the key word.
    const FX = `vec4 effect(vec2 uv) {
      vec2 q = cam(uv);
      vec3 a = src(q).rgb, b = src(q + uP0.xy).rgb;
      vec3 scr = 1.0 - (1.0 - a) * (1.0 - b * vec3(0.8, 1.0, 0.75));
      return vec4(mix(a, scr, uP0.z * uAmount), 1.0);
    }`;
    const c = OM.canvas(cv, { alpha: false });
    const fx = OM.post(el, c, { effect: FX });
    const off = document.createElement('canvas'); // the frame, drawn once, printed or powered off
    const oc = OM.canvas(off, { alpha: false });
    const ink = V.ink(), th = V.th();
    const sung = OM.sung('v2-04');
    const N = sung.length;
    const on = sung.map((w) => w.t0);
    const END = start + duration;
    const KEY = N - 1, LOCK = on[KEY];
    const SNARES = [127.896, 128.174, 128.29, 128.708, 128.964, 130.287];
    const MERGE0 = 130.287; // the panes start sliding together on this snare
    const ECHO = [131.26, 131.402, 131.54], BLINK = 131.913, DIP = 132.075;
    const K1 = 132.331, K2 = 132.47; // power-off: to a line, to a dot
    const FLY = 0.14;
    // Two boots, two different logs.
    const LOGA = ['Linux version 6.17.9-arch1-1', 'Command line: root=UUID quiet splash', 'Booting paravirtualized kernel', 'ACPI: 12 ACPI AML tables loaded', 'nvme0n1: p1 p2', 'Run /init as init process',
      'Starting Load Kernel Modules', 'Mounted /boot', 'Reached target Local File Systems', 'Started Network Manager', 'Reached target Graphical Interface', 'Starting Hyprland session'];
    const LOGB = ['limine: booting snapshot 2', 'BTRFS: device fsid mounted', 'Finished Remount Root', 'Started Journal Service', 'Listening on udev Control Socket', 'Started iwd wireless daemon',
      'Starting Bluetooth service', 'Reached target Sound Card', 'Started Power Profiles', 'Reached target Multi-User System', 'Starting uwsm session', 'Started waybar'];
    const PW = 820, PH = 880, PY = 100;
    let F = null;
    const plan = () => {
      const L = V.layout(sung, { cap: 88, maxW: 1560, cx: 960, cy: 520, lead: 1.45 });
      const R = LT.raster(sung, L);
      const box = (k) => {
        const cs = R[k].cells;
        if (!cs.length) return { x: L.at[k].cx, y: L.at[k].cy, w: 0, h: 0 };
        const x0 = Math.min(...cs.map((q) => q[0])), x1 = Math.max(...cs.map((q) => q[0])) + LT.CELL;
        return { x: x0, y: R[k].top, w: x1 - x0, h: R[k].bot + LT.CELL - R[k].top };
      };
      F = { L, R, box: sung.map((_, k) => box(k)), top: Math.min(...R.map((r) => r.top)) - 30, bot: Math.max(...R.map((r) => r.bot)) + 40 };
    };
    /** The two boots slide together as the line fills: 1 apart, 0 one on the other. */
    const sep = (T) => 1 - OM.ease.inOutCubic(OM.prog(T, MERGE0, LOCK));
    const implode = (T) => OM.ease.inExpo(OM.prog(T, LOCK - 0.12, LOCK));
    const paneRect = (side, T) => {
      const grow = OM.ease.inOutCubic(OM.prog(T, start + V.HOLD_IN, start + 0.45));
      const s = sep(T);
      const cx = 960 + side * OM.lerp(0, 490, s) * (0.6 + 0.4 * grow);
      let r = { x: cx - PW / 2, y: PY, w: PW, h: PH };
      r = V.lerpRect({ x: cx, y: 540, w: 0, h: 0 }, r, grow);
      const b = F.box[KEY];
      return V.lerpRect(r, { x: b.x + b.w / 2, y: b.y + b.h / 2, w: 0, h: 0 }, implode(T));
    };
    /** Lines printed by a boot at T: a steady crawl, a burst on every snare, racing into the merge. */
    const printed = (T) => {
      let n = 9 * Math.max(0, T - start);
      for (const s of SNARES) n += 3 * OM.ease.outCubic(OM.prog(T, s, s + 0.1));
      n += 22 * Math.pow(OM.prog(T, MERGE0, LOCK), 2);
      return n;
    };
    const LH = 30;
    const pane = (x, side, T) => {
      const r = paneRect(side, T);
      if (r.w < 4) return;
      const fade = 1 - implode(T);
      x.save();
      x.globalAlpha = fade * (side > 0 && sep(T) < 1 ? OM.lerp(0.55, 1, sep(T)) : 1);
      x.fillStyle = th['border-strong'];
      x.fillRect(r.x, r.y, r.w, r.h);
      x.fillStyle = th['bg-deep'];
      x.fillRect(r.x + 2, r.y + 2, r.w - 4, r.h - 4);
      x.beginPath();
      x.rect(r.x + 2, r.y + 2, r.w - 4, r.h - 4);
      x.clip();
      const log = side < 0 ? LOGA : LOGB, n = printed(T), whole = Math.floor(n), frac = n - whole;
      x.font = "500 21px 'JetBrains Mono'";
      x.textBaseline = 'alphabetic';
      x.textAlign = 'left';
      const rows = Math.ceil(r.h / LH) + 1;
      for (let i = 0; i < rows; i++) {
        const k = whole - i;
        if (k < 0) break;
        const y = r.y + r.h - 22 - (i - frac) * LH;
        const lit = sung.some((w) => T >= w.t0 && T - w.t0 < 0.25 && k === Math.floor(printed(w.t0)));
        x.fillStyle = lit ? ink.crest : ink.lit;
        x.fillText('[  OK  ]', r.x + 24, y);
        x.fillStyle = lit ? ink.crest : th['text-muted'];
        x.fillText(log[(k * 7 + (side < 0 ? 0 : 3)) % log.length], r.x + 150, y);
      }
      x.restore();
    };
    /** The frame up to the power-off. */
    const frame = (x, T) => {
      x.fillStyle = ink.bg;
      x.fillRect(0, 0, 1920, 1080);
      if (T < LOCK + 0.01) { pane(x, -1, T); pane(x, 1, T); }
      // A dark band behind the line so it reads over the logs.
      const band = OM.clamp((T - on[0]) / 0.2) * (1 - implode(T));
      if (band > 0) {
        x.fillStyle = V.rgba(ink.bg, 0.82 * band);
        x.fillRect(0, F.top, 1920, F.bot - F.top);
      }
      const lockA = T >= LOCK ? Math.exp(-(T - LOCK) / 0.25) : 0;
      const blink = T >= BLINK && T < BLINK + 0.12 ? OM.prog(T, BLINK, BLINK + 0.12) : 1; // sprinkle: reboot blink
      const keep = blink < 1 ? (cx, cy) => OM.threshold(cx / LT.P, cy / LT.P) < Math.abs(blink * 2 - 1) : null;
      for (let k = 0; k < N; k++) {
        if (T < on[k]) {
          // Its cells in flight, out of both boots' newest lines.
          const p = OM.prog(T, on[k] - FLY, on[k]);
          if (p <= 0 || on[k] - FLY < start + 0.1) continue;
          const e = OM.ease.inCubic(p);
          const n = printed(on[k] - FLY);
          x.fillStyle = V.rgba(ink.crest, 0.4 + 0.6 * p);
          F.R[k].cells.forEach(([cx, cy], i) => {
            const side = i % 2 ? 1 : -1, r = paneRect(side, on[k] - FLY);
            const fx0 = r.x + 150 + ((i * 37) % 400), fy0 = r.y + r.h - 22 - (n % 1) * 0;
            x.fillRect(OM.lerp(fx0, cx, e), OM.lerp(fy0, cy, e), LT.CELL, LT.CELL);
          });
          continue;
        }
        LT.draw(x, ink, F.R[k], T - on[k], { keep });
      }
      // The key word: both boots gone into it; it holds the light.
      if (T >= LOCK) {
        const b = F.box[KEY];
        V.pool(x, b.x + b.w / 2, b.y + b.h / 2, b.w * 0.9 + 60, b.h, ink.lit, 0.25 + 0.35 * lockA);
        LT.draw(x, ink, F.R[KEY], T - LOCK, { keep });
        if (lockA > 0.03) {
          x.strokeStyle = V.rgba(ink.crest, lockA);
          x.lineWidth = 2 + 6 * lockA;
          const g = 30 + 700 * (1 - lockA);
          x.strokeRect(b.x - g, b.y - g * 0.6, b.w + 2 * g, b.h + 1.2 * g);
          for (let i = 0; i < 6; i++) V.burst(x, b.x + (b.w * i) / 5, b.y + b.h / 2, T - LOCK, 2404 + i, { n: 10, sp: 700, life: 0.5, g: 200 });
        }
        // Sprinkle, echo lines: on each pause kick a last log line from each side is absorbed into the key word.
        ECHO.forEach((h, i) => {
          const a = T - h;
          if (a < 0 || a > 0.22) return;
          const e = OM.ease.inCubic(a / 0.22), y = F.bot + 30 + i * 26;
          x.font = "500 21px 'JetBrains Mono'";
          x.textBaseline = 'alphabetic';
          x.fillStyle = V.rgba(ink.lit, 1 - e * 0.7);
          x.textAlign = 'right';
          x.fillText(LOGA[(i * 5) % LOGA.length], OM.lerp(-20, b.x, e) + 0, OM.lerp(y, b.y + b.h, e));
          x.textAlign = 'left';
          x.fillText(LOGB[(i * 5 + 2) % LOGB.length], OM.lerp(1940, b.x + b.w, e), OM.lerp(y, b.y + b.h, e));
          if (a > 0.18) V.pool(x, b.x + b.w / 2, b.y + b.h / 2, b.w, b.h * 0.8, ink.crest, 0.3);
        });
      }
    };

    return {
      render(t, T) {
        const ctx = c.ensure();
        if (T < start + V.HOLD_IN || T >= END - V.HOLD_OUT || T >= K2 + 0.5) return fx.apply(T), OM.handoff('night', ctx, T, c.dpr);
        if (!F || !V.met().ok) plan();
        const x = oc.ensure();
        frame(x, T);
        ctx.fillStyle = ink.bg;
        ctx.fillRect(0, 0, 1920, 1080);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        const W = cv.width, H = cv.height;
        if (T < K1) ctx.drawImage(off, 0, 0, W, H);
        else {
          // Power off: squash to a bright line on one kick, to a dot on the next.
          const v = OM.ease.inCubic(OM.prog(T, K1, K2));
          const hz = OM.ease.inCubic(OM.prog(T, K2, K2 + 0.16));
          const sy = Math.max(0.004, 1 - v), sx = Math.max(0.006, 1 - hz);
          ctx.save();
          ctx.translate(W / 2, H / 2);
          ctx.scale(sx, sy);
          ctx.drawImage(off, -W / 2, -H / 2, W, H);
          ctx.restore();
          ctx.globalAlpha = v * v * (1 - OM.prog(T, K2 + 0.16, K2 + 0.32));
          ctx.fillStyle = ink.crest;
          const lw = W * sx, lh = Math.max(3 * c.dpr, H * sy * 0.12);
          ctx.fillRect(W / 2 - lw / 2, H / 2 - lh / 2, lw, lh);
          ctx.globalAlpha = 1;
        }
        ctx.setTransform(c.dpr, 0, 0, c.dpr, 0, 0);
        // Sprinkle, brownout: the tube sags on the kick before power-off.
        const dip = T >= DIP && T < K1 ? Math.exp(-(T - DIP) / 0.06) : 0;
        if (dip > 0.02) { ctx.fillStyle = V.rgba(ink.bg, 0.4 * dip); ctx.fillRect(0, 0, 1920, 1080); }
        // Phosphor: the dot's afterglow lingering on the tube.
        const ph = T >= K2 + 0.12 ? 1 - OM.prog(T, K2 + 0.12, K2 + 0.48) : 0;
        if (ph > 0) {
          V.pool(ctx, 960, 540, 90, 90, ink.lit, 0.35 * ph * ph);
          ctx.fillStyle = V.rgba(ink.crest, ph);
          for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) if (Math.abs(i) + Math.abs(j) <= 2) ctx.fillRect(958 + i * 6, 538 + j * 6, 4, 4);
        }
        const ce = V.camEnv(T, start, END), s = T < LOCK ? sep(T) : 0;
        const punch = T >= LOCK ? Math.exp(-(T - LOCK) / 0.12) : 0;
        const grow = OM.ease.inOutCubic(OM.prog(T, start + V.HOLD_IN, start + 0.45));
        fx.apply(T, {
          amount: V.env(T, start, END),
          cam: { zoom: 1 + ce * (0.04 + 0.05 * punch), x: ce * 22 * s * Math.sin((T - start) * 1.2) },
          p0: [(36 * s) / 1920, (10 * s) / 1080, 0.16 * s * grow, 0],
        });
      },
      release: () => { fx.release(); c.release(); oc.release(); },
    };
  },
});
