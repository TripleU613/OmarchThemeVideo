// i-03 · The spiral. Opens on i-02's held dawn exactly (sampled cell for cell),
// then every lit cell is pulled inward on a spiral and condenses into the
// 15x15 mark at 4x4 cells per logo pixel, landing on the intro's big hit with
// a one-frame crest. Light runs the spiral on the accelerating hi-hat roll;
// then the mark turns in four hard 90-degree steps on the beats and comes home.
OM.scene({
  id: 'i-03',
  build(el, { start }) {
    const cv = document.createElement('canvas');
    cv.className = 'om-fill';
    el.appendChild(cv);
    const c = OM.canvas(cv, { alpha: false });
    const L = OM.HOME;
    const ink = OM.fieldInks('tokyo-night');
    const INKS = [ink.dim, ink.mid, ink.lit, ink.hover, ink.crest];
    const word = OM.WORDMARK;
    const home = OM.cellAt(L, 960, 540);
    const T0 = start;
    const LAND = 20.95; // the hit: kick envelope peaks at 20.967 (one 30fps frame)
    const FRAME = 1 / 30;
    const ROLL = [22.245, 24.474]; // accelerating hi-hat roll after the hit
    const TURNS = OM.beatsIn(26.3, 28.3); // 26.517, 27.051, 27.585, 28.119
    const TURN = 0.3;
    const N = 60; // 15 logo pixels x 4 cells
    const H = N / 2;
    const inWord = (col, row) => row >= 0 && row < word.h && col >= 0 && col < word.w && word.rows[row][col] === '1';

    // ---- i-02's final look, rendered with its own parameters and sampled per cell ----
    const off = document.createElement('canvas');
    off.width = 1920;
    off.height = 1080;
    const octx = off.getContext('2d');
    OM.intro.dawn(octx, OM.intro.FREEZE, 1); // i-02's held dawn, the exact frame it cuts on
    const px = octx.getImageData(0, 0, 1920, 1080).data;
    off.width = 0;
    const inkKey = new Map(INKS.map((h, i) => [OM.rgb(h).join(','), i]));

    // ---- the mark: 60x60 cells, lit where the logo is ----
    const lit = new Uint8Array(N * N);
    const targets = [];
    for (let v = 0; v < N; v++)
      for (let u = 0; u < N; u++)
        if (OM.LOGO.rows[v >> 2][u >> 2] === '1') {
          lit[v * N + u] = 1;
          targets.push(v * N + u);
        }
    const nearest = (u, v) => {
      let best = 0, bd = Infinity;
      for (const k of targets) {
        const dx = (k % N) - u, dy = ((k / N) | 0) - v, d = dx * dx + dy * dy;
        if (d < bd) { bd = d; best = k; }
      }
      return best;
    };

    // ---- particles: every lit field cell, flying a spiral to a cell of the mark ----
    const hx = Math.max(home.col - L.cMin, L.cMin + L.cols - home.col);
    const hy = Math.max(home.row - L.rMin, L.rMin + L.rows - home.row);
    const rMax = Math.hypot(hx, hy);
    const P = [];
    for (let r = 0; r < L.rows; r++)
      for (let k = 0; k < L.cols; k++) {
        const col = L.cMin + k, row = L.rMin + r;
        const x = Math.floor(L.x0 + (col + 0.5) * L.cw), y = Math.floor(L.y0 + (row + 0.5) * L.ch);
        if (x < 0 || y < 0 || x >= 1920 || y >= 1080) continue;
        const i = (y * 1920 + x) * 4;
        const id = inkKey.get(`${px[i]},${px[i + 1]},${px[i + 2]}`);
        if (id === undefined) continue;
        const sx = col + 0.5 - home.col, sy = row + 0.5 - home.row;
        const ju = (OM.hash(col, row, 5) - 0.5) * 3, jv = (OM.hash(col, row, 6) - 0.5) * 3;
        const tu = OM.clamp(H + (sx / hx) * H + ju, 0, N - 1), tv = OM.clamp(H + (sy / hy) * H + jv, 0, N - 1);
        const t = nearest(Math.round(tu), Math.round(tv));
        const gx = (t % N) + 0.5 - H, gy = ((t / N) | 0) + 0.5 - H;
        const as = Math.atan2(sy, sx);
        let da = Math.atan2(gy, gx) - as;
        da = Math.atan2(Math.sin(da), Math.cos(da));
        // A vortex, not a rigid spin: the inner field turns further than the rim.
        const rs = Math.hypot(sx, sy);
        P.push({ ink: id, rs, rg: Math.hypot(gx, gy), as, da: da + 1.9 * (1 - 0.75 * rs / rMax), delay: 0.06 + 0.22 * OM.hash(col, row, 9) });
      }

    // ---- the light run: cell distance along the mark from the bottom gap ----
    const dist = new Int16Array(N * N).fill(-1);
    const queue = [];
    for (let v = 56; v < 60; v++) for (let u = 36; u < 40; u++) { dist[v * N + u] = 0; queue.push(v * N + u); }
    for (let q = 0; q < queue.length; q++) {
      const k = queue[q], u = k % N, v = (k / N) | 0;
      for (const [du, dv] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const a = u + du, b = v + dv, j = b * N + a;
        if (a < 0 || b < 0 || a >= N || b >= N || !lit[j] || dist[j] >= 0) continue;
        dist[j] = dist[k] + 1;
        queue.push(j);
      }
    }
    let maxD = 0;
    for (const k of targets) maxD = Math.max(maxD, dist[k]);

    const cellInk = new Uint8Array(N * N);
    const Cx = L.x0 + home.col * L.cw, Cy = L.y0 + home.row * L.ch;

    /** Ink of mark cell (u, v) in the mark's own frame (it turns with the mark). */
    function markInks(T) {
      const k = OM.prog(T, LAND + FRAME, LAND + 0.5); // dithered cooling after the one-frame crest
      const head = (maxD + 24) * Math.pow(OM.prog(T, ROLL[0], ROLL[1]), 1.5);
      const running = T >= ROLL[0] && T < ROLL[1] + 0.6;
      for (const j of targets) {
        const u = j % N, v = (j / N) | 0;
        if (T < LAND + FRAME) { cellInk[j] = 4; continue; }
        const th = OM.threshold(u, v);
        const n = OM.heroNoise(u / 9 + T * 0.14, v / 9 - T * 0.055);
        const val = 0.3 + 0.7 * n * n + 0.12 * Math.sin(T * 1.1 + OM.heroJitter[(v * 37 + u * 11) & 4095] * 6.283);
        let id = val > 0.62 + 0.3 * th ? 3 : val > 0.2 + 0.25 * th ? 2 : 1;
        if (th > k) id = 3;
        if (running) {
          const behind = head - dist[j];
          if (behind >= 0 && behind < 3) id = 4;
          else if (behind >= 3 && behind < 14 && th < 1 - (behind - 3) / 11) id = Math.max(id, 3);
        }
        cellInk[j] = id;
      }
    }

    /** Clockwise rotation in degrees: four quarter turns with a wind-up and a firm settle. */
    function angle(T) {
      let a = 0;
      for (const b of TURNS) {
        if (T < b) a -= 4 * OM.smooth(OM.prog(T, b - 0.1, b));
        else {
          a += 90 * OM.ease.outBack(OM.prog(T, b, b + TURN), 1.25);
          a -= 4 * (1 - OM.ease.outCubic(OM.prog(T, b, b + 0.05)));
        }
      }
      return a;
    }

    return {
      render(t, T) {
        const ctx = c.ensure();
        const dpr = c.dpr;
        ctx.fillStyle = ink.bg;
        ctx.fillRect(0, 0, 1920, 1080);

        if (T < LAND) {
          // The pull: slow at first, then a rush into the hit, swirling as it closes.
          const ids = [[], [], [], [], []];
          for (const p of P) {
            const e = Math.pow(OM.prog(T, T0 + p.delay, LAND), 3);
            const r = p.rs + (p.rg - p.rs) * e;
            const a = p.as + p.da * e;
            const col = Math.floor(home.col + r * Math.cos(a));
            const row = Math.floor(home.row + r * Math.sin(a));
            ids[e > 0.82 ? 4 : e > 0.45 ? Math.max(p.ink, 3) : p.ink].push(col, row);
          }
          for (let i = 0; i < 5; i++) {
            ctx.fillStyle = INKS[i];
            const a = ids[i];
            for (let k = 0; k < a.length; k += 2) OM.cell(ctx, L, a[k], a[k + 1], dpr);
          }
          return;
        }

        markInks(T);
        const deg = angle(T);
        const q = Math.round(deg / 90);
        if (Math.abs(deg - q * 90) < 0.02) {
          // At rest: exactly on the lattice, the turned bitmap indexed cell for cell.
          const turns = ((q % 4) + 4) % 4;
          for (let i = 1; i < 5; i++) {
            ctx.fillStyle = INKS[i];
            for (const j of targets) {
              if (cellInk[j] !== i) continue;
              let u = j % N, v = (j / N) | 0;
              for (let s = 0; s < turns; s++) [u, v] = [N - 1 - v, u];
              OM.cell(ctx, L, home.col - H + u, home.row - H + v, dpr);
            }
          }
          return;
        }
        // Mid-turn: rotate in cell space, then scale by the lattice's cell size,
        // so a quarter turn lands each cell exactly on a lattice cell.
        const rad = (deg * Math.PI) / 180, cs = Math.cos(rad), sn = Math.sin(rad);
        ctx.save();
        ctx.setTransform(dpr * L.cw * cs, dpr * L.ch * sn, -dpr * L.cw * sn, dpr * L.ch * cs, dpr * Cx, dpr * Cy);
        for (let i = 1; i < 5; i++) {
          ctx.fillStyle = INKS[i];
          for (const j of targets) if (cellInk[j] === i) ctx.fillRect((j % N) - H - 0.02, ((j / N) | 0) - H - 0.02, 1.04, 1.04);
        }
        ctx.restore();
      },
      release: () => c.release(),
    };
  },
});
