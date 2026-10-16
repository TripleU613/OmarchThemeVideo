// b-04 · Life on the board. The grid becomes a Game of Life board. Each
// word is set into the board as live cells on its onset, a crest stamp, and
// the rule (B3/S23) runs on every 8th note: while the line is sung the letters
// hold, and life sprouts and dies along their edges, so the words are alive
// but readable. On the downbeat after the last word they are let go and the
// rule runs on 16ths, the letters breaking up into blinkers, blocks and gliders.
// The kicks flash the board. Then everything outside the screen's edge dies,
// the life inside goes dark, and the board is a screen.
OM.ownWords.add('b-04');
OM.scene({
  id: 'b-04',
  build(el, { start, duration }) {
    const B = OM.bridge;
    const cv = document.createElement('canvas');
    cv.className = 'om-fill';
    el.appendChild(cv);
    const c = OM.canvas(cv, { alpha: false });
    const END = start + duration;
    const L = OM.HOME;
    const ink = OM.fieldInks('tokyo-night');
    const th = OM.theme('tokyo-night');
    const sung = OM.sung('b-04');
    const on = sung.map((w) => B.land(w.t0, start));
    const KICKS = [206.333, 207.122, 207.54];
    const RELEASE = 208.237, DIE = 208.62;
    const SCR = { x: 320, y: 140, w: 1280, h: 800 };

    // The clock: 8ths while the line is held, 16ths once it is let go, plus every onset.
    const beats = OM.beatsIn(start - 1, END + 1);
    const ticks = [start];
    beats.forEach((b, i) => {
      const nx = beats[i + 1] ?? b + OM.SPB;
      const sub = b >= RELEASE - 0.01 ? 4 : 2;
      for (let s = 0; s < sub; s++) {
        const x = b + ((nx - b) * s) / sub;
        if (x > start + 0.02 && x < END) ticks.push(x);
      }
    });
    on.forEach((o) => ticks.push(o));
    ticks.sort((a, b) => a - b);
    // Ticks crowding an onset give way to it.
    const clock = [];
    for (const x of ticks) {
      const last = clock[clock.length - 1];
      if (last !== undefined && x - last < 0.03) { if (on.includes(x) && !on.includes(last)) clock[clock.length - 1] = x; continue; }
      clock.push(x);
    }
    ticks.splice(0, ticks.length, ...clock);

    const M = 14;
    const c0 = L.cMin - M, r0 = L.rMin - M, W = L.cols + 2 * M, Hh = L.rows + 2 * M;
    const idx = (col, row) => (row - r0) * W + (col - c0);

    const lay = B.lazy(() => {
      const set = B.set(sung, { weight: 800, cap: 100, minCap: 72, maxW: 1640, cy: 530, lead: 1.42 });
      const words = set.words.map((w) => B.cells(w, set, L).map(([col, row]) => idx(col, row)));
      // Every generation precomputed: live cells with their age, the word cells pinned.
      let board = new Uint8Array(W * Hh);
      const pin = new Uint8Array(W * Hh), age = new Uint16Array(W * Hh), born = new Float32Array(W * Hh);
      const gens = [];
      for (let g = 0; g < ticks.length; g++) {
        const tk = ticks[g];
        if (g > 0) {
          const next = new Uint8Array(W * Hh);
          for (let y = 1; y < Hh - 1; y++)
            for (let x = 1; x < W - 1; x++) {
              const i = y * W + x;
              const nb = board[i - W - 1] + board[i - W] + board[i - W + 1] + board[i - 1] + board[i + 1] + board[i + W - 1] + board[i + W] + board[i + W + 1];
              next[i] = nb === 3 || (nb === 2 && board[i]) ? 1 : 0;
            }
          if (tk < RELEASE - 0.01) {
            for (let i = 0; i < W * Hh; i++) if (pin[i]) next[i] = 1;
          } else pin.fill(0);
          for (let i = 0; i < W * Hh; i++) age[i] = next[i] ? (board[i] ? age[i] + 1 : 0) : 0;
          board = next;
        }
        on.forEach((o, k) => {
          if (Math.abs(o - tk) < 1e-6 && tk < RELEASE) for (const i of words[k]) { board[i] = 1; pin[i] = 1; age[i] = 0; born[i] = o; }
        });
        const live = [], ages = [], pins = [];
        for (let i = 0; i < W * Hh; i++) if (board[i]) { live.push(i); ages.push(age[i]); pins.push(pin[i]); }
        gens.push({ live: Int32Array.from(live), ages: Uint16Array.from(ages), pins: Uint8Array.from(pins) });
      }
      return { gens, born };
    });
    const AGE = [ink.crest, ink.hover, ink.lit, ink.mid, ink.mid, ink.dim];
    const grid = (ctx, dpr, a) => {
      const snap = (v) => Math.round(v * dpr) / dpr;
      ctx.globalAlpha = a;
      ctx.fillStyle = th['border-subtle'];
      for (let col = L.cMin; col <= L.cMin + L.cols; col++) ctx.fillRect(snap(L.x0 + col * L.cw), 0, 1, 1080);
      for (let row = L.rMin; row <= L.rMin + L.rows; row++) ctx.fillRect(0, snap(L.y0 + row * L.ch), 1920, 1);
      ctx.globalAlpha = 1;
    };

    return {
      render(t, T) {
        const ctx = c.ensure();
        const dpr = c.dpr;
        if (T < on[0] || T >= END - 0.1) return OM.handoff(T < on[0] ? 'grid' : 'screen', ctx, T, dpr);
        ctx.fillStyle = ink.bg;
        ctx.fillRect(0, 0, 1920, 1080);
        const { gens, born } = lay();
        const out = OM.prog(T, DIE, DIE + 0.3), dark = OM.prog(T, DIE + 0.2, END - 0.14);
        grid(ctx, dpr, 1 - OM.prog(T, DIE, END - 0.2));
        const g = OM.clamp(OM.hitCount(ticks, T + 1e-4) - 1, 0, gens.length - 1);
        const since = T - ticks[g];
        const pop = OM.ease.outExpo(OM.clamp(since / 0.08));
        const kick = OM.pulse(KICKS, T, 0.1);
        const cur = gens[g];
        // The screen's edge closes in from the frame on the die-off.
        const inset = (1 - OM.ease.outCubic(out)) * 320;
        const ex0 = SCR.x - inset, ey0 = SCR.y - inset, ex1 = SCR.x + SCR.w + inset, ey1 = SCR.y + SCR.h + inset;
        if (dark > 0) {
          ctx.globalAlpha = dark;
          ctx.fillStyle = th.bg;
          ctx.fillRect(SCR.x, SCR.y, SCR.w, SCR.h);
          ctx.globalAlpha = 1;
        }
        for (let n = 0; n < cur.live.length; n++) {
          const i = cur.live[n];
          const col = (i % W) + c0, row = Math.floor(i / W) + r0;
          const x = L.x0 + (col + 0.5) * L.cw, y = L.y0 + (row + 0.5) * L.ch;
          if (x < -20 || x > 1940 || y < -20 || y > 1100) continue;
          const inside = x > SCR.x && x < SCR.x + SCR.w && y > SCR.y && y < SCR.y + SCR.h;
          if (out > 0 && !inside && (x < ex0 || x > ex1 || y < ey0 || y > ey1 || out >= 1)) continue;
          let col0;
          if (cur.pins[n]) {
            const a = T - born[i];
            col0 = OM.mix(ink.hover, ink.crest, Math.max(Math.exp(-a / 0.18), kick * 0.6));
          } else col0 = OM.mix(AGE[Math.min(cur.ages[n], AGE.length - 1)], ink.crest, kick * 0.35);
          ctx.globalAlpha = inside ? 1 - dark : 1;
          ctx.fillStyle = col0;
          if (cur.ages[n] === 0 && !cur.pins[n] && pop < 1) {
            const k = 0.35 + 0.65 * pop;
            ctx.fillRect(L.x0 + (col + 0.5 - k / 2) * L.cw, L.y0 + (row + 0.5 - k / 2) * L.ch, k * L.cw, k * L.ch);
          } else OM.cell(ctx, L, col, row, dpr);
        }
        ctx.globalAlpha = 1;
        // The screen's border draws in around what is left.
        if (out > 0) {
          ctx.globalAlpha = OM.prog(T, DIE + 0.1, DIE + 0.35);
          ctx.strokeStyle = ink.mid;
          ctx.lineWidth = 2;
          ctx.strokeRect(321, 141, 1278, 798);
          ctx.globalAlpha = 1;
        }
      },
      release: () => c.release(),
    };
  },
});
