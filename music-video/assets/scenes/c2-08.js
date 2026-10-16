// c2-08 · Inside the machine. The spark from the cut is the machine's core,
// seen from far off; we dive in and the board opens around it, traces leading
// out from the core like city streets. Each word is a circuit on the board:
// on its onset current runs from the core into it and floods its letterforms
// trace by trace. The key word holds its charge through its long note and the
// downbeat pulses the entire board. Then the dive resumes on the roll: the
// words stream past and go dark, the core rushes up to fill the frame, and on
// the last hit its lights go out into the night the bridge opens on.
OM.ownWords.add('c2-08');
(() => {
  const W = 800;
  OM.c2.ready('c2-08', W);
  const { pool, sm, decay } = OM.c2;

  OM.scene({
    id: 'c2-08',
    build(el, { start, duration }) {
      const cv = document.createElement('canvas');
      cv.className = 'om-fill';
      el.appendChild(cv);
      const c = OM.canvas(cv, { alpha: false });
      const END = start + duration;
      const ink = OM.fieldInks('tokyo-night'), th = OM.theme('tokyo-night');
      const words = OM.sung('c2-08');
      const on = words.map((w) => w.t0);
      let K = 0;
      words.forEach((w, k) => { if (w.t1 - w.t0 > words[K].t1 - words[K].t0) K = k; });
      const KICKS = [187.757, 188.012, 188.43, 188.546];
      const DB1 = OM.downbeatsIn(188.7, 189)[0] || 188.848, DB2 = OM.downbeatsIn(191, 191.3)[0] || 191.147;
      const OFF = 192.95; // the core goes dark at the top of the roll
      const HM = OM.HOME, sp = OM.cellAt(HM, 960, 540);
      const ZX = HM.x0 + (sp.col + 0.5) * HM.cw, ZY = HM.y0 + (sp.row + 0.5) * HM.ch;
      const CORE = 44, CS = 8;
      const S0 = HM.cw / CORE;
      /** Camera scale: from the spark out to the board, a slow drift, then the dive on the roll. */
      const scale = (T) => {
        const open = OM.lerp(S0, 1, OM.ease.outExpo(OM.prog(T, start + 0.03, on[0])));
        return open * (1 + 0.1 * OM.prog(T, on[0], DB2)) * Math.exp(2.4 * Math.max(0, T - DB2 - 0.1));
      };

      // The board: Manhattan traces walking out from the core.
      const rng = OM.rng(0xc208), traces = [];
      for (let n = 0; n < 72; n++) {
        const side = n % 4, off = (rng() - 0.5) * CORE * 0.9;
        let x = ZX + [CORE / 2, 0, -CORE / 2, 0][side] + (side % 2 ? off : 0), y = ZY + [0, CORE / 2, 0, -CORE / 2][side] + (side % 2 ? 0 : off);
        let dir = side;
        const pts = [[x, y]];
        let len = 0;
        const goal = 500 + 1300 * rng();
        while (len < goal) {
          const L = 30 + 160 * rng();
          const v = [[1, 0], [0, 1], [-1, 0], [0, -1]][dir];
          x += v[0] * L;
          y += v[1] * L;
          len += L;
          pts.push([x, y]);
          const turn = rng();
          if (turn < 0.5) dir = (side + (rng() < 0.5 ? 1 : 3)) % 4; // sideways
          else dir = side; // outward
        }
        const segs = [];
        let acc = 0;
        for (let i = 1; i < pts.length; i++) {
          const l = Math.abs(pts[i][0] - pts[i - 1][0]) + Math.abs(pts[i][1] - pts[i - 1][1]);
          segs.push([pts[i - 1], pts[i], acc, l]);
          acc += l;
        }
        traces.push({ pts, segs, len: acc, ph: rng() });
      }

      const get = OM.c2.lazy(W, () => {
        const L = OM.c2.layout(words, { weight: W, cap: 150, maxW: 1720, cy: 540, rows: 3, lead: 1.5, minCap: 100 });
        return words.map((wd, k) => {
          const p = L.place[k];
          if (!p) return null;
          const cells = OM.c2.raster(wd.text, p.x, p.base, L.px, W, CS);
          const idx = new Map(cells.map((cl, n) => [cl.i + ',' + cl.j, n]));
          // Current enters at the cell nearest the core and floods breadth-first.
          let entry = 0, best = Infinity;
          cells.forEach((cl, n) => { const d = Math.hypot(cl.x - ZX, cl.y - ZY); if (d < best) { best = d; entry = n; } });
          // Every letter is fed at its cell nearest the core, so the whole word floods at once.
          const seed = new Map();
          cells.forEach((cl, n) => {
            const d = Math.hypot(cl.x - ZX, cl.y - ZY), b = seed.get(cl.l);
            if (!b || d < b[1]) seed.set(cl.l, [n, d]);
          });
          const dist = new Int32Array(cells.length).fill(-1), q = [...seed.values()].map(([n]) => n);
          for (const n of q) dist[n] = 0;
          for (let h = 0; h < q.length; h++) {
            const a = cells[q[h]];
            for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) {
              const b = idx.get(a.i + di + ',' + (a.j + dj));
              if (b !== undefined && dist[b] < 0) { dist[b] = dist[q[h]] + 1; q.push(b); }
            }
          }
          let dmax = 1;
          for (const d of dist) dmax = Math.max(dmax, d);
          const links = [];
          cells.forEach((cl, n) => {
            const r = idx.get(cl.i + 1 + ',' + cl.j), b = idx.get(cl.i + ',' + (cl.j + 1));
            const deg = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([di, dj]) => idx.has(cl.i + di + ',' + (cl.j + dj))).length;
            if (r !== undefined) links.push([n, r]);
            if (b !== undefined) links.push([n, b]);
            if (deg <= 1) links.push([n, n]); // a pad
          });
          const e = cells[entry] || { x: ZX, y: ZY };
          return { k, cells, dist, dmax, links, feed: [[ZX, ZY], [e.x + CS / 2, ZY], [e.x + CS / 2, e.y + CS / 2]] };
        });
      });

      return {
        render(t, T) {
          const ctx = c.ensure();
          const dpr = c.dpr;
          if (T < start + 0.05) return OM.handoff('spark', ctx, T, dpr);
          if (T > END - 0.07) return OM.handoff('night', ctx, T, dpr);
          const circuits = get();
          ctx.fillStyle = ink.bg;
          ctx.fillRect(0, 0, 1920, 1080);
          const s = scale(T);
          const X = (x) => ZX + (x - ZX) * s, Y = (y) => ZY + (y - ZY) * s;
          const dark = sm(T, OFF - 0.06, OFF + 0.04); // lights out
          const wordsOut = OM.prog(T, DB2 + 0.5, DB2 + 1.2);
          const grow = OM.prog(T, start + 0.03, on[0] + 0.25); // traces run out as the board opens
          const pulse = Math.max(decay(T, DB1, 0.16), ...KICKS.map((k) => 0.5 * decay(T, k, 0.08)));

          // Board traces, with packets of current riding out from the core on the hits.
          ctx.lineWidth = Math.max(1, 2 * Math.min(s, 3));
          ctx.strokeStyle = OM.c2.rgba(pulse > 0.5 ? ink.mid : ink.dim, 1 - dark);
          ctx.beginPath();
          for (const tr of traces) {
            const lim = tr.len * grow;
            for (const [a, b, acc, l] of tr.segs) {
              if (acc > lim) break;
              const f = Math.min(1, (lim - acc) / l);
              ctx.moveTo(X(a[0]), Y(a[1]));
              ctx.lineTo(X(a[0] + (b[0] - a[0]) * f), Y(a[1] + (b[1] - a[1]) * f));
            }
          }
          ctx.stroke();
          const hits = [...on, ...KICKS, DB1, 189.6, 190.4, DB2];
          ctx.fillStyle = OM.c2.rgba(ink.crest, 1 - dark);
          for (const h of hits) {
            const a = T - h;
            if (a < 0 || a > 0.6) continue;
            const d = a * 2400;
            traces.forEach((tr, n) => {
              if ((n + Math.round(h * 10)) % 3) return;
              for (const [p, q, acc, l] of tr.segs) {
                if (d < acc || d > acc + l) continue;
                const f = (d - acc) / l;
                ctx.fillRect(X(p[0] + (q[0] - p[0]) * f) - 3 * Math.min(s, 3), Y(p[1] + (q[1] - p[1]) * f) - 3 * Math.min(s, 3), 6 * Math.min(s, 3), 6 * Math.min(s, 3));
              }
            });
          }

          // The core.
          const cs = CORE * s, cx = X(ZX), cy = Y(ZY);
          if (dark < 1) {
            pool(ctx, cx, cy, Math.max(72, cs * 1.6), Math.max(72, cs * 1.6), ink.lit, (0.4 + 0.2 * pulse) * (1 - dark));
            ctx.fillStyle = ink.bg;
            ctx.fillRect(cx - cs / 2, cy - cs / 2, cs, cs);
            ctx.strokeStyle = OM.c2.rgba(ink.crest, 1 - dark);
            ctx.lineWidth = Math.max(2, cs / 14);
            ctx.strokeRect(cx - cs / 2, cy - cs / 2, cs, cs);
            ctx.fillStyle = OM.c2.rgba(ink.crest, 1 - dark);
            const ic = cs * 0.34;
            ctx.fillRect(cx - ic / 2, cy - ic / 2, ic, ic);
          }

          // The word circuits: fed from the core on the onset, flooding their letterforms.
          for (const w of circuits) {
            if (!w || T < on[w.k] - 0.1) continue;
            const flood = w.k === K ? 0.32 : 0.2;
            const age = T - on[w.k];
            // The feed: a trace from the core to the word's entry, current arriving on the onset.
            const fd = OM.prog(T, on[w.k] - 0.1, on[w.k]);
            ctx.strokeStyle = OM.c2.rgba(ink.hover, (1 - wordsOut) * (1 - dark));
            ctx.lineWidth = Math.max(1, 2 * Math.min(s, 3));
            ctx.beginPath();
            const [a, b, c2] = w.feed, l1 = Math.abs(b[0] - a[0]), l2 = Math.abs(c2[1] - b[1]), lim = (l1 + l2) * fd;
            ctx.moveTo(X(a[0]), Y(a[1]));
            ctx.lineTo(X(a[0] + (b[0] - a[0]) * Math.min(1, lim / (l1 || 1))), Y(a[1]));
            if (lim > l1) ctx.lineTo(X(b[0]), Y(b[1] + (c2[1] - b[1]) * Math.min(1, (lim - l1) / (l2 || 1))));
            ctx.stroke();
            if (age < 0) continue;
            const front = (age / flood) * w.dmax;
            const isLit = (n) => w.dist[n] >= 0 ? w.dist[n] <= front : age > flood;
            const hold = w.k === K ? 0.5 + 0.5 * Math.sin((T - on[w.k]) * 9) * (T < words[K].t1 ? 1 : 0) : 0;
            const hot = age < flood + 0.08 || decay(T, DB1, 0.12) > 0.4;
            const ink1 = hot ? ink.crest : w.k === K ? (hold > 0.8 ? ink.crest : ink.hover) : ink.crest;
            const cs2 = CS * s, pad = 3 * s;
            // A dark keep-out under the lit letters so they read over the board, then the letters solid.
            for (const pass of [0, 1]) {
              ctx.fillStyle = pass ? ink1 : ink.bg;
              ctx.beginPath();
              w.cells.forEach((cl, n) => {
                if (!isLit(n) || OM.hash(cl.i, cl.j, 4) < wordsOut) return;
                const x = X(cl.x), y = Y(cl.y);
                if (pass) ctx.rect(x, y, cs2 + 0.4, cs2 + 0.4);
                else ctx.rect(x - pad, y - pad, cs2 + 2 * pad, cs2 + 2 * pad);
              });
              ctx.fill();
            }
          }
        },
        release: () => c.release(),
      };
    },
  });
})();
