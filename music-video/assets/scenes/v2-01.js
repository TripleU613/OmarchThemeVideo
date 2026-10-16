// Verse 2 kit (OM.v2), shared by v2-01..v2-08, which load after this file:
// canvas window tiles in Tokyo Night, the empty desk state the v2-01..v2-04 cuts
// share, and runtime word layout in JetBrains Mono ExtraBold.
//
// v2-01 · Magnetic snap. The incoming screen is the first window: on the first
// word it snaps into the grid carrying that word. The other windows lie around
// like dropped cards; each is pulled in, accelerating, and clicks into its tile
// exactly on its word's onset, the word lit inside it. The downbeats ring the
// grid; the words clear and the empty grid is the cut into v2-02.
OM.ownWords.add('v2-01');
(() => {
  const FONT = "800 100px 'JetBrains Mono'";
  window.__hf = window.__hf || {};
  window.__hf.buildReady = window.__hf.buildReady || {};
  window.__hf.buildReady['v2-type'] = document.fonts.load(FONT);

  const ink = () => OM.fieldInks('tokyo-night');
  const th = () => OM.theme('tokyo-night');
  const rgba = (hex, a) => {
    const [r, g, b] = OM.rgb(hex);
    return `rgba(${r},${g},${b},${a})`;
  };
  /** A soft elliptical pool of light. */
  const pool = (ctx, x, y, rx, ry, color, a) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1, ry / rx);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
    g.addColorStop(0, rgba(color, a));
    g.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = g;
    ctx.fillRect(-rx, -rx, 2 * rx, 2 * rx);
    ctx.restore();
  };

  // Font metrics per 1px of font size, re-measured until the font is in.
  let MET = null;
  const met = () => {
    if (MET && MET.ok) return MET;
    const m = document.createElement('canvas').getContext('2d');
    m.font = FONT;
    MET = { adv: m.measureText('M').width / 100, cap: m.measureText('H').actualBoundingBoxAscent / 100 || 0.73, ok: document.fonts.check(FONT) };
    return MET;
  };
  const fontOf = (size) => `800 ${size.toFixed(2)}px 'JetBrains Mono'`;

  /**
   * Lay out words in centred rows: cap height `cap` px, rows no wider than maxW
   * (shrinking only if one word alone is wider). Returns per-word boxes.
   */
  const layout = (words, { cap = 64, maxW = 1600, cx = 960, cy = 540, lead = 1.6 } = {}) => {
    const M = met();
    const longest = Math.max(1, ...words.map((w) => w.text.length));
    const size = Math.min(cap / M.cap, maxW / (longest * M.adv));
    const A = M.adv * size, capPx = M.cap * size, lh = capPx * lead;
    const rows = [];
    let cur = [], len = 0;
    words.forEach((w, i) => {
      const gap = cur.length && w.space !== false ? 1 : 0;
      if (cur.length && (len + gap + w.text.length) * A > maxW) { rows.push(cur); cur = []; len = 0; }
      len += (cur.length && w.space !== false ? 1 : 0) + w.text.length;
      cur.push(i);
    });
    if (cur.length) rows.push(cur);
    const at = [];
    rows.forEach((row, r) => {
      const n = row.reduce((s, i, j) => s + words[i].text.length + (j && words[i].space !== false ? 1 : 0), 0);
      let x = cx - (n * A) / 2;
      const base = cy - ((rows.length - 1) * lh) / 2 + capPx / 2 + r * lh;
      row.forEach((i, j) => {
        if (j && words[i].space !== false) x += A;
        const w = words[i].text.length * A;
        at[i] = { x, base, w, row: r, cx: x + w / 2, cy: base - capPx / 2 };
        x += w;
      });
    });
    return { size, A, capPx, lh, rows: rows.length, at, font: fontOf(size) };
  };
  /** One word fitted into a box: cap height up to `cap`, centred. */
  const fitWord = (text, cx, cy, maxW, cap = 72) => layout([{ text, space: false }], { cap, maxW, cx, cy });

  /** Draw a word centred on (cx, cy) at scale s, colour c. */
  const drawWord = (ctx, text, cx, cy, L, color, { s = 1, alpha = 1 } = {}) => {
    if (!text || alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(cx, cy);
    ctx.scale(s, s);
    ctx.font = L.font;
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(text, 0, L.capPx / 2);
    ctx.restore();
  };

  // The tiles: 3 + 3 for six windows, 4 + 3 for seven.
  const GO = 36, GI = 24;
  const grid = (n) => {
    const per = n <= 6 ? [Math.ceil(n / 2), Math.floor(n / 2)] : [4, n - 4];
    const h = (1080 - 2 * GO - GI) / 2;
    const out = [];
    per.forEach((c, r) => {
      const w = (1920 - 2 * GO - (c - 1) * GI) / c;
      for (let k = 0; k < c; k++) out.push({ x: GO + k * (w + GI), y: GO + r * (h + GI), w, h });
    });
    return out;
  };
  const lerpRect = (a, b, e) => ({ x: OM.lerp(a.x, b.x, e), y: OM.lerp(a.y, b.y, e), w: OM.lerp(a.w, b.w, e), h: OM.lerp(a.h, b.h, e) });

  /** A window tile: face, 2px border, a small prompt glyph top left. Pose rotates/scales about its centre. */
  const win = (ctx, r, { border, face, alpha = 1, rot = 0, s = 1, x = 0, y = 0, prompt = true } = {}) => {
    const T = th();
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(r.x + r.w / 2 + x, r.y + r.h / 2 + y);
    if (rot) ctx.rotate(rot);
    if (s !== 1) ctx.scale(s, s);
    ctx.fillStyle = border || T['border-strong'];
    ctx.fillRect(-r.w / 2, -r.h / 2, r.w, r.h);
    ctx.fillStyle = face || T.bg;
    ctx.fillRect(-r.w / 2 + 2, -r.h / 2 + 2, r.w - 4, r.h - 4);
    if (prompt) {
      ctx.fillStyle = T['text-muted'];
      ctx.fillRect(-r.w / 2 + 22, -r.h / 2 + 24, 10, 10);
      ctx.fillStyle = T.brand;
      ctx.fillRect(-r.w / 2 + 40, -r.h / 2 + 24, 6, 10);
    }
    ctx.restore();
  };
  /** The empty desk the v2-01..v2-04 cuts share: n settled tiles, plain borders. */
  const still = (ctx, n) => {
    ctx.fillStyle = ink().bg;
    ctx.fillRect(0, 0, 1920, 1080);
    for (const r of grid(n)) win(ctx, r);
  };
  /** A rectangular ring around r, grown by g px, of thickness w. */
  const ring = (ctx, r, g, w, color, a) => {
    if (a <= 0) return;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.strokeStyle = color;
    ctx.lineWidth = w;
    ctx.strokeRect(r.x - g, r.y - g, r.w + 2 * g, r.h + 2 * g);
    ctx.restore();
  };
  /** Hits within a window, from the beat grid (falls back to the given list). */
  const hitsIn = (list, a, b, fallback) => {
    const h = (list || []).filter((x) => x >= a && x < b);
    return h.length ? h : fallback;
  };

  OM.v2 = { FONT, ink, th, rgba, pool, met, fontOf, layout, fitWord, drawWord, grid, lerpRect, win, still, ring, hitsIn, HOLD_IN: 0.04, HOLD_OUT: 0.07 };
})();

OM.scene({
  id: 'v2-01',
  build(el, { start, duration }) {
    const V = OM.v2;
    const cv = document.createElement('canvas');
    cv.className = 'om-fill';
    el.appendChild(cv);
    const c = OM.canvas(cv, { alpha: false });
    const ink = V.ink(), th = V.th();
    const sung = OM.sung('v2-01');
    const N = sung.length;
    const on = sung.map((w) => w.t0);
    const END = start + duration;
    const SLOT = V.grid(N);
    const SCREEN = { x: 320, y: 140, w: 1280, h: 800 };
    const DB = V.hitsIn(OM.T && OM.T.downbeats, start, END, [116.518, 118.654]);
    const PULL = 0.11; // the magnetic pull into the tile, accelerating to the click
    const CL0 = END - 0.24, CL1 = END - 0.09; // the words clear
    const rng = OM.rng(2101);
    // Dropped cards: where each lies, the edge it slides in from, its drift.
    const CARD = SLOT.map((r, k) => {
      const a = rng() * Math.PI * 2;
      return {
        cx: 240 + rng() * 1440, cy: 200 + rng() * 680, rot: (rng() - 0.5) * 0.5, s: 0.55 + rng() * 0.2,
        fx: Math.cos(a) * 1500, fy: Math.sin(a) * 1000, ph: rng() * 6.28, at: start + 0.04 + k * 0.035,
      };
    });
    let fits = null;
    const fit = () => SLOT.map((r, k) => V.fitWord((sung[k] && sung[k].text) || '', r.x + r.w / 2, r.y + r.h / 2 + 10, r.w - 56, 112));

    /** A card's loose pose at T: sliding in, then drifting where it fell. */
    const loose = (k, T) => {
      const C = CARD[k], r = SLOT[k];
      const e = OM.ease.outCubic(OM.prog(T, C.at, C.at + 0.4));
      const d = T - start;
      return {
        x: C.cx + C.fx * (1 - e) + 14 * Math.sin(d * 1.3 + C.ph) - (r.x + r.w / 2),
        y: C.cy + C.fy * (1 - e) + 10 * Math.cos(d * 1.1 + C.ph) - (r.y + r.h / 2),
        rot: C.rot + 0.03 * Math.sin(d * 0.9 + C.ph), s: C.s,
      };
    };

    return {
      render(t, T) {
        const ctx = c.ensure();
        const dpr = c.dpr;
        if (T < start + V.HOLD_IN) return OM.handoff('screen', ctx, T, dpr);
        if (T >= END - V.HOLD_OUT) return V.still(ctx, N);
        if (!fits || !V.met().ok) fits = fit();
        ctx.fillStyle = ink.bg;
        ctx.fillRect(0, 0, 1920, 1080);
        const db = OM.pulse(DB, T, 0.1);
        const clear = OM.ease.inCubic(OM.prog(T, CL0, CL1));
        const latest = OM.hitCount(on, T) - 1;

        // Loose cards first (behind), then the tiles that have clicked in.
        const order = [...SLOT.keys()].sort((a, b) => (T >= on[a] ? 1 : 0) - (T >= on[b] ? 1 : 0));
        for (const k of order) {
          const r = SLOT[k];
          const landed = T >= on[k];
          if (k === 0) {
            // The screen itself: it is window 0, and snaps into its tile from the first word.
            const e = OM.ease.outQuint(OM.prog(T, start + V.HOLD_IN, on[0] + 0.14));
            const rr = V.lerpRect(SCREEN, r, e);
            const brd = landed ? OM.mix(ink.crest, k === latest ? th.brand : th['border-strong'], OM.clamp((T - on[0]) / 0.3)) : ink.mid;
            V.win(ctx, rr, { border: OM.mix(brd, th['border-strong'], clear), prompt: e > 0.5 });
            if (landed) drawIn(ctx, k, T, rr, clear);
            continue;
          }
          const L = loose(k, T);
          if (!landed && T < on[k] - PULL) {
            V.win(ctx, r, { ...L, alpha: 0.9, border: th['border-subtle'] || th['border-strong'] });
            continue;
          }
          // The pull: accelerating from the loose pose into the tile, clicking on the onset.
          const p = OM.ease.inCubic(OM.prog(T, on[k] - PULL, on[k]));
          const age = T - on[k];
          const bump = landed ? 0.035 * Math.exp(-age / 0.06) * Math.cos(age * 60) : 0;
          V.win(ctx, r, {
            x: L.x * (1 - p), y: L.y * (1 - p), rot: L.rot * (1 - p), s: OM.lerp(L.s, 1, p) + bump,
            border: landed ? OM.mix(OM.mix(ink.crest, k === latest ? th.brand : th['border-strong'], OM.clamp(age / 0.3)), th['border-strong'], clear) : th['border-strong'],
          });
          if (landed) drawIn(ctx, k, T, r, clear);
        }
        // The clicks: a crest ring snaps out of each tile as it lands; downbeats ring every landed tile.
        SLOT.forEach((r, k) => {
          const age = T - on[k];
          if (age >= 0 && age < 0.3) V.ring(ctx, r, 4 + 26 * OM.ease.outCubic(age / 0.3), 3, ink.crest, 1 - age / 0.3);
          if (age >= 0 && db > 0.05) V.ring(ctx, r, 6, 2, ink.lit, db * 0.8 * (1 - clear));
        });
      },
      release: () => c.release(),
    };

    function drawIn(ctx, k, T, r, clear) {
      const F = fits[k];
      const age = T - on[k];
      const s = 1 + 0.16 * Math.exp(-age / 0.07);
      const col = OM.mix(ink.crest, th.text, OM.clamp(age / 0.35));
      V.drawWord(ctx, sung[k].text, r.x + r.w / 2, r.y + r.h / 2 + 10, F, col, { s, alpha: 1 - clear });
    }
  },
});
