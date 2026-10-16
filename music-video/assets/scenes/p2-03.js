// p2-03 · A city grows. The plan's grid from p2-02 is now a city's street grid
// seen from the sky. The words are its districts, built from city blocks: on
// each onset a road runs in along the avenue, a feeder turns off to the
// district and the power reaches it, lighting the word block by block out
// from the road. Unbuilt lots fill in around them. The key word powers the
// whole city on the downbeat; then we climb away until the city is one spark.
OM.ownWords.add('p2-03');
OM.scene({
  id: 'p2-03',
  build(el, { start, duration }) {
    const cv = document.createElement('canvas');
    cv.className = 'om-fill';
    el.appendChild(cv);
    const c = OM.canvas(cv, { alpha: false });
    const ink = OM.fieldInks('tokyo-night'), th = OM.theme('tokyo-night');
    const L = OM.HOME, P = OM.p2;
    const END = start + duration;
    const h = OM.cellAt(L, 960, 540);
    const AVE = h.row; // the avenue runs along the centre row
    const PX = L.x0 + (h.col + 0.5) * L.cw, PY = L.y0 + (h.row + 0.5) * L.ch; // the spark's cell
    const DB = 154.854, KICK2 = 154.97, CLIMB = 155.45, GONE = END - 0.09;
    const cellX = (col) => L.x0 + col * L.cw, cellY = (row) => L.y0 + row * L.ch;

    let lay = null;
    const layout = () => {
      const ws = P.words('p2-03');
      const rows = ws.length > 1 ? [ws.slice(0, -1), ws.slice(-1)] : [ws, []];
      const gapE = 0.6;
      const rowW = (r) => r.reduce((a, w) => a + w.w100 / 100, 0) + gapE * Math.max(0, r.length - 1);
      const sA = Math.min(190, 1760 / Math.max(0.01, rowW(rows[0])));
      const sB = Math.min(236, 1760 / Math.max(0.01, rowW(rows[1])));
      const baseA = cellY(AVE - 2) - 2, baseB = cellY(AVE + 3) + sB * P.CAP + 2;
      const cv2 = document.createElement('canvas');
      cv2.width = 1920;
      cv2.height = 1080;
      const x = cv2.getContext('2d', { willReadFrequently: true });
      const districts = [];
      [[rows[0], sA, baseA, -1], [rows[1], sB, baseB, 1]].forEach(([r, s, base, side]) => {
        let px = 960 - (rowW(r) * s) / 2;
        for (const w of r) {
          const tw = (w.w100 * s) / 100;
          x.clearRect(0, 0, 1920, 1080);
          x.font = P.font(s);
          x.fillStyle = '#fff';
          x.fillText(w.text, px, base);
          const img = x.getImageData(0, 0, 1920, 1080).data;
          const cells = [];
          const c0 = OM.cellAt(L, px - 4, 0).col, c1 = OM.cellAt(L, px + tw + 4, 0).col;
          const r0 = OM.cellAt(L, 0, base - s).row, r1 = OM.cellAt(L, 0, base + s * 0.3).row;
          for (let row = r0; row <= r1; row++)
            for (let col = c0; col <= c1; col++) {
              let cov = 0;
              for (let a = 0; a < 3; a++)
                for (let b = 0; b < 3; b++) {
                  const sx = Math.floor(cellX(col) + ((a + 0.5) / 3) * L.cw), sy = Math.floor(cellY(row) + ((b + 0.5) / 3) * L.ch);
                  if (sx >= 0 && sx < 1920 && sy >= 0 && sy < 1080 && img[(sy * 1920 + sx) * 4 + 3] > 128) cov++;
                }
              if (cov >= 3) cells.push([col, row]);
            }
          const mid = OM.cellAt(L, px + tw / 2, 0).col;
          const edge = cells.length ? (side < 0 ? Math.max(...cells.map((q) => q[1])) : Math.min(...cells.map((q) => q[1]))) : AVE;
          for (const q of cells) q.push(Math.abs(q[0] - mid) + Math.abs(q[1] - edge)); // blocks from the road contact
          districts.push({ ...w, cells, mid, edge, side });
          px += tw + gapE * s;
        }
      });
      // Lots: every cell away from the districts and the roads may hold a dim building.
      const taken = new Set();
      for (const d of districts) {
        for (const [col, row] of d.cells) for (let a = -2; a <= 2; a++) for (let b = -2; b <= 2; b++) taken.add(`${col + a},${row + b}`);
        const lo = Math.min(d.edge, AVE), hi = Math.max(d.edge, AVE);
        for (let row = lo; row <= hi; row++) for (let a = -1; a <= 1; a++) taken.add(`${d.mid + a},${row}`);
      }
      const lots = [];
      for (let row = L.rMin; row < L.rMin + L.rows; row++) {
        if (Math.abs(row - AVE) < 1) continue;
        for (let col = L.cMin; col < L.cMin + L.cols; col++) {
          if (taken.has(`${col},${row}`) || OM.hash(col, row, 7) < 0.74) continue;
          lots.push([col, row, OM.hash(col, row, 11)]);
        }
      }
      return { ok: P.ready(), districts, lots };
    };

    const block = (ctx, col, row) => ctx.fillRect(cellX(col) + 1.5, cellY(row) + 1.5, L.cw - 3, L.ch - 3);

    return {
      render(t, T) {
        const ctx = c.ensure();
        const dpr = c.dpr;
        if (P.cut(ctx, T, dpr, start, END, 'grid', 'spark')) return;
        if (!lay || (!lay.ok && P.ready())) lay = layout();
        ctx.fillStyle = ink.bg;
        ctx.fillRect(0, 0, 1920, 1080);
        const D = lay.districts, last = D[D.length - 1];

        // The camera: a slow push, then the climb away until the city is one point.
        const climb = OM.prog(T, CLIMB, GONE);
        const s = (1 + 0.05 * OM.ease.inOutSine(OM.prog(T, start, CLIMB))) * Math.pow(0.012, OM.ease.inCubic(climb) * 0.6 + climb * 0.4);
        const rot = 0.5 * OM.ease.inCubic(climb);
        const cs = Math.cos(rot) * s, sn = Math.sin(rot) * s;
        ctx.setTransform(dpr * cs, dpr * sn, -dpr * sn, dpr * cs, dpr * (PX - cs * PX + sn * PY), dpr * (PY - sn * PX - cs * PY));

        // The street grid: the handoff's lines, fading as we climb.
        const snap = (v) => Math.round(v * dpr) / dpr;
        ctx.globalAlpha = 1 - OM.prog(climb, 0, 0.5);
        ctx.fillStyle = th['border-subtle'];
        for (let col = L.cMin; col <= L.cMin + L.cols; col++) ctx.fillRect(snap(cellX(col)), 0, 1 / s, 1080);
        for (let row = L.rMin; row <= L.rMin + L.rows; row++) ctx.fillRect(0, snap(cellY(row)), 1920, 1 / s);
        ctx.globalAlpha = 1;

        // Lots: built out from the avenue, powered in a wave from the key word on the downbeat.
        const t0 = start + 0.06;
        const kx = last ? last.mid : h.col;
        for (const [col, row, hs] of lay.lots) {
          const at = t0 + Math.abs(row - AVE) * 0.018 + hs * 0.35;
          if (T < at) continue;
          const dist = Math.hypot(col - kx, (row - AVE) * 1.2);
          let colr = ink.dim;
          if (T >= DB) {
            const wave = (T - DB) * 220;
            const w2 = T >= KICK2 ? (T - KICK2) * 260 : -1;
            if ((dist < wave && dist > wave - 6) || (dist < w2 && dist > w2 - 5)) colr = ink.lit;
            else if (dist < wave && hs > 0.8) colr = ink.mid;
          }
          ctx.fillStyle = colr;
          block(ctx, col, row);
        }

        // Roads: the avenue lights from the left to each district as it is sung, then end to end.
        const ya = cellY(AVE) + L.ch / 2;
        let reach = 0;
        D.forEach((d, k) => {
          const from = k ? D[k - 1].t0 : start + 0.05;
          const x0 = k ? cellX(D[k - 1].mid) : 0, x1 = cellX(d.mid);
          reach = Math.max(reach, OM.lerp(x0, x1, OM.ease.outCubic(OM.prog(T, from, d.t0))));
        });
        if (last) reach = Math.max(reach, OM.lerp(reach, 1920, OM.ease.outExpo(OM.prog(T, DB, DB + 0.3))));
        ctx.fillStyle = ink.lit;
        ctx.fillRect(0, ya - 2, reach, 4);
        ctx.fillStyle = ink.crest;
        ctx.fillRect(reach - 26, ya - 3, 26, 6);
        for (const d of D) {
          const g = OM.prog(T, d.t0 - 0.05, d.t0);
          if (g <= 0) continue;
          const yd = cellY(d.side < 0 ? d.edge + 1 : d.edge);
          ctx.fillStyle = T >= d.t0 ? ink.lit : ink.crest;
          const xm = cellX(d.mid) + L.cw / 2 - 2;
          if (d.side < 0) ctx.fillRect(xm, OM.lerp(ya, yd, g), 4, ya - OM.lerp(ya, yd, g));
          else ctx.fillRect(xm, ya, 4, OM.lerp(ya, yd, g) - ya);
        }

        // Districts: the power reaches the word at its onset and spreads out block by block.
        for (const d of D) {
          const age = T - d.t0;
          if (age < 0) continue;
          const key = d === last;
          for (const [col, row, dd] of d.cells) {
            const a = age - dd * 0.0022;
            if (a < 0) continue;
            const pulse = key && T >= DB ? Math.exp(-(T - DB) / 0.2) : 0;
            ctx.fillStyle = a < 0.07 || pulse > 0.5 ? ink.crest : OM.hash(col, row, 3) < 0.3 ? ink.hover : ink.crest;
            block(ctx, col, row);
          }
        }

        // The city as one spark: the halo comes up as the city collapses into it.
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const sp = OM.prog(climb, 0.55, 1);
        if (sp > 0) {
          P.pool(ctx, PX, PY, 72, ink.lit, 0.4 * sp);
          ctx.globalAlpha = sp;
          ctx.fillStyle = ink.crest;
          OM.cell(ctx, L, h.col, h.row, dpr);
          ctx.globalAlpha = 1;
        }
      },
      release: () => c.release(),
    };
  },
});
