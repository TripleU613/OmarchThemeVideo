// v2-05 · Keycap typing. Out of the dark a 3D board comes up under a low
// gliding camera, and the line is typed on it: each word's letters press their
// caps in a quick run starting exactly on the word's onset, every press firing a
// beam from the cap up to its slot in the line above, where the letter lands in
// crest and cools. The space bar thumps between words. On the last word the
// whole line is pulled down into one point of light, the board goes dark, and
// the spark is the cut into v2-06.
OM.ownWords.add('v2-05');
OM.scene({
  id: 'v2-05',
  build(el, { start, duration }) {
    const V = OM.v2;
    const gl = OM.three(el, { alpha: false });
    const ink = V.ink(), th = V.th();
    const sung = OM.sung('v2-05');
    const END = start + duration;
    // A 60% board: [legend, width in units] per row.
    const ROWS = [
      [['Esc', 1], ['1', 1], ['2', 1], ['3', 1], ['4', 1], ['5', 1], ['6', 1], ['7', 1], ['8', 1], ['9', 1], ['0', 1], ['-', 1], ['=', 1], ['Back', 2]],
      [['Tab', 1.5], ['Q', 1], ['W', 1], ['E', 1], ['R', 1], ['T', 1], ['Y', 1], ['U', 1], ['I', 1], ['O', 1], ['P', 1], ['[', 1], [']', 1], ['\\', 1.5]],
      [['Caps', 1.75], ['A', 1], ['S', 1], ['D', 1], ['F', 1], ['G', 1], ['H', 1], ['J', 1], ['K', 1], ['L', 1], [';', 1], ["'", 1], ['Return', 2.25]],
      [['Shift', 2.25], ['Z', 1], ['X', 1], ['C', 1], ['V', 1], ['B', 1], ['N', 1], ['M', 1], [',', 1], ['.', 1], ['/', 1], ['Shift', 2.75]],
      [['Ctrl', 1.25], ['Super', 1.25], ['Alt', 1.25], ['Space', 6.25], ['Alt', 1.25], ['Fn', 1.25], ['Menu', 1.25], ['Ctrl', 1.25]],
    ];
    const U = 64, GAP = 6;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(ink.bg);
    scene.fog = new THREE.Fog(ink.bg, 900, 2200);
    scene.add(new THREE.HemisphereLight(th.text, ink.bg, 1.3));
    const sun = new THREE.DirectionalLight('#ffffff', 1.5);
    sun.position.set(-300, 900, 500);
    scene.add(sun);
    const plate = new THREE.Mesh(new THREE.BoxGeometry(15.6 * U, 20, 5.6 * U), new THREE.MeshStandardMaterial({ color: th.surface, roughness: 0.8 }));
    plate.position.y = -10;
    scene.add(plate);
    const keys = [];
    const disposables = [plate.geometry, plate.material];
    ROWS.forEach((row, r) => {
      let x = -7.5 * U;
      row.forEach(([label, w]) => {
        const kw = w * U - GAP, kd = U - GAP;
        const kc = document.createElement('canvas');
        kc.width = Math.round(kw * 2);
        kc.height = Math.round(kd * 2);
        const g = kc.getContext('2d');
        const tex = new THREE.CanvasTexture(kc);
        tex.colorSpace = THREE.SRGBColorSpace;
        const paint = (lit) => {
          g.fillStyle = lit ? th.brand : th['surface-2'];
          g.fillRect(0, 0, kc.width, kc.height);
          g.fillStyle = lit ? th['brand-ink'] : th['text-secondary'];
          g.font = `600 ${label.length > 2 ? 22 : 34}px 'JetBrains Mono'`;
          g.textBaseline = 'top';
          g.fillText(label, 14, 12);
          tex.needsUpdate = true;
        };
        paint(false);
        const side = new THREE.MeshStandardMaterial({ color: th['border-strong'], roughness: 0.6 });
        const top = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.5 });
        const geo = new THREE.BoxGeometry(kw, 30, kd);
        const mesh = new THREE.Mesh(geo, [side, side, top, side, side, side]);
        mesh.position.set(x + (w * U) / 2, 15, (r - 2) * U);
        scene.add(mesh);
        keys.push({ label, mesh, paint, lit: false });
        disposables.push(geo, side, top, tex);
        x += w * U;
      });
    });
    const keyFor = (ch) => {
      const u = ch.toUpperCase();
      return keys.find((k) => k.label === u) || null;
    };
    const space = keys.find((k) => k.label === 'Space');
    const camera = new THREE.PerspectiveCamera(30, 1920 / 1080, 10, 4000);
    camera.setViewOffset(1920, 1080, 0, -170, 1920, 1080); // the board sits low, the line above it

    // The overlay: typed letters, beams, the fade [line] closing spark.
    const ov = document.createElement('canvas');
    ov.className = 'om-fill';
    ov.style.position = 'absolute';
    ov.style.inset = '0';
    el.appendChild(ov);
    const oc = OM.canvas(ov, { alpha: true });

    // Every letter's press time: a run from its word's onset, quick enough to finish inside the word.
    let F = null, P = null;
    const plan = () => {
      F = V.layout(sung, { cap: 66, maxW: 1640, cx: 960, cy: 205, lead: 1.55 });
      P = [];
      sung.forEach((w, k) => {
        const n = Math.max(1, w.text.length);
        const dt = OM.clamp((w.t1 - w.t0) / n, 0.028, 0.065);
        [...w.text].forEach((ch, j) => P.push({ k, j, ch, at: w.t0 + j * dt, key: keyFor(ch), x: F.at[k].x + (j + 0.5) * F.A, cy: F.at[k].cy }));
      });
    };
    const SUCK = Math.min(sung[sung.length - 1].t1, END) - 0.16; // the line collapses into the spark
    const SPK = { x: OM.HOME.x0 + (OM.cellAt(OM.HOME, 960, 540).col + 0.5) * OM.HOME.cw, y: OM.HOME.y0 + (OM.cellAt(OM.HOME, 960, 540).row + 0.5) * OM.HOME.ch };
    const v = new THREE.Vector3();

    return {
      render(t, T) {
        const o = oc.ensure();
        o.clearRect(0, 0, 1920, 1080);
        if (T < start + V.HOLD_IN) return OM.handoff('night', o, T, oc.dpr);
        if (T >= END - V.HOLD_OUT) return OM.handoff('spark', o, T, oc.dpr);
        if (!P || !V.met().ok) plan();
        // Keys: down for 0.11 s from each press; the space bar on every word after the first.
        const down = new Set();
        for (const p of P) if (p.key && T >= p.at && T < p.at + 0.11) down.add(p.key);
        sung.forEach((w, k) => { if (k && T >= w.t0 - 0.06 && T < w.t0 + 0.04) down.add(space); });
        keys.forEach((k) => {
          const pressed = down.has(k);
          k.mesh.position.y = pressed ? 5 : 15;
          if (pressed !== k.lit) { k.paint(pressed); k.lit = pressed; }
        });
        // A low glide along the board across the line.
        const p = OM.ease.inOutSine(OM.clamp(t / duration));
        camera.position.set(OM.lerp(-380, 340, p), 430, 760);
        camera.lookAt(OM.lerp(-160, 140, p), 0, -20);
        camera.updateMatrixWorld();
        gl.renderer.render(scene, camera);

        const suck = OM.ease.inExpo(OM.prog(T, SUCK, END - V.HOLD_OUT));
        // Dark over the board: fading up from the night, and back down into the spark.
        const dark = Math.max(1 - OM.ease.outCubic(OM.prog(T, start + V.HOLD_IN, start + 0.3)), OM.ease.inCubic(OM.prog(T, SUCK - 0.1, END - V.HOLD_OUT)));
        if (dark > 0) {
          o.fillStyle = V.rgba(ink.bg, dark);
          o.fillRect(0, 0, 1920, 1080);
        }
        // Beams from each pressed cap to its letter's slot.
        for (const q of P) {
          const age = T - q.at;
          if (!q.key || age < 0 || age > 0.16 || suck > 0) continue;
          v.set(q.key.mesh.position.x, 30, q.key.mesh.position.z).project(camera);
          const kx = (v.x + 1) * 960, ky = (1 - v.y) * 540;
          const a = 1 - age / 0.16;
          const g = o.createLinearGradient(kx, ky, q.x, q.cy);
          g.addColorStop(0, V.rgba(ink.lit, 0.9 * a));
          g.addColorStop(1, V.rgba(ink.crest, 0.15 * a));
          o.strokeStyle = g;
          o.lineWidth = 3;
          o.beginPath();
          o.moveTo(kx, ky);
          o.lineTo(q.x, q.cy + F.capPx / 2);
          o.stroke();
          V.pool(o, kx, ky, 60, 30, ink.lit, 0.5 * a);
        }
        // The typed line: each letter lands in crest on its press and cools to text.
        o.font = F.font;
        o.textAlign = 'center';
        o.textBaseline = 'alphabetic';
        for (const q of P) {
          const age = T - q.at;
          if (age < 0) continue;
          const s = 1 + 0.3 * Math.exp(-age / 0.06);
          const x = OM.lerp(q.x, SPK.x, suck), y = OM.lerp(q.cy, SPK.y, suck);
          o.save();
          o.translate(x, y);
          o.scale(s * (1 - suck), s * (1 - suck));
          o.fillStyle = OM.mix(ink.crest, th.text, OM.clamp(age / 0.3));
          o.fillText(q.ch, 0, F.capPx / 2);
          o.restore();
        }
        // The spark gathering as the line is pulled in.
        if (suck > 0) {
          V.pool(o, SPK.x, SPK.y, 72, 72, ink.lit, 0.4 * suck);
          o.fillStyle = V.rgba(ink.crest, suck);
          OM.cell(o, OM.HOME, OM.cellAt(OM.HOME, 960, 540).col, OM.cellAt(OM.HOME, 960, 540).row, oc.dpr);
        }
      },
      release: () => { disposables.forEach((x) => x.dispose()); gl.release(); oc.release(); },
    };
  },
});
