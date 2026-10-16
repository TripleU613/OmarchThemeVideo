// x-b2 · Time tunnel. The camera flies down the lattice tunnel that opened out
// of x-b1's vortex, and every line sung so far streams past it in order, set
// in JetBrains Mono, with the film's motifs riding among them. The speed
// doubles every bar and lunges on each downbeat; the kicks punch the lens and
// the hi-hat roll shimmers the rings. On the last downbeat everything goes
// crest, and on the snare roll the whole tunnel, words and all, is squeezed
// step by step into one point: the spark the final chorus drops from.
(() => {
  const FONT = "700 100px 'JetBrains Mono'";
  window.__hf = window.__hf || {};
  window.__hf.buildReady = window.__hf.buildReady || {};
  window.__hf.buildReady['x-b2-type'] = document.fonts.load(FONT);

  OM.scene({
    id: 'x-b2',
    build(el, { start, duration }) {
      const cv = document.createElement('canvas');
      cv.className = 'om-fill';
      el.appendChild(cv);
      const c = OM.canvas(cv, { alpha: false });
      const L = OM.HOME;
      const ink = OM.fieldInks('tokyo-night');
      const { C, MW, MH, motifs, Zc, focal, rings, frame, DOWN } = OM.xb;
      const END = start + duration;
      const SNARES = [233.895, 235.357, 236.402, 237.610, 238.097, 239.746, 240.094, 240.234, 240.628, 240.768, 242.091];
      // The squeeze: nothing until the last downbeat, then a step on each snare of the roll.
      const SQ = [[242.323, 0], [242.486, 0.3], [242.881, 0.55], [243.020, 0.74], [243.159, 0.9], [END - 0.1, 1]];
      const squeeze = (T) => {
        for (let i = SQ.length - 1; i >= 0; i--) if (T >= SQ[i][0]) {
          const n = SQ[i + 1];
          return n ? OM.lerp(SQ[i][1], n[1], OM.ease.outExpo(OM.prog(T, SQ[i][0], SQ[i][0] + Math.min(0.12, n[0] - SQ[i][0])))) : 1;
        }
        return 0;
      };
      // Every line sung before the build, in order, each at its own depth along the tunnel.
      const ids = OM.T.lines.filter((l) => l.end <= start).map((l) => l.id);
      const Z0 = 8.2, GAP = 1.25; // the first line enters the far plane (8) just after the seam
      const items = ids.map((id, i) => {
        const a = i * 2.39996 + 0.6;
        return { id, z: Z0 + i * GAP, x: 0.34 * Math.cos(a), y: 0.2 * Math.sin(a) };
      });
      // The motifs ride between the lines, wide of the axis.
      const props = [0, 1, 2, 3, 4].map((i) => {
        const a = i * 2.6 + 2.2;
        return { i, z: Z0 + (4 + i * 8.5) * GAP + GAP / 2, x: 0.72 * Math.cos(a), y: 0.42 * Math.sin(a) };
      });
      let texts = null;
      const measure = () => {
        const m = document.createElement('canvas').getContext('2d');
        m.font = FONT;
        return {
          ok: document.fonts.check(FONT),
          list: ids.map((id) => {
            const s = OM.sung(id).map((w) => (w.space ? ' ' : '') + w.text).join('').toUpperCase();
            return { s, w: m.measureText(s).width / 100 };
          }),
        };
      };

      return {
        render(t, T) {
          const ctx = c.ensure();
          const dpr = c.dpr;
          if (T < start + 0.1) return frame(ctx, T, dpr);
          if (T >= END - 0.1) return OM.handoff('spark', ctx, T, dpr);
          if (!texts || (!texts.ok && document.fonts.check(FONT))) texts = measure();
          const sq = squeeze(T), k = 1 - sq;
          const drop = OM.pulse(DOWN.filter((d) => d <= T), T, 0.18) * (T >= DOWN[4] ? 1.6 : 0.6);
          const snare = OM.pulse(SNARES.filter((s) => s <= T), T, 0.1);
          ctx.fillStyle = ink.bg;
          ctx.fillRect(0, 0, 1920, 1080);
          rings(ctx, dpr, T, { squeeze: sq, flash: OM.clamp(drop + 0.35 * snare) });

          const z = Zc(T), F = focal(T);
          const P = (x, y, d) => [C.x + ((x * F) / d) * k, C.y + ((y * F) / d) * k];
          // The motifs, as lattice blocks scaled by depth.
          for (const p of props) {
            const d = p.z - z;
            if (d < 0.3 || d > 9) continue;
            const mo = motifs()[p.i], cs = ((0.075 * F) / d) * k;
            if (cs < 1) continue;
            const [px, py] = P(p.x, p.y, d);
            const fade = OM.clamp((9 - d) / 4);
            ctx.globalAlpha = fade;
            for (let j = 0; j < MH; j++)
              for (let i = 0; i < MW; i++) {
                const v = mo.m[j * MW + i];
                if (!v) continue;
                ctx.fillStyle = v === 2 || d < 1.4 || sq > 0.3 ? ink.crest : d < 3 ? ink.hover : ink.lit;
                ctx.fillRect(px + (i - MW / 2) * cs, py + (j - MH / 2) * cs, Math.ceil(cs * 0.9), Math.ceil(cs * 0.9));
              }
            ctx.globalAlpha = 1;
          }
          // The lines, far to near so the nearest lands on top.
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          for (let n = items.length - 1; n >= 0; n--) {
            const it = items[n], tx = texts.list[n];
            const d = it.z - z;
            if (d < 0.22 || d > 8 || !tx.s) continue;
            // Grows with nearness up to the frame's width (or 170px), then dissolves rather than clip.
            const raw = ((190 * F) / 900 / d) * k;
            const cap = Math.min(170, 1800 / Math.max(1, tx.w));
            const size = Math.min(raw, cap);
            if (size < 3) continue;
            const gone = OM.clamp((raw / cap - 1) * 1.6);
            if (gone >= 1) continue;
            let [px, py] = P(it.x, it.y, d);
            const half = (tx.w * size) / 2;
            px = OM.clamp(px, half + 40, 1880 - half); // the whole line stays in frame while it reads
            py = OM.clamp(py, size * 0.6 + 40, 1040 - size * 0.6);
            const f = OM.clamp((8 - d) / 3) * (1 - gone);
            const near = OM.clamp((2.2 - d) / 1.4);
            ctx.font = `700 ${size.toFixed(1)}px 'JetBrains Mono'`;
            ctx.fillStyle = OM.mix(ink.bg, sq > 0.2 || drop > 0.5 ? ink.crest : near > 0.5 ? ink.crest : ink.hover, f);
            ctx.fillText(tx.s, px, py);
          }
          // The point everything collapses into, growing into the spark's halo.
          if (sq > 0) {
            const [r, g, b] = OM.rgb(ink.lit);
            const rad = 72 + 500 * k;
            const gr = ctx.createRadialGradient(C.x, C.y, 0, C.x, C.y, rad);
            gr.addColorStop(0, `rgba(${r},${g},${b},${0.4 * sq})`);
            gr.addColorStop(1, `rgba(${r},${g},${b},0)`);
            ctx.fillStyle = gr;
            ctx.fillRect(C.x - rad, C.y - rad, 2 * rad, 2 * rad);
            ctx.fillStyle = ink.crest;
            const h = OM.cellAt(L, C.x, C.y);
            OM.cell(ctx, L, h.col, h.row, dpr);
          }
        },
        release: () => c.release(),
      };
    },
  });
})();
