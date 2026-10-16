// c1-03 · The name, set in letterpress. The line's first two words are real
// type, JetBrains Mono sorts locked up above the name: the first bites into the
// paper on its onset, the second comes down out of the camera, its shadow
// sharpening on the field. Then the name itself, the wordmark, is pressed
// syllable by syllable across its held note: O, MAR, and CHY on the kick into
// the downbeat, the biggest press, which kisses the whole name again and dents
// the whole sheet. Around every block the paper dents and refills in the
// field's dither order, and the fresh ink cools from crest into its band inks.
// On the snare where the chorus lifts, the small type is distributed: sort by
// sort it pops back off the paper, leaving only the name, at home.
OM.ownWords.add('c1-03');
(() => {
  const FONT = "800 100px 'JetBrains Mono'";
  window.__hf = window.__hf || {};
  window.__hf.buildReady = window.__hf.buildReady || {};
  window.__hf.buildReady['c1-03-type'] = document.fonts.load(FONT);

  OM.scene({
    id: 'c1-03',
    build(el, { start, duration }) {
      const cv = document.createElement('canvas');
      cv.className = 'om-fill';
      el.appendChild(cv);
      const c = OM.canvas(cv, { alpha: false });
      const L = OM.HOME;
      const H = { x0: L.x0, y0: L.y0, cw: L.cw / 2, ch: L.ch / 2 }; // the type's half lattice, on HOME's origin
      const ink = OM.fieldInks('tokyo-night');
      const on = OM.words('c1-03');
      const END = start + duration;
      // The name's syllables: O on its onset, MAR on the half-beat before the
      // downbeat (a small kick there), CHY on the 90.86 kick into the 90.906
      // downbeat. The small type lifts off from the 92.07 snare, where energy goes high.
      const MAR = 90.639, KICK = 90.86, LIFT = 92.07, LIFTED = 0.32;
      const SHADOW = 0.5, FALL = 0.24, BITE = 0.18, COOL = 0.8;

      /** A block pressed at `hit`: cells [col, row, letter] on lattice G, its HOME-cell box and centre. */
      const press = (G, cells, hit, o) => {
        let q0 = Infinity, q1 = -Infinity, r0 = Infinity, r1 = -Infinity;
        for (const [q, r] of cells) { q0 = Math.min(q0, q); q1 = Math.max(q1, q); r0 = Math.min(r0, r); r1 = Math.max(r1, r); }
        const hc = (v) => Math.floor(((v + 0.5) * G.cw) / L.cw), hr = (v) => Math.floor(((v + 0.5) * G.ch) / L.ch);
        return {
          G, cells, hit,
          box: { c0: hc(q0), c1: hc(q1), r0: hr(r0), r1: hr(r1) },
          cx: G.x0 + ((q0 + q1 + 1) / 2) * G.cw, cy: G.y0 + ((r0 + r1 + 1) / 2) * G.ch,
          lead: SHADOW, fall: FALL, from: 2.6, reach: 9, dent: 0.55, bite: BITE, cool: COOL,
          ...o,
        };
      };
      // Chebyshev distance in HOME cells from a block's box, for the dent and the bite.
      const away = (b, col, row) => Math.max(b.c0 - col, col - b.c1, b.r0 - row, row - b.r1, 0);

      // The name: the wordmark's three syllables by column, O | MAR | CHY.
      const all = OM.cells(OM.WORDMARK);
      const name = [[0, 8, on[2]], [11, 47, MAR], [50, 80, KICK]].map(([a, b, hit]) =>
        press(L, all.filter(([col]) => col >= a && col <= b), hit, { name: true, band: (row) => ink[OM.BANDS[row]] }));
      Object.assign(name[2], { from: 3.4, fall: 0.3, reach: 34, dent: 0.9, bite: 0.3, cool: 1, big: true });

      // The small type: words 1 and 2 set in JetBrains Mono ExtraBold on the half
      // lattice, one line centred over the name, its baseline four HOME rows above it.
      let type = null;
      const rasterize = () => {
        const sung = OM.sung('c1-03');
        const words = [0, 1].map((k) => (sung[k] ? sung[k].text : '').toUpperCase());
        const m = document.createElement('canvas').getContext('2d');
        m.font = FONT;
        const adv = m.measureText('M').width / 100, cap = m.measureText('H').actualBoundingBoxAscent / 100;
        const gap = sung[1] && sung[1].space ? 1 : 0;
        const n = Math.max(1, words[0].length + gap + words[1].length);
        const size = Math.min(84 / cap, 1180 / (n * adv)); // cap height 84px, the line no wider than the name
        const font = `800 ${size.toFixed(2)}px 'JetBrains Mono'`;
        const A = adv * size, base = -8, yB = H.y0 + base * H.ch;
        const xs = [960 - (n * A) / 2];
        xs.push(xs[0] + (words[0].length + gap) * A);
        const S = 4;
        const raster = (str, xW) => {
          if (!str) return [];
          const qA = Math.floor((xW - H.x0) / H.cw) - 1, rA = base - Math.ceil((size * 1.05) / H.ch);
          const cols = Math.ceil((str.length * A) / H.cw) + 3, rows = base - rA + Math.ceil((size * 0.3) / H.ch);
          const cnv = document.createElement('canvas');
          cnv.width = Math.ceil(cols * H.cw * S);
          cnv.height = Math.ceil(rows * H.ch * S);
          const x = cnv.getContext('2d', { willReadFrequently: true });
          x.scale(S, S);
          x.font = font;
          x.fillStyle = '#fff';
          x.fillText(str, xW - (H.x0 + qA * H.cw), yB - (H.y0 + rA * H.ch));
          const px = x.getImageData(0, 0, cnv.width, cnv.height).data;
          const out = [];
          for (let j = 0; j < rows; j++)
            for (let i = 0; i < cols; i++) {
              let sum = 0, cnt = 0;
              for (let yy = Math.floor(j * H.ch * S); yy < Math.min(cnv.height, Math.floor((j + 1) * H.ch * S)); yy++)
                for (let xx = Math.floor(i * H.cw * S); xx < Math.min(cnv.width, Math.floor((i + 1) * H.cw * S)); xx++) { sum += px[(yy * cnv.width + xx) * 4 + 3]; cnt++; }
              if (cnt && sum / cnt > 120) out.push([qA + i, rA + j, OM.clamp(Math.floor((H.x0 + (qA + i + 0.5) * H.cw - xW) / A), 0, str.length - 1)]);
            }
          return out;
        };
        const letters = [];
        const cellsOf = words.map((str, k) => {
          const cells = raster(str, xs[k]).map(([q, r, j]) => [q, r, letters.length + j]);
          for (let j = 0; j < str.length; j++) letters.push({ cells: cells.filter((cl) => cl[2] === letters.length), cx: xs[k] + (j + 0.5) * A });
          return cells;
        });
        // Banded like the wordmark, crest on top, but no darker than lit so it reads.
        const rTop = Math.min(...cellsOf.flat().map((cl) => cl[1]), base - 1);
        const band = (r) => { const f = (r - rTop) / Math.max(1, base - 1 - rTop); return f < 0.34 ? ink.crest : f < 0.62 ? ink.hover : ink.lit; };
        const cy = H.y0 + ((rTop + base) / 2) * H.ch;
        // Distribution: sort by sort, left to right, every letter lifted inside half a second.
        const stag = letters.length > 1 ? Math.min(0.07, 0.45 / (letters.length - 1)) : 0;
        letters.forEach((l, i) => Object.assign(l, { cy, at: LIFT + i * stag }));
        const presses = cellsOf.map((cells, k) =>
          cells.length ? press(H, cells, on[k], { lead: k ? SHADOW : 0, fall: k ? FALL : 0, reach: 6, dent: 0.5, band }) : null).filter(Boolean);
        return { ok: document.fonts.check(FONT), letters, presses };
      };

      /** A falling or lifting block: p 0 = up at the camera, 1 = on the paper. */
      const block = (ctx, G, cells, cx, cy, p, from) => {
        const k = OM.lerp(from, 1, p);
        ctx.globalAlpha = OM.clamp(p * 3);
        ctx.fillStyle = p > 0.7 ? ink.lit : ink.mid;
        for (const [q, r] of cells) {
          const x = cx + (G.x0 + q * G.cw - cx) * k, y = cy + (G.y0 + r * G.ch - cy) * k;
          ctx.fillRect(x, y, G.cw * k, G.ch * k);
        }
        ctx.globalAlpha = 1;
      };
      /** A block's shadow on the paper, dithered and offset, sharpening as it nears (near 0..1). */
      const shadow = (ctx, dpr, G, cells, near) => {
        const off = Math.round((1 - near) * 7 * (L.cw / G.cw));
        ctx.fillStyle = ink.bg;
        for (const [q, r] of cells) if (OM.threshold(q + off, r + off) < 0.2 + 0.8 * near) OM.cell(ctx, G, q + off, r + off, dpr);
      };

      return {
        render(t, T) {
          const ctx = c.ensure();
          const dpr = c.dpr;
          if (!type || (!type.ok && document.fonts.check(FONT))) type = rasterize();
          // The cuts: nothing but the field until the first bite, nothing but the name at home at the end.
          if (T < on[0] || T >= END - 0.1) return OM.handoff(T < on[0] ? 'field' : 'word', ctx, T, dpr);
          const presses = [...type.presses, ...name];

          // The paper: the field at the handoff's gain, dented where a block bit.
          const dents = presses.filter((p) => T >= p.hit && T - p.hit < p.dent);
          OM.hero(ctx, T, dpr, {
            inks: ink, L, word: false, gain: 0.8,
            mask: dents.length
              ? (col, row) => {
                  for (const p of dents) {
                    const a = (T - p.hit) / p.dent;
                    if (away(p.box, col, row) < 1 + p.reach * OM.ease.outExpo(a) && OM.threshold(col, row) > 0.5 * a * a) return 0;
                  }
                  return 1;
                }
              : null,
          });

          // Shadows of the blocks on their way down, and of the sorts on their way up.
          for (const p of presses) {
            const age = T - p.hit;
            if (p.lead && age >= -p.lead && age < 0) shadow(ctx, dpr, p.G, p.cells, 1 + age / p.lead);
          }
          for (const l of type.letters) {
            const u = OM.prog(T, l.at, l.at + LIFTED);
            if (u > 0 && u < 1) shadow(ctx, dpr, H, l.cells, 1 - u);
          }

          // The bite: an impact line runs out above and below the block; the big press spans the sheet.
          for (const p of presses) {
            const age = T - p.hit;
            if (age < 0 || age >= p.bite) continue;
            const reach = Math.round(1 + p.reach * OM.ease.outExpo(age / p.dent));
            const a = p.big ? L.cMin : p.box.c0 - reach, b = p.big ? L.cMin + L.cols - 1 : p.box.c1 + reach;
            ctx.fillStyle = ink.crest;
            for (let col = a; col <= b; col++)
              for (const row of [p.box.r0 - reach, p.box.r1 + reach]) if (OM.threshold(col, row) > age / p.bite) OM.cell(ctx, L, col, row, dpr);
          }

          // Fresh ink cools from crest to its band, each cell at its own dither threshold.
          // The big press kisses the whole name again, so O and MAR cool from it too.
          for (const p of presses) {
            const age = T - p.hit;
            if (age < 0) continue;
            const kissed = p.name && T >= KICK;
            const k = (1.25 * (kissed ? T - KICK : age)) / (kissed ? name[2].cool : p.cool);
            for (const [q, r, j] of p.cells) {
              if (j !== undefined && T >= type.letters[j].at) continue; // lifted
              const th = OM.threshold(q, r);
              ctx.fillStyle = th > k ? ink.crest : th > k - 0.25 ? ink.hover : p.band(r);
              OM.cell(ctx, p.G, q, r, dpr);
            }
          }

          // On top, nearest the camera: blocks falling onto the paper, sorts lifting off it.
          for (const p of presses) {
            const age = T - p.hit;
            if (age >= -p.fall && age < 0) block(ctx, p.G, p.cells, p.cx, p.cy, OM.ease.inCubic(1 + age / p.fall), p.from);
          }
          for (const l of type.letters) {
            const u = OM.prog(T, l.at, l.at + LIFTED);
            if (u > 0 && u < 1) block(ctx, H, l.cells, l.cx, l.cy, OM.ease.inCubic(1 - u), 2.6);
          }
        },
        release: () => c.release(),
      };
    },
  });
})();
