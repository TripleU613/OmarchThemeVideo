// The kit: shared materials every scene paints with. The hero renderer is a
// port of omarchy-site's HeroPixelField draw(); the ttfx painters follow
// src/lib/etch.ts (lattice) and assets/js/wte/paint.js (glyphs). These are
// materials, not moves: each scene animates them in its own way.
(function () {
  const OM = window.OM;
  const T = OM.T;

  // ---------- timing ----------
  const lineById = {};
  if (T) for (const l of T.lines) lineById[l.id] = l;
  /** A lyric line's timing (global seconds): { start, end, words: [[s,e]...] }. */
  OM.line = (id) => lineById[id];
  /** Global start of word k (0-based) of a line; falls back to the line start. */
  OM.word = (id, k) => {
    const l = lineById[id];
    const w = l && l.words[Math.min(k, l.words.length - 1)];
    return w ? w[0] : l.start;
  };
  /** Every sung word's onset (global seconds) for a line: the hits a scene must land. */
  OM.words = (id) => lineById[id].words.map((w, k) => (w ? w[0] : OM.word(id, k)));
  /**
   * Word-sync state at global time T: which word is sounding (index, -1 before
   * the first), seconds since its onset, and a 0..1 hit that peaks on each
   * onset and decays (half-life seconds). Scenes key their beats to this.
   */
  OM.wordAt = (id, T, half = 0.14) => {
    const on = OM.words(id);
    let k = -1;
    for (let i = 0; i < on.length; i++) if (on[i] <= T) k = i;
    const since = k < 0 ? Infinity : T - on[k];
    return { index: k, count: on.length, since, hit: k < 0 ? 0 : Math.pow(0.5, since / half), onsets: on };
  };
  /** Beat times (global) within [a, b). */
  OM.beatsIn = (a, b) => T.beats.filter((x) => x >= a && x < b);
  OM.downbeatsIn = (a, b) => T.downbeats.filter((x) => x >= a && x < b);
  /** Seconds per beat. */
  OM.SPB = 60 / (T ? T.bpm : 112.3);
  /** Most recent hit at or before t, or null. */
  OM.lastHit = (hits, t) => {
    let h = null;
    for (const x of hits) if (x <= t) h = x;
    return h;
  };
  /** 1 on a hit, decaying exponentially after it (seconds half-life). */
  OM.pulse = (hits, t, half = 0.12) => {
    const h = OM.lastHit(hits, t);
    return h === null ? 0 : Math.pow(0.5, (t - h) / half);
  };
  /** Count of hits at or before t. */
  OM.hitCount = (hits, t) => hits.reduce((n, x) => n + (x <= t ? 1 : 0), 0);

  // ---------- audio features (analysis/features.py) ----------
  const A = window.OM_AUDIO;
  const unpack = (b64) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const SPEC = A ? unpack(A.spectrum) : null, VOX = A ? unpack(A.vocal) : null, KICK = A ? unpack(A.kick) : null;
  /** The song at global time t: { bands: Float32Array(16), vocal, kick }, all 0..1, linearly interpolated. */
  OM.audio = (t) => {
    const out = { bands: new Float32Array(16), vocal: 0, kick: 0 };
    if (!A) return out;
    const f = OM.clamp(t * A.fps, 0, A.frames - 1.001);
    const i = Math.floor(f), m = f - i;
    for (let b = 0; b < 16; b++) out.bands[b] = (SPEC[i * 16 + b] * (1 - m) + SPEC[(i + 1) * 16 + b] * m) / 255;
    out.vocal = (VOX[i] * (1 - m) + VOX[i + 1] * m) / 255;
    out.kick = (KICK[i] * (1 - m) + KICK[i + 1] * m) / 255;
    return out;
  };

  // ---------- the beat jiggle ----------
  // One small bump per beat while the drums play, for scenes that opt in by
  // feeding it into their own camera or one element. The analysis grid and the
  // drum events both sit on 23 ms analysis frames, and the grid runs 46 ms late
  // against the drums, so each bump peaks on the grid smoothed into an even
  // pulse (a local linear fit over 7 beats) and moved 46 ms early: the closest
  // fit to the measured kicks and snares. Its size follows the beat's drum hit,
  // and it is 0 wherever the drums are out. No bump comes within two frames of
  // a cut, so cut frames stay exact.
  const JIG = { RISE: 0.024, FALL: 0.17, GUARD: 0.034, LATE: 0.046 };
  let onsets = null, bumps = null;
  /** Each grid beat's drum onset: the grid smoothed into an even pulse and moved 46 ms early. */
  const beatOnsets = () => onsets || (onsets = (T ? T.beats : []).map((b, i, B) => {
    let n = 0, sx = 0, sy = 0, sxx = 0, sxy = 0;
    for (let j = Math.max(0, i - 3); j <= Math.min(B.length - 1, i + 3); j++, n++) {
      sx += j; sy += B[j]; sxx += j * j; sxy += j * B[j];
    }
    const slope = (n * sxy - sx * sy) / (n * sxx - sx * sx);
    return sy / n + slope * (i - sx / n) - JIG.LATE;
  }));
  /**
   * Where the drums really hit for a time taken from the beat grid (OM.T.beats,
   * OM.T.downbeats, OM.beatsIn, or a number copied from them): that beat's
   * onset, as the jiggle uses it. Any other time comes back unchanged.
   */
  OM.beatOnset = (t) => {
    if (!T) return t;
    const B = T.beats;
    let lo = 0, hi = B.length - 1;
    while (lo < hi) {
      const m = (lo + hi) >> 1;
      if (B[m] < t) lo = m + 1; else hi = m;
    }
    const i = lo > 0 && Math.abs(B[lo - 1] - t) < Math.abs(B[lo] - t) ? lo - 1 : lo;
    return Math.abs(B[i] - t) < 0.002 ? beatOnsets()[i] : t;
  };
  /** The bumps, built on first use: frame-need.js and the scene sections load after this file. */
  function jigBumps() {
    const N = window.OM_FRAME_NEED;
    if (!T || !KICK) return [];
    const B = T.beats, ev = [...N.kick, ...N.snare], onset = beatOnsets();
    // Beat strength: the low-band onset strength at the hit, or the loudest kick or snare event on it.
    const s = onset.map((t) => {
      let m = 0;
      for (let f = Math.round((t - 0.03) * A.fps); f <= Math.round((t + 0.08) * A.fps); f++) m = Math.max(m, KICK[OM.clamp(f, 0, A.frames - 1)] / 255);
      for (const e of ev) if (Math.abs(e[0] - t) <= 0.035) m = Math.max(m, OM.clamp(e[1] / 0.45));
      return m;
    });
    const median = (xs) => xs.slice().sort((a, b) => a - b)[xs.length >> 1];
    const cuts = [...document.querySelectorAll('section.scene[data-start]')].map((el) => parseFloat(el.dataset.start)).filter((c) => c > 0);
    const downs = new Set(T.downbeats.map((d) => Math.round(d * 1000)));
    const out = [];
    for (let i = 0; i < B.length; i++) {
      const t = onset[i], down = downs.has(Math.round(B[i] * 1000));
      // Drums in play: the median beat strength around this beat.
      const g = median(s.slice(Math.max(0, i - 3), i + 4));
      const w = OM.smooth(OM.clamp((g - 0.2) / 0.12)) * (0.55 + 0.45 * OM.clamp((s[i] - 0.2) / 0.4)) * (down ? 1 : 0.85);
      if (w < 0.05 || t + JIG.FALL > T.duration) continue;
      if (cuts.some((c) => c > t - JIG.RISE - JIG.GUARD && c < t + JIG.FALL + JIG.GUARD)) continue;
      out.push({ t, w, k: i, down });
    }
    return out;
  }
  /** The bumps, or none while frame-need.js is absent (NO_FRAMES drafts leave it out). */
  const allBumps = () => bumps || (window.OM_FRAME_NEED ? (bumps = jigBumps()) : []);
  /** The bump around global time `time`, or null. */
  const bumpAt = (time) => {
    const bs = allBumps();
    let lo = 0, hi = bs.length - 1, r = -1;
    while (lo <= hi) {
      const m = (lo + hi) >> 1;
      if (bs[m].t - JIG.RISE <= time) { r = m; lo = m + 1; } else hi = m - 1;
    }
    return r >= 0 && time < bs[r].t + JIG.FALL ? bs[r] : null;
  };
  /** A bump's shape at d seconds from its onset: a raised-cosine rise to 1 on the onset, then a smooth settle to exactly 0. */
  const bumpShape = (d) => {
    if (d < -JIG.RISE || d >= JIG.FALL) return 0;
    if (d < 0) return 0.5 - 0.5 * Math.cos((Math.PI * (d + JIG.RISE)) / JIG.RISE);
    const u = d / JIG.FALL;
    return (1 - u) ** 4 * (1 + 4 * u);
  };
  /** True when a bump falls within 0.15 s of one of the scene's own hits, so it is left out whole. */
  const taken = (b, own) => !!own && own.some((h) => Math.abs(h - b.t) < 0.15);
  /**
   * The beat jiggle at global time `time`, 0..1: 1 on a strong downbeat's drum
   * onset, settled within about 0.12 s. `own` (optional) lists the scene's own
   * hit times; a bump on one of them is dropped whole so the two never stack.
   */
  OM.jiggle = (time, own) => {
    const b = bumpAt(time);
    return b && !taken(b, own) ? b.w * bumpShape(time - b.t) : 0;
  };
  /** The same jiggle with its beat: { v, k (beat index, for alternating sides), down (on a downbeat) }. */
  OM.jiggle.beat = (time, own) => {
    const b = bumpAt(time);
    return b && !taken(b, own) ? { v: b.w * bumpShape(time - b.t), k: b.k, down: b.down } : { v: 0, k: -1, down: false };
  };
  /** Every bump { t, w, k, down }, for checks. */
  OM.jiggle.bumps = () => allBumps().slice();
  OM.jiggle.SHAPE = JIG;

  // ---------- placeholder slate for scenes not built yet ----------
  OM.slate = ({ id, device, theme, line }) =>
    OM.scene({
      id,
      build(el) {
        const d = document.createElement('div');
        d.className = 'om-slate';
        const b = document.createElement('b');
        b.textContent = id + (line ? '' : '  (instrumental)');
        const s1 = document.createElement('span');
        s1.textContent = device;
        const s2 = document.createElement('span');
        s2.textContent = 'theme: ' + theme;
        d.append(b, s1, s2);
        el.appendChild(d);
        return {};
      },
    });

  // ---------- the home lattice ----------
  /** The film's shared lattice: the wordmark 1180px wide, centered (cells ~14.6 x 14.3 px). */
  OM.HOME = OM.lattice({ wordWidth: 1180, wordX: 370, wordY: 404 });
  /** Lattice cell under a CSS-px point. */
  OM.cellAt = (L, x, y) => ({ col: Math.floor((x - L.x0) / L.cw), row: Math.floor((y - L.y0) / L.ch) });

  // ---------- the hero field ----------
  const rampCache = new Map();
  /** The hero's radial clearing around the word, per cell (HeroPixelField measure()). */
  function heroRamp(L, mode) {
    const key = `${L.x0},${L.y0},${L.cw},${L.cols},${L.rows},${mode}`;
    if (rampCache.has(key)) return rampCache.get(key);
    const ramp = new Float32Array(L.cols * L.rows);
    for (let r = 0; r < L.rows; r++) {
      const y = L.y0 + (L.rMin + r + 0.5) * L.ch;
      const ny = (y / L.height) * 2 - 1;
      const clear = mode === 'hero' ? OM.clamp((y - 24) / 130, 0.16, 1) : 0.3;
      for (let c = 0; c < L.cols; c++) {
        const x = L.x0 + (L.cMin + c + 0.5) * L.cw;
        const nx = (x / L.width) * 2 - 1;
        const rr = Math.sqrt(nx * nx + ny * ny * 0.82);
        const eased = OM.clamp((rr - 0.42) / 0.85);
        ramp[r * L.cols + c] = (mode === 'hero' ? eased * eased : 1) * clear;
      }
    }
    rampCache.set(key, ramp);
    return ramp;
  }
  OM.heroRamp = heroRamp;

  /** Field inks of a theme as an object (bg, dim, mid, lit, hover, crest). */
  OM.fieldInks = (id) => {
    const t = OM.theme(id);
    return { bg: t['field-bg'], dim: t['field-dim'], mid: t['field-mid'], lit: t['field-lit'], hover: t['field-hover'], crest: t['field-crest'] };
  };

  /** Logo-stamp coverage at a point (HeroPixelField stampAt). */
  OM.stampAt = (stamps, cx, cy) => {
    let amp = 0;
    for (const s of stamps) {
      const lx = Math.floor((cx - s.x) / s.cellPx + 7.5);
      const ly = Math.floor((cy - s.y) / s.cellPx + 7.5);
      if (lx < 0 || ly < 0 || lx >= 15 || ly >= 15) continue;
      if (OM.LOGO.rows[ly][lx] === '1' && s.amp > amp) amp = s.amp;
    }
    return amp;
  };
  /**
   * A click stamp `age` seconds after release (HeroPixelField launch/ping):
   * grows from `from` to `to` cells per logo pixel and fades as it blooms.
   */
  OM.stamp = (x, y, age, L, { charge = 0.2, life, scale = 1 } = {}) => {
    const from = 0.45 + 1.6 * charge;
    const to = (from + 1.0 + 3.2 * charge) * scale;
    const span = life ?? 0.65 + 0.55 * charge;
    const a = age / span;
    if (a < 0 || a >= 1) return null;
    const grow = 1 - Math.pow(1 - a, 3);
    return { x, y, cellPx: L.cw * (from + (to - from) * grow), amp: Math.pow(1 - a, 1.7) };
  };
  /** The hero sprite's roaming path (HeroPixelField draw(), in CSS px). */
  OM.spritePath = (t, w = 1920, h = 1080, phase = 0) => {
    const ts = t + phase;
    const rx = 0.44 * (1 + 0.1 * Math.sin(ts * 0.11));
    const ry = 0.38 * (1 + 0.1 * Math.sin(ts * 0.09 + 2));
    return { x: w * (0.5 + rx * Math.sin(ts * 0.65)), y: h * (0.48 + ry * Math.sin(ts * 0.39 + 1.1)) };
  };

  /**
   * Paint the homepage hero field at time t (seconds of drift).
   * opts:
   *   inks       field inks (OM.fieldInks)
   *   L          lattice (OM.lattice)
   *   mode       'hero' (cleared around the word) | 'flat' (even density)
   *   word       true draws the banded wordmark, 'void' keeps its cells dark, false ignores it
   *   gain       luminance multiplier (1 = the site)
   *   mask(col,row) optional 0..1 multiplier per cell
   *   glows      [{x, y, strength, reach}] in CSS px
   *   stamps     [OM.stamp(...)] live click stamps
   *   bands      Float32Array of 16 spectrum levels 0..1 (mirrored from center)
   *   wordInk(row, col, base) optional override for wordmark cell ink
   *   bg         false to skip clearing
   *   levels     >0 lets bright cells climb the inks by how far they clear the threshold
   */
  OM.hero = (ctx, t, dpr, opts) => {
    const { inks, L } = opts;
    const mode = opts.mode || 'hero';
    const gain = opts.gain ?? 1;
    const ramp = heroRamp(L, mode);
    const word = OM.WORDMARK;
    const glows = opts.glows || [];
    const stamps = opts.stamps || [];
    const bands = opts.bands;
    if (opts.bg !== false) {
      ctx.fillStyle = inks.bg;
      ctx.fillRect(0, 0, L.width, L.height);
    }
    for (let r = 0; r < L.rows; r++) {
      const row = L.rMin + r;
      const cy = L.y0 + (row + 0.5) * L.ch;
      for (let c = 0; c < L.cols; c++) {
        const col = L.cMin + c;
        const inWord = row >= 0 && row < word.h && col >= 0 && col < word.w && word.rows[row][col] === '1';
        if (inWord && opts.word !== false) continue;
        const shade = ramp[r * L.cols + c] * (opts.mask ? opts.mask(col, row) : 1);
        const cx = L.x0 + (col + 0.5) * L.cw;
        let lum = 0;
        if (shade > 0.002) {
          const u = col / 9, v = row / 9;
          const base = 0.6 * OM.heroNoise(u + t * 0.14, v - t * 0.055) + 0.4 * OM.heroNoise(u * 0.55 - t * 0.08, v * 0.55 + t * 0.06);
          const twinkle = 0.5 + 0.5 * Math.sin(t * 1.1 + OM.heroJitter[(row * 37 + col * 11) & 4095] * 6.283);
          lum = shade * (0.3 + 0.52 * base * base + 0.18 * twinkle) * 0.62 * gain;
        }
        let glow = 0;
        for (const g of glows) {
          const dx = cx - g.x, dy = cy - g.y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < g.reach) {
            const f = 1 - d / g.reach;
            const a = f * f * g.strength;
            if (a > glow) glow = a;
          }
        }
        lum += glow * 0.6;
        let wave = 0;
        if (stamps.length) {
          wave = OM.stampAt(stamps, cx, cy);
          lum += wave * 1.15;
        }
        let spec = 0;
        if (bands && shade > 0.002) {
          const across = (c + 0.5) / L.cols;
          const side = Math.abs(across - 0.5) * 2;
          const pos = (1 - side) * bands.length - 0.5;
          const b0 = OM.clamp(Math.floor(pos), 0, bands.length - 1), b1 = Math.min(bands.length - 1, b0 + 1);
          const m = OM.clamp(pos - b0);
          const raw = bands[b0] * (1 - m) + bands[b1] * m;
          const level = Math.max(0, (raw - 0.08) / 0.92);
          const fromBottom = L.rows - 1 - r;
          const tall = level * L.rows * 0.92;
          if (level > 0 && fromBottom < tall) {
            spec = level * Math.pow(1 - fromBottom / tall, 0.85);
            lum += spec * 0.7 * Math.min(1, shade * 3);
          }
        }
        const th = OM.threshold(col, row);
        if (lum <= th) continue;
        let heat = Math.max(glow, wave, spec * 0.5);
        if (opts.levels) heat = Math.max(heat, (lum - th) * opts.levels);
        ctx.fillStyle = heat > 0.34 ? inks.lit : heat > 0.1 ? inks.mid : inks.dim;
        OM.cell(ctx, L, col, row, dpr);
      }
    }
    if (opts.word === true) OM.paintWord(ctx, L, dpr, inks, { stamps, glows, wordInk: opts.wordInk });
  };

  /**
   * The hero's lit field cells at time T, without drawing: [{ col, row, heat }]
   * with heat 0..1 by how far each clears its threshold. For scenes that lift
   * the exact field into 3D or particles.
   */
  OM.heroLit = (T, L, { mode = 'hero', gain = 1 } = {}) => {
    const ramp = heroRamp(L, mode);
    const word = OM.WORDMARK;
    const out = [];
    for (let r = 0; r < L.rows; r++) {
      const row = L.rMin + r;
      for (let c = 0; c < L.cols; c++) {
        const col = L.cMin + c;
        if (row >= 0 && row < word.h && col >= 0 && col < word.w && word.rows[row][col] === '1') continue;
        const shade = ramp[r * L.cols + c];
        if (shade <= 0.002) continue;
        const u = col / 9, v = row / 9;
        const base = 0.6 * OM.heroNoise(u + T * 0.14, v - T * 0.055) + 0.4 * OM.heroNoise(u * 0.55 - T * 0.08, v * 0.55 + T * 0.06);
        const twinkle = 0.5 + 0.5 * Math.sin(T * 1.1 + OM.heroJitter[(row * 37 + col * 11) & 4095] * 6.283);
        const lum = shade * (0.3 + 0.52 * base * base + 0.18 * twinkle) * 0.62 * gain;
        const th = OM.threshold(col, row);
        if (lum > th) out.push({ col, row, heat: OM.clamp((lum - th) * 3) });
      }
    }
    return out;
  };

  /** The resting wordmark in its band inks, lifted by stamps and glows like the site. */
  OM.paintWord = (ctx, L, dpr, inks, { stamps = [], glows = [], wordInk = null, rows = null } = {}) => {
    const word = OM.WORDMARK;
    for (let row = 0; row < word.h; row++) {
      if (rows && !rows(row)) continue;
      for (let col = 0; col < word.w; col++) {
        if (word.rows[row][col] !== '1') continue;
        const cx = L.x0 + (col + 0.5) * L.cw, cy = L.y0 + (row + 0.5) * L.ch;
        let crest = stamps.length ? OM.stampAt(stamps, cx, cy) : 0;
        for (const g of glows) {
          const dx = cx - g.x, dy = cy - g.y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < g.reach) {
            const f = 1 - d / g.reach;
            crest = Math.max(crest, f * f * g.strength);
          }
        }
        const base = inks[OM.BANDS[row]];
        let ink = crest > 0.45 ? inks.crest : crest > 0.12 ? inks.hover : base;
        if (wordInk) ink = wordInk(row, col, ink) || ink;
        ctx.fillStyle = ink;
        OM.cell(ctx, L, col, row, dpr);
      }
    }
  };

  // ---------- ttfx painters ----------
  /** The theme ink nearest in brightness to a packed 0xRRGGBB (HeroPixelField themeInk). */
  OM.nearestInk = (inks) => {
    const list = ['dim', 'mid', 'lit', 'hover', 'crest'].map((k) => {
      const [r, g, b] = OM.rgb(inks[k]);
      return { css: inks[k], l: (r * 299 + g * 587 + b * 114) / 255000 };
    });
    return (packed) => {
      const l = (((packed >> 16) & 255) * 299 + ((packed >> 8) & 255) * 587 + (packed & 255) * 114) / 255000;
      let best = list[0];
      for (const ink of list) if (Math.abs(ink.l - l) < Math.abs(best.l - l)) best = ink;
      return best.css;
    };
  };
  const LINES = { 0x2f: 'up', 0x2571: 'up', 0x5c: 'down', 0x2572: 'down', 0x7c: 'bar', 0x2502: 'bar', 0x2503: 'bar', 0x2d: 'dash', 0x2500: 'dash', 0x2501: 'dash', 0x5f: 'dash' };
  const Q = 0.5;
  const QUAD = { tl: [0, 0, Q, Q], tr: [Q, 0, Q, Q], bl: [0, Q, Q, Q], br: [Q, Q, Q, Q] };
  const PARTS = {
    0x2580: [[0, 0, 1, Q]], 0x2581: [[0, 7 / 8, 1, 1 / 8]], 0x2582: [[0, 6 / 8, 1, 2 / 8]], 0x2583: [[0, 5 / 8, 1, 3 / 8]],
    0x2584: [[0, Q, 1, Q]], 0x2585: [[0, 3 / 8, 1, 5 / 8]], 0x2586: [[0, 2 / 8, 1, 6 / 8]], 0x2587: [[0, 1 / 8, 1, 7 / 8]],
    0x2589: [[0, 0, 7 / 8, 1]], 0x258a: [[0, 0, 6 / 8, 1]], 0x258b: [[0, 0, 5 / 8, 1]], 0x258c: [[0, 0, Q, 1]],
    0x258d: [[0, 0, 3 / 8, 1]], 0x258e: [[0, 0, 2 / 8, 1]], 0x258f: [[0, 0, 1 / 8, 1]], 0x2590: [[Q, 0, Q, 1]],
    0x2591: [QUAD.tl], 0x2592: [QUAD.tl, QUAD.br], 0x2593: [QUAD.tl, QUAD.br, QUAD.tr], 0x2594: [[0, 0, 1, 1 / 8]],
    0x2595: [[7 / 8, 0, 1 / 8, 1]], 0x2596: [QUAD.bl], 0x2597: [QUAD.br], 0x2598: [QUAD.tl], 0x2599: [QUAD.tl, QUAD.bl, QUAD.br],
    0x259a: [QUAD.tl, QUAD.br], 0x259b: [QUAD.tl, QUAD.tr, QUAD.bl], 0x259c: [QUAD.tl, QUAD.tr, QUAD.br], 0x259d: [QUAD.tr],
    0x259e: [QUAD.tr, QUAD.bl], 0x259f: [QUAD.tr, QUAD.bl, QUAD.br],
  };
  function weightOf(sym) {
    const ch = String.fromCodePoint(sym);
    if (".,'`·".includes(ch)) return 0.12;
    if (':;^~"'.includes(ch)) return 0.2;
    if ('*+=<>()[]{}!?i l1'.includes(ch)) return 0.35;
    if ('#@%&$MW'.includes(ch)) return 0.7;
    return 0.5;
  }
  /**
   * Paint a ttfx frame onto the lattice the way the hero's etch does:
   * blocks as whole cells, slashes as thin strokes, other characters as
   * squares sized by their ink. `offset` maps frame cells to lattice cells.
   */
  OM.paintEtch = (ctx, L, dpr, frame, { inks, offset = { col: -6, row: -4 }, ink = null, alpha = 1 } = {}) => {
    const near = ink || OM.nearestInk(inks);
    const stroke = Math.max(1 / dpr, L.cw / 5);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.lineCap = 'butt';
    for (let r = 0; r < frame.h; r++) {
      for (let c = 0; c < frame.w; c++) {
        const i = r * frame.w + c;
        const sym = frame.symbols[i];
        if (sym === 32 || sym === 0 || frame.flags[i] & 32) continue;
        const col = c + offset.col, row = r + offset.row;
        const color = near(frame.fg[i] & 0xffffff, sym, row, col);
        const x = L.x0 + col * L.cw, y = L.y0 + row * L.ch;
        if (sym === frame.BLOCK) {
          ctx.fillStyle = color;
          OM.cell(ctx, L, col, row, dpr);
          continue;
        }
        if (PARTS[sym]) {
          ctx.fillStyle = color;
          for (const [px, py, pw, ph] of PARTS[sym]) ctx.fillRect(x + px * L.cw, y + py * L.ch, pw * L.cw, ph * L.ch);
          continue;
        }
        const line = LINES[sym];
        if (line) {
          ctx.strokeStyle = color;
          ctx.lineWidth = stroke;
          ctx.beginPath();
          if (line === 'bar') { ctx.moveTo(x + L.cw / 2, y); ctx.lineTo(x + L.cw / 2, y + L.ch); }
          else if (line === 'dash') { ctx.moveTo(x, y + L.ch / 2); ctx.lineTo(x + L.cw, y + L.ch / 2); }
          else if (line === 'down') { ctx.moveTo(x, y); ctx.lineTo(x + L.cw, y + L.ch); }
          else { ctx.moveTo(x, y + L.ch); ctx.lineTo(x + L.cw, y); }
          ctx.stroke();
          continue;
        }
        const size = L.cw * Math.sqrt(weightOf(sym));
        const low = sym === 0x2c || sym === 0x2e || sym === 0x5f;
        const high = sym === 0x27 || sym === 0x60 || sym === 0x22;
        ctx.fillStyle = color;
        ctx.fillRect(x + (L.cw - size) / 2, low ? y + L.ch - size : high ? y : y + (L.ch - size) / 2, size, size);
      }
    }
    ctx.restore();
  };

  /**
   * Paint a ttfx frame as terminal glyphs, the screensaver's way: block
   * elements as exact rects, everything else as JetBrains Mono characters.
   * cell = { w, h } in CSS px; origin = { x, y } of cell (0,0).
   */
  OM.paintGlyphs = (ctx, frame, { cell, origin, color = null, font = null }) => {
    ctx.save();
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.font = font || `${Math.round(cell.h / 1.2)}px 'JetBrains Mono'`;
    for (let r = 0; r < frame.h; r++) {
      for (let c = 0; c < frame.w; c++) {
        const i = r * frame.w + c;
        const sym = frame.symbols[i];
        if (sym === 32 || sym === 0 || frame.flags[i] & 32) continue;
        const x = origin.x + c * cell.w, y = origin.y + r * cell.h;
        const fg = frame.fg[i] & 0xffffff;
        ctx.fillStyle = color ? color(fg, sym, r, c) : '#' + fg.toString(16).padStart(6, '0');
        if (sym === 0x2588) { ctx.fillRect(x, y, cell.w + 0.5, cell.h + 0.5); continue; }
        if (PARTS[sym]) {
          for (const [px, py, pw, ph] of PARTS[sym]) ctx.fillRect(x + px * cell.w, y + py * cell.h, pw * cell.w + 0.5, ph * cell.h + 0.5);
          continue;
        }
        ctx.fillText(String.fromCodePoint(sym), x + cell.w / 2, y + cell.h / 2);
      }
    }
    ctx.restore();
  };

  /** The screensaver's ASCII wordmark (omarchy-site screensaver/index.html). */
  OM.ASCII_WORDMARK = [
    '                 ▄▄▄',
    ' ▄█████▄    ▄███████████▄    ▄███████   ▄███████   ▄███████   ▄█   █▄    ▄█   █▄',
    '███   ███  ███   ███   ███  ███   ███  ███   ███  ███   ███  ███   ███  ███   ███',
    '███   ███  ███   ███   ███  ███   ███  ███   ███  ███   █▀   ███   ███  ███   ███',
    '███   ███  ███   ███   ███ ▄███▄▄▄███ ▄███▄▄▄██▀  ███       ▄███▄▄▄███▄ ███▄▄▄███',
    '███   ███  ███   ███   ███ ▀███▀▀▀███ ▀███▀▀▀▀    ███      ▀▀███▀▀▀███  ▀▀▀▀▀▀███',
    '███   ███  ███   ███   ███  ███   ███ ██████████  ███   █▄   ███   ███  ▄██   ███',
    '███   ███  ███   ███   ███  ███   ███  ███   ███  ███   ███  ███   ███  ███   ███',
    ' ▀█████▀    ▀█   ███   █▀   ███   █▀   ███   ███  ███████▀   ███   █▀    ▀█████▀',
    '                                       ███   █▀',
  ];
  /** The ASCII wordmark padded into a terminal of cols x rows, centered. */
  OM.asciiScreen = (cols, rows) => {
    const art = OM.ASCII_WORDMARK;
    const w = Math.max(...art.map((l) => [...l].length));
    const top = Math.floor((rows - art.length) / 2), left = Math.floor((cols - w) / 2);
    const out = [];
    for (let r = 0; r < rows; r++) {
      const src = art[r - top];
      out.push(src === undefined ? ' '.repeat(cols) : (' '.repeat(left) + src).padEnd(cols, ' '));
    }
    return out.join('\n');
  };

  // ---------- the Omarchy desktop ----------
  /** Dwindle layout: each new window splits the previous one along its longer side. */
  OM.dwindle = (n, x, y, w, h, gap) => {
    const out = [];
    let rx = x, ry = y, rw = w, rh = h;
    for (let i = 0; i < n; i++) {
      if (i === n - 1) { out.push({ x: rx, y: ry, w: rw, h: rh }); break; }
      if (rw >= rh) {
        const half = (rw - gap) / 2;
        out.push({ x: rx, y: ry, w: half, h: rh });
        rx += half + gap; rw = half;
      } else {
        const half = (rh - gap) / 2;
        out.push({ x: rx, y: ry, w: rw, h: half });
        ry += half + gap; rh = half;
      }
    }
    return out;
  };

  /**
   * Paint an Omarchy-style desktop into a rect: theme ground, a waybar along
   * the top, dwindle-tiled windows with 2px borders (the active one in the
   * theme brand) and stylised content (terminal, editor, browser, monitor).
   * s scales every measurement (1 = a 1920x1080 desktop).
   */
  OM.desktop = (ctx, x, y, w, h, themeId, { windows = 3, active = 0, s = w / 1920, seed = 3, contents = null, bar = true } = {}) => {
    const th = OM.theme(themeId);
    const inks = OM.fieldInks(themeId);
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    ctx.fillStyle = th['bg-deep'];
    ctx.fillRect(x, y, w, h);
    const barH = bar ? 26 * s : 0;
    if (bar) {
      ctx.fillStyle = th.bg;
      ctx.fillRect(x, y, w, barH);
      ctx.font = `${Math.max(1, 13 * s)}px 'JetBrains Mono'`;
      ctx.textBaseline = 'middle';
      for (let i = 0; i < 5; i++) {
        ctx.fillStyle = i === active ? th.text : th['text-muted'];
        ctx.fillText(String(i + 1), x + (14 + i * 22) * s, y + barH / 2);
      }
      ctx.fillStyle = th.text;
      ctx.textAlign = 'center';
      ctx.fillText('20:41', x + w / 2, y + barH / 2);
      ctx.textAlign = 'left';
      ctx.fillStyle = th['text-secondary'];
      for (let i = 0; i < 4; i++) ctx.fillRect(x + w - (28 + i * 22) * s, y + barH / 2 - 5 * s, 10 * s, 10 * s);
    }
    const gapOut = 10 * s, gapIn = 10 * s, border = Math.max(1, 2 * s);
    const tiles = OM.dwindle(windows, x + gapOut, y + barH + gapOut * 0.6, w - gapOut * 2, h - barH - gapOut * 1.6, gapIn);
    const rng = OM.rng(seed);
    const kinds = contents || ['term', 'code', 'web', 'top', 'term', 'code'];
    tiles.forEach((r, i) => {
      ctx.fillStyle = i === active ? th.brand : th['border-strong'];
      ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.fillStyle = th.bg;
      ctx.fillRect(r.x + border, r.y + border, r.w - border * 2, r.h - border * 2);
      paintContent(ctx, kinds[i % kinds.length], r.x + border, r.y + border, r.w - border * 2, r.h - border * 2, th, inks, s, rng);
    });
    ctx.restore();
    return tiles;
  };

  function paintContent(ctx, kind, x, y, w, h, th, inks, s, rng) {
    const pad = 14 * s, lh = 22 * s;
    const rows = Math.floor((h - pad * 2) / lh);
    const palette = [th.text, th['text-secondary'], th.brand, inks.hover, th['text-muted']];
    if (kind === 'web') {
      ctx.fillStyle = th['surface-2'];
      ctx.fillRect(x, y, w, 34 * s);
      ctx.fillStyle = th.surface;
      ctx.fillRect(x + pad, y + 48 * s, w - pad * 2, Math.min(h * 0.32, 220 * s));
      for (let i = 0; i < 6; i++) {
        ctx.fillStyle = i === 0 ? th.text : th['text-muted'];
        const yy = y + 48 * s + Math.min(h * 0.32, 220 * s) + (18 + i * 20) * s;
        if (yy > y + h - pad) break;
        ctx.fillRect(x + pad, yy, (w - pad * 2) * (i === 0 ? 0.55 : 0.4 + rng() * 0.5), (i === 0 ? 10 : 6) * s);
      }
      return;
    }
    if (kind === 'top') {
      const bars = Math.max(4, Math.floor((w - pad * 2) / (14 * s)));
      for (let i = 0; i < bars; i++) {
        const v = 0.15 + 0.85 * rng();
        ctx.fillStyle = v > 0.8 ? th.brand : inks.mid;
        const bh = (h - pad * 2) * 0.45 * v;
        ctx.fillRect(x + pad + i * 14 * s, y + h - pad - bh, 9 * s, bh);
      }
      for (let i = 0; i < Math.min(rows - 1, 4); i++) {
        ctx.fillStyle = palette[i % 3];
        ctx.fillRect(x + pad, y + pad + i * lh, (w - pad * 2) * (0.3 + 0.4 * rng()), 8 * s);
      }
      return;
    }
    for (let i = 0; i < rows; i++) {
      const yy = y + pad + i * lh;
      const indent = kind === 'code' ? Math.floor(rng() * 4) * 18 * s : 0;
      if (kind === 'term' && i % 4 === 0) {
        ctx.fillStyle = th.brand;
        ctx.fillRect(x + pad, yy, 10 * s, 10 * s);
      }
      let cx = x + pad + indent + (kind === 'term' ? 18 * s : 0);
      const words = 1 + Math.floor(rng() * 5);
      for (let k = 0; k < words; k++) {
        const ww = (24 + rng() * 80) * s;
        if (cx + ww > x + w - pad) break;
        ctx.fillStyle = palette[Math.floor(rng() * palette.length)];
        ctx.fillRect(cx, yy, ww, 8 * s);
        cx += ww + 10 * s;
      }
    }
  }
})();
