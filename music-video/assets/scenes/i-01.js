// i-01 · Sleeping machine. A console nearly the frame's width sits in the
// dark, its silhouette rim-lit by its standby LED, which breathes on the downbeats and pools
// its light on the desk. On the 5.06 downbeat it wakes: three fans behind
// their grilles spin up through the hi-hat roll, light leaks through the
// grilles and the vent slot onto the desk, the LED flickers on the eighths.
// On the 7.22 downbeat the LED goes solid and the cursor appears in the slot;
// the machine sinks into the dark and the cursor types the slot out into a
// one-cell horizon across the frame, which i-02 opens on.
//
// OM.intro: painters the whole intro shares (scene files load in order).
OM.intro = (() => {
  const L = OM.HOME;
  const ink = OM.fieldInks('tokyo-night');
  const INKS = [ink.dim, ink.mid, ink.lit, ink.hover, ink.crest];
  const home = OM.cellAt(L, 960, 540);
  const word = OM.WORDMARK;
  const HR = word.h; // the horizon row, right under the wordmark
  const C0 = L.cMin, C1 = L.cMin + L.cols, R0 = L.rMin, R1 = L.rMin + L.rows;
  const W = C1 - C0;
  const WM = new Uint8Array(word.w * word.h);
  for (let r = 0; r < word.h; r++) for (let c = 0; c < word.w; c++) WM[r * word.w + c] = word.rows[r][c] === '1' ? 1 : 0;
  const inWord = (c, r) => r >= 0 && r < word.h && c >= 0 && c < word.w && WM[r * word.w + c] === 1;

  /** Ink index for light `lum` at a cell, dithered by the field's threshold; -1 is dark. */
  const level = (lum, col, row) => {
    const h = lum - OM.threshold(col, row);
    return h <= 0 ? -1 : h > 1.0 ? 4 : h > 0.62 ? 3 : h > 0.33 ? 2 : h > 0.12 ? 1 : 0;
  };
  /** Paint a full-lattice ink index buffer (one fillStyle per ink). */
  const buf = new Int8Array(W * L.rows);
  const flush = (ctx, dpr) => {
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = INKS[i];
      for (let k = 0; k < buf.length; k++) if (buf[k] === i) OM.cell(ctx, L, C0 + (k % W), R0 + ((k / W) | 0), dpr);
    }
  };
  const at = (col, row) => (row - R0) * W + (col - C0);

  /** The cut between i-01 and i-02: the night, a mid horizon line across the frame, the cursor on it. */
  const wake = (ctx, dpr) => {
    ctx.fillStyle = ink.bg;
    ctx.fillRect(0, 0, 1920, 1080);
    ctx.fillStyle = ink.mid;
    for (let col = C0; col < C1; col++) if (col !== home.col) OM.cell(ctx, L, col, HR, dpr);
    ctx.fillStyle = ink.crest;
    OM.cell(ctx, L, home.col, HR, dpr);
  };

  // ---- the dawn (i-02, and the frame i-03 opens on) ----
  const DAWN0 = 9.265; // the downbeat the sun ignites on
  const FREEZE = 19.96; // the dawn holds from here, so i-02's last frames and i-03's first are one picture
  const KICK = 12.934;
  const BEATS = OM.downbeatsIn(DAWN0 + 0.5, FREEZE);
  const SNARES = [9.636, 14.048, 16.045];
  const SC = home.col + 0.5; // the sun's column: the centre of the frame

  /**
   * Dawn behind the name at time T. The word is a dark range on the horizon,
   * rim-lit; the sun rises from the cursor behind it, its light dithered into
   * the field's own texture and shafted by the letters (each sky cell marches
   * back to the sun and is shadowed where a letter is in the way); the lake
   * below mirrors the sky and the stars fade as the light comes up.
   */
  const dawn = (ctx, T, dpr) => {
    T = Math.min(T, FREEZE);
    ctx.fillStyle = ink.bg;
    ctx.fillRect(0, 0, 1920, 1080);
    buf.fill(-1);
    const D = OM.ease.inOutSine(OM.prog(T, DAWN0, 17.6));
    const S = Math.pow(D, 0.55);
    const sy = OM.lerp(HR + 2, 8, OM.ease.outCubic(OM.prog(T, DAWN0, 16.5))); // the sun's centre row
    const sr = 4 + 4 * D;
    const burst = T >= KICK ? 1.4 * Math.exp(-(T - KICK) / 0.55) : 0;
    const beat = T >= DAWN0 + 0.5 ? 0.35 * OM.pulse(BEATS, T, 0.22) : 0;
    const snare = OM.pulse(SNARES, T, 0.12);
    const reachH = 4 + 16 * D, reachR = 8 + 46 * D, bandH = 1.5 + 30 * D, bandW = 12 + 80 * D;
    const amb = 0.22 * D * D;
    /** Diffuse sky light (no shadows): the horizon band and the halo. */
    const diffuse = (x, y) => {
      const dx = x - SC, dy = y - sy, d = Math.hypot(dx * 0.8, dy);
      return S * (1.1 * Math.exp(-d / reachH) + 0.9 * Math.exp(-(HR - y) / bandH) * (0.25 + 0.75 * Math.exp(-Math.abs(dx) / bandW)) + amb);
    };
    const tex = (col, row) => 0.6 + 0.55 * OM.heroNoise(col / 9 + T * 0.14, row / 9 - T * 0.055);

    for (let row = R0; row < R1; row++) {
      const y = row + 0.5;
      for (let col = C0; col < C1; col++) {
        const x = col + 0.5;
        let id = -1;
        if (row < HR) {
          if (inWord(col, row)) {
            // The range: dark rock, its edges catching the light behind it.
            const edge = !inWord(col, row - 1) || !inWord(col - 1, row) || !inWord(col + 1, row);
            if (edge) id = level(0.85 * diffuse(x, y) * OM.smooth(OM.prog(D, 0.05, 0.4)), col, row);
          } else {
            const dx = SC - x, dy = sy - y, d = Math.hypot(dx * 0.8, dy);
            let lum = diffuse(x, y);
            if (S > 0) {
              // Direct light: the disk and its shafts, blocked by the letters.
              let blocked = 0;
              const n = Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)));
              for (let k = 1; k < n && blocked < 2; k++) if (inWord(Math.floor(x + (dx * k) / n), Math.floor(y + (dy * k) / n))) blocked++;
              const vis = blocked ? 0.12 : 1;
              const disk = 1.8 * OM.clamp((sr - d) / 1.5);
              const shaft = (1.1 + burst + beat + 0.25 * snare) * Math.exp(-d / reachR);
              lum = lum * (blocked ? 0.3 : 0.8) + S * vis * (disk + shaft);
            }
            id = level(lum * tex(col, row), col, row);
            if (row < HR - 3 && OM.hash(col, row, 7) < 0.016) {
              // Stars: they come out over the first bar and fade as the sky lights.
              const s = (0.35 + 0.65 * OM.hash(col, row, 8)) * (0.7 + 0.3 * Math.sin(T * 2.3 + 40 * OM.hash(col, row, 9)))
                * OM.smooth(OM.prog(T, 8.0, 9.2)) * (1 - OM.smooth(OM.prog(D, 0, 0.5))) * (1 + 0.6 * snare);
              const st = s > 0.8 ? 2 : s > 0.5 ? 1 : s > 0.2 ? 0 : -1;
              if (st > id) id = st;
            }
          }
        } else if (row === HR) {
          // The horizon: the line from i-01, brightening toward the sun; the ignition runs out along it.
          id = Math.max(1, level(1.3 * diffuse(x, y), col, row));
          const age = T - (DAWN0 + Math.abs(x - SC) / 90);
          if (age >= 0) id = Math.max(id, age < 0.08 ? 4 : age < 0.25 ? 3 : age < 0.6 ? 2 : -1);
          if (col === home.col) id = 4;
        } else {
          // The lake: the sky mirrored, fading with depth, broken into ripples.
          const m = 2 * HR + 1 - y;
          const rip = 0.55 + 0.45 * Math.sin(col * 0.9 + row * 2.1 + T * 1.7);
          id = level(0.42 * diffuse(x, m) * Math.exp(-(row - HR - 1) / 6) * rip * tex(col, row), col, row);
        }
        buf[at(col, row)] = id;
      }
    }
    flush(ctx, dpr);
  };

  return { L, ink, INKS, home, HR, C0, C1, R0, R1, level, buf, at, flush, wake, dawn, FREEZE };
})();

OM.scene({
  id: 'i-01',
  build(el) {
    const cv = document.createElement('canvas');
    cv.className = 'om-fill';
    el.appendChild(cv);
    const c = OM.canvas(cv, { alpha: false });
    const { L, ink, home, HR, C0, C1, R0, R1, level, buf, at, flush, wake } = OM.intro;
    const END = 7.94;
    const DB = [2.902, 5.062, 7.221];
    const WAKE = DB[1], SOLID = DB[2];
    const BREATH = DB[1] - DB[0];
    const HALF = OM.SPB / 2;

    // ---- the machine, on a lattice 1.5x the home one, its vent row on the horizon's row ----
    const LM = OM.lattice({ wordWidth: 1770, wordX: 75, wordY: L.y0 + (HR + 0.5) * L.ch - (HR + 0.5) * L.ch * 1.5 });
    const PC0 = 0, PC1 = 80, PR0 = 6, PR1 = 21, MID = 40;
    const FANS = [MID - 26, MID - 9, MID + 8].map((col) => ({ col: col + 0.5, row: 13.5 }));
    const FR = 5.2;
    const LED = { col: MID + 33, row: 10 };
    const SLOT = [PC0 + 4, PC1 - 4];
    const outline = (col, row) => (row === PR0 || row === PR1) && col >= PC0 && col <= PC1 || (col === PC0 || col === PC1) && row >= PR0 && row <= PR1;
    /** Undithered ink for edges, so the silhouette reads as a clean line. */
    const solid = (lum) => (lum > 1 ? 3 : lum > 0.6 ? 2 : lum > 0.3 ? 1 : lum > 0.08 ? 0 : -1);
    const bins = [[], [], [], [], []];

    /** Fan speed in revolutions since the wake (spin-up through the roll), and its blades' visible contrast. */
    const revs = (t) => {
      const p = OM.prog(t, WAKE, 7.6);
      return 7 * p * p * p + Math.max(0, t - 7.6) * 8;
    };
    const rate = (t) => 5 * (21 * Math.pow(OM.prog(t, WAKE, 7.6), 2) / (7.6 - WAKE) + (t > 7.6 ? 8 : 0)); // blade passes per second

    return {
      render(t) {
        const ctx = c.ensure();
        const dpr = c.dpr;
        if (t >= END - 0.1) return wake(ctx, dpr);
        ctx.fillStyle = ink.bg;
        ctx.fillRect(0, 0, 1920, 1080);
        buf.fill(-1);
        for (const b of bins) b.length = 0;

        // The LED: a slow breath peaking on the downbeats, eighth-note flicker once awake, solid on the hit.
        const env = OM.smooth(OM.prog(t, 0.557, DB[0]));
        let B;
        if (t < WAKE) B = env * (0.5 + 0.5 * Math.cos((2 * Math.PI * (t - DB[0])) / BREATH)) * (t > DB[0] ? 0.75 : 1) + (t > DB[0] ? 0.25 : 0);
        else if (t < SOLID) B = Math.floor((t - WAKE) / HALF) % 2 ? 0.55 : 1;
        else B = 1.15;
        // Fan light: a first glow on the wake, climbing with the roll.
        const F = t < WAKE ? 0 : 0.3 + 0.9 * OM.ease.inCubic(OM.prog(t, WAKE, SOLID));
        const sink = Math.pow(1 - OM.smooth(OM.prog(t, SOLID + 0.04, SOLID + 0.45)), 2); // the machine goes back to the dark
        const phi = 2 * Math.PI * revs(t);
        const contrast = OM.clamp(1 - rate(t) / 14);
        const hit = t >= SOLID ? Math.exp(-(t - SOLID) / 0.2) : 0;

        for (let row = PR0 - 2; row <= PR1 + 11; row++) {
          for (let col = PC0 - 4; col <= PC1 + 4; col++) {
            const ldx = col - LED.col, ldy = row - LED.row;
            const ld = Math.hypot(ldx, ldy);
            let id = -1;
            if (row <= PR1 && row >= PR0 && col >= PC0 && col <= PC1) {
              if (outline(col, row)) {
                // The case's silhouette, rim-lit from the LED, then by the fans.
                id = solid(sink * (env * (0.32 + 1.1 * B * Math.exp(-ld / 26)) + 0.7 * F));
              } else {
                // The front panel catches the LED's glow.
                let lum = 0.75 * B * Math.exp(-ld / 9);
                for (const f of FANS) {
                  const dx = col + 0.5 - f.col, dy = row + 0.5 - f.row, d = Math.hypot(dx, dy);
                  if (d > FR + 0.4) continue;
                  if (d > FR - 0.5) {
                    // The grille ring: a clean circle, dimly lit asleep, bright once the fans run.
                    id = Math.max(id, solid(sink * (env * (0.15 + 0.6 * B * Math.exp(-ld / 30)) + 0.8 * F)));
                  } else if (d > 1.2 && (col + row) % 2 === 0) {
                    // Grille holes: light from inside, cut by five blades turning.
                    const blade = 0.5 + 0.5 * Math.cos(5 * (Math.atan2(dy, dx) - phi));
                    lum = Math.max(lum, F * (1.5 + 0.8 * hit) * (1 - contrast * (blade < 0.5 ? 0.9 : 0)));
                  }
                }
                if (row === HR && col >= SLOT[0] && col <= SLOT[1]) {
                  // The vent slot: light leaking through, flickering with the blades until it steadies.
                  const flick = 0.65 + 0.35 * contrast * Math.sin(col * 0.6 - phi * 5);
                  id = Math.max(id, solid(sink * (F * 1.4 * flick + env * (0.12 + 0.4 * B * Math.exp(-ld / 20)))));
                }
                id = Math.max(id, level(lum * sink, col, row));
              }
            } else if (row > PR1) {
              // The desk: the LED's pool, and beams leaking from the grilles and the slot toward us.
              const dz = row - PR1 - 1;
              let lum = 1.0 * B * Math.exp(-((ldx / 12) ** 2 + (dz / 3.5) ** 2) * 1.4);
              const across = col >= SLOT[0] && col <= SLOT[1] ? 1 : Math.exp(-Math.min(Math.abs(col - SLOT[0]), Math.abs(col - SLOT[1])) / 3);
              lum += F * 0.7 * across * Math.exp(-dz / 2.4);
              for (const f of FANS) lum += F * 1.1 * Math.exp(-(((col + 0.5 - f.col) / (4 + dz * 0.6)) ** 2)) * Math.exp(-dz / 5);
              id = level(lum * sink, col, row);
            } else if (row < PR0) {
              // A little light spills up over the top edge once the fans run.
              id = level(sink * F * 0.6 * Math.exp(-(PR0 - row - 1) / 1.2) * (col >= PC0 && col <= PC1 ? 1 : 0), col, row);
            }
            if (col === LED.col && row === LED.row) {
              id = B > 1.05 ? 4 : B > 0.75 ? 3 : B > 0.45 ? 2 : B > 0.2 ? 1 : B > 0.06 ? 0 : -1;
              if (t >= SOLID) id = sink < 0.05 ? -1 : Math.round(OM.lerp(4, 0, 1 - sink));
            }
            if (id >= 0) bins[id].push(col, row);
          }
        }
        for (let i = 0; i < 5; i++) {
          ctx.fillStyle = OM.intro.INKS[i];
          const a = bins[i];
          for (let k = 0; k < a.length; k += 2) OM.cell(ctx, LM, a[k], a[k + 1], dpr);
        }

        // The cursor appears in the slot on the hit and types it out into the horizon.
        if (t >= SOLID) {
          const span = Math.max(home.col - C0, C1 - 1 - home.col);
          const reach = span * OM.ease.inOutCubic(OM.prog(t, SOLID + 0.1, END - 0.14));
          for (let k = 1; k <= Math.floor(reach + 1e-4); k++) {
            const age = t - (SOLID + 0.1 + (END - 0.24 - SOLID) * (k / span));
            const id = age < 0.05 ? 4 : age < 0.14 ? 3 : age < 0.3 ? 2 : 1;
            for (const col of [home.col - k, home.col + k]) if (col >= C0 && col < C1) buf[at(col, HR)] = id;
          }
          buf[at(home.col, HR)] = 4;
        }
        flush(ctx, dpr);
      },
      release: () => c.release(),
    };
  },
});
