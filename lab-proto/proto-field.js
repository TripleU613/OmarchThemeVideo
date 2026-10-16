// Prototype: the homepage hero, ported. Drifting dithered field around the
// banded wordmark, cells snapped to the shared lattice.
OM.scene({
  id: 'proto-field',
  build(el) {
    const cv = document.createElement('canvas');
    cv.className = 'om-fill';
    el.appendChild(cv);
    const c = OM.canvas(cv, { alpha: false });
    const th = OM.theme('tokyo-night');
    const ink = { dim: th['field-dim'], mid: th['field-mid'], lit: th['field-lit'], hover: th['field-hover'], crest: th['field-crest'] };
    const L = OM.lattice({ wordWidth: 1180, wordX: (1920 - 1180) / 2, wordY: 330 });
    const word = OM.WORDMARK;
    return {
      render(t) {
        const ctx = c.ensure();
        const dpr = c.dpr;
        ctx.fillStyle = th['field-bg'];
        ctx.fillRect(0, 0, 1920, 1080);
        for (let r = 0; r < L.rows; r++) {
          const row = L.rMin + r;
          const y = L.y0 + (row + 0.5) * L.ch;
          for (let ci = 0; ci < L.cols; ci++) {
            const col = L.cMin + ci;
            if (row >= 0 && row < word.h && col >= 0 && col < word.w && word.rows[row][col] === '1') continue;
            const x = L.x0 + (col + 0.5) * L.cw;
            const nx = (x / 1920) * 2 - 1, ny = (y / 1080) * 2 - 1;
            const rr = Math.sqrt(nx * nx + ny * ny * 0.82);
            const eased = OM.clamp((rr - 0.42) / 0.85);
            const shade = eased * eased * OM.clamp((y - 24) / 130, 0.16, 1);
            if (shade <= 0.002) continue;
            const u = col / 9, v = row / 9;
            const base = 0.6 * OM.heroNoise(u + t * 0.14, v - t * 0.055) + 0.4 * OM.heroNoise(u * 0.55 - t * 0.08, v * 0.55 + t * 0.06);
            const twinkle = 0.5 + 0.5 * Math.sin(t * 1.1 + OM.heroJitter[(row * 37 + col * 11) & 4095] * 6.283);
            const lum = shade * (0.3 + 0.52 * base * base + 0.18 * twinkle) * 0.62;
            if (lum <= OM.threshold(col, row)) continue;
            ctx.fillStyle = ink.dim;
            OM.cell(ctx, L, col, row, dpr);
          }
        }
        for (let row = 0; row < word.h; row++) {
          ctx.fillStyle = ink[OM.BANDS[row]];
          for (let col = 0; col < word.w; col++) if (word.rows[row][col] === '1') OM.cell(ctx, L, col, row, dpr);
        }
      },
      release: () => c.release(),
    };
  },
});
