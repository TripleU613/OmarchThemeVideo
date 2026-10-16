// c2-06 · Wild horses. The field from the cut is the plain at night. For each
// word a small herd of light gallops in along the word's row, hooves on the
// beat, kicking up loose dust; the dust settles behind them into the word,
// starting at its first letter on its onset, every letter laid down in tidy
// horizontal lines. With the line read, the letters' lines drop and pile onto
// one row; on the last downbeat a final herd runs that row end to end and
// leaves it a single crest line, and the plain goes dark behind it.
OM.ownWords.add('c2-06');
(() => {
  const W = 800;
  OM.c2.ready('c2-06', W);
  const { sm, decay } = OM.c2;
  const A = [
    '...............##...', '..............####..', '.............######.', '............###..##.',
    '..##########.###....', '.##############.....', '################....', '#.##############....',
    '#..############.....', '...##........##.....', '..##..........##....', '.##............##...',
  ];
  const B = A.slice(0, 9).concat(['....##......##......', '....#.#....#.#......', '...#...#..#...#.....']);
  const HC = 7; // horse cell px: a horse is 140 x 84

  OM.scene({
    id: 'c2-06',
    build(el, { start, duration }) {
      const cv = document.createElement('canvas');
      cv.className = 'om-fill';
      el.appendChild(cv);
      const c = OM.canvas(cv, { alpha: false });
      const END = start + duration;
      const ink = OM.fieldInks('tokyo-night'), th = OM.theme('tokyo-night');
      const words = OM.sung('c2-06');
      const on = words.map((w) => w.t0);
      const HM = OM.HOME, cR = OM.cellAt(HM, 960, 540).row, lineY = HM.y0 + cR * HM.ch;
      const CS = 8, V = 2600;
      const DROP = 180.95, HERD = OM.downbeatsIn(182.3, 182.7)[0] || 182.486, HV = 2900;
      const HERD0 = HERD - 2050 / HV; // the final herd's lead reaches the right edge on the downbeat
      const FRAME = OM.SPB / 4;

      const get = OM.c2.lazy(W, () => {
        const L = OM.c2.layout(words, { weight: W, cap: 150, maxW: 1700, cy: 500, rows: 3, lead: 1.75, minCap: 90 });
        return words.map((wd, k) => {
          const p = L.place[k];
          if (!p) return null;
          const v = k === 0 ? Math.max(V, (p.x + 330) / Math.max(0.05, on[0] - start)) : V;
          const cells = OM.c2.raster(wd.text, p.x, p.base, L.px, W, CS).map((cl) => ({ ...cl, ts: on[k] + (cl.x - p.x) / v, h: OM.hash(cl.i, cl.j, 11) }));
          return { k, p, v, cells, foot: p.base + 40 };
        });
      });

      const horse = (ctx, x, foot, T, ph, a = 1) => {
        const fr = Math.floor((T + ph) / FRAME) % 2 ? B : A;
        ctx.fillStyle = OM.c2.rgba(ink.hover, a);
        const y0 = foot - fr.length * HC;
        fr.forEach((r, j) => {
          for (let i = 0; i < r.length; i++) if (r[i] === '#') ctx.fillRect(x + i * HC, y0 + j * HC, HC, HC);
        });
      };
      /** Wild dust kicked up behind a runner whose nose is at xh(T): puffs emitted every 1/30 s, each drifting and fading. */
      const dust = (ctx, xh, foot, T, seed, n = 10) => {
        const now = Math.floor(T * 30);
        for (let e = 0; e < n; e++) {
          const te = (now - e) / 30, age = T - te, x0 = xh(te) - 40;
          for (let q = 0; q < 3; q++) {
            const h1 = OM.hash(now - e, q, seed), h2 = OM.hash(q, now - e, seed + 1);
            const x = x0 - 90 * h1 * age * 6, y = foot - 4 - (60 + 140 * h2) * age * 4;
            if (age * 3 > 1 - h1 * 0.5) continue;
            ctx.fillStyle = h2 > 0.6 ? ink.lit : ink.mid;
            ctx.fillRect(x, y, 5, 5);
          }
        }
      };

      return {
        render(t, T) {
          const ctx = c.ensure();
          const dpr = c.dpr;
          if (T < start + 0.05) return OM.handoff('field', ctx, T, dpr);
          if (T > END - 0.07) return OM.handoff('line', ctx, T, dpr);
          const rows = get();
          ctx.fillStyle = ink.bg;
          ctx.fillRect(0, 0, 1920, 1080);
          const gain = OM.lerp(0.8, 0.42, sm(T, start, start + 0.6)) * (1 - sm(T, 181.6, HERD + 0.1));
          if (gain > 0.01) OM.hero(ctx, T, dpr, { inks: ink, L: HM, word: false, gain, bg: false });

          // The words: dust snapping into tidy lines behind each herd, then dropping onto the one row.
          for (const r of rows) {
            if (!r) continue;
            for (const cl of r.cells) {
              const a = T - cl.ts;
              if (a < -0.14) continue;
              let x = cl.x, y = cl.y;
              if (a < 0) {
                const e = OM.ease.outExpo(1 + a / 0.14);
                x += (1 - e) * (-70 - 60 * cl.h);
                y += (1 - e) * (110 * (OM.hash(cl.j, cl.i, 2) - 0.3));
              }
              const tf = DROP + 0.55 * cl.h;
              let land = false;
              if (T > tf) {
                const f = OM.ease.inCubic(OM.prog(T, tf, tf + 0.3));
                y = OM.lerp(cl.y, lineY + 2, f);
                land = f >= 1;
              }
              ctx.fillStyle = a < 0 ? ink.mid : a < 0.1 || land ? ink.crest : r.k === 0 ? ink.crest : ink.hover;
              if (land) {
                const col = Math.floor((cl.x + CS / 2 - HM.x0) / HM.cw);
                OM.cell(ctx, HM, col, cR, dpr);
              } else ctx.fillRect(x, y + 1, CS, CS - 2); // the tidy lines: each cell a dash, a seam between rows
            }
          }

          // The herds for each word, in from the left along its row.
          for (const r of rows) {
            if (!r) continue;
            const xh = (TT) => r.p.x + (TT - on[r.k]) * r.v + 50;
            const lead = xh(T);
            if (lead < -150 || lead > 2200) continue;
            dust(ctx, xh, r.foot, T, 7 + r.k);
            [[0, 0, 0], [-170, -20, 0.07], [-320, 14, 0.03]].forEach(([dx, dy, ph]) => horse(ctx, lead + dx - 140, r.foot + dy, T, ph + r.k * 0.05));
          }
          // On the last downbeat the final herd runs the row and leaves it unbroken.
          const lead = (TT) => (TT - HERD0) * HV - 40;
          if (T > HERD0 - 0.1) {
            const xl = lead(T);
            for (let col = HM.cMin; col < HM.cMin + HM.cols; col++) {
              const x = HM.x0 + col * HM.cw;
              if (x < xl - 160) { ctx.fillStyle = ink.crest; OM.cell(ctx, HM, col, cR, dpr); }
            }
            if (xl < 2200) {
              dust(ctx, lead, lineY, T, 31, 8);
              [[0, 0, 0], [-155, -18, 0.06], [-290, 12, 0.02], [-430, -8, 0.09], [-560, 10, 0.04]].forEach(([dx, dy, ph]) => horse(ctx, xl + dx - 140, lineY + dy, T, ph));
            }
          }
        },
        release: () => c.release(),
      };
    },
  });
})();
