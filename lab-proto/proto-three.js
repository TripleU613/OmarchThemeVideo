// Prototype: the 15x15 mark as lit voxels, orbiting. Benchmarks WebGL at 4K.
OM.scene({
  id: 'proto-three',
  build(el, { duration }) {
    const gl = OM.three(el);
    const th = OM.theme('tokyo-night');
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(th['field-bg']);
    const camera = new THREE.PerspectiveCamera(32, 1920 / 1080, 0.1, 200);
    const cells = OM.cells(OM.LOGO);
    const geo = new THREE.BoxGeometry(0.92, 0.92, 0.92);
    const mat = new THREE.MeshStandardMaterial({ color: th['field-lit'], roughness: 0.45, metalness: 0.1 });
    const mesh = new THREE.InstancedMesh(geo, mat, cells.length);
    const m = new THREE.Matrix4();
    const color = new THREE.Color();
    const inks = OM.inks('tokyo-night');
    cells.forEach(([c, r], i) => {
      m.makeTranslation(c - 7, 7 - r, 0);
      mesh.setMatrixAt(i, m);
      mesh.setColorAt(i, color.set(inks[4 - Math.floor((r / 15) * 5)]));
    });
    scene.add(mesh);
    scene.add(new THREE.HemisphereLight(th['field-crest'], th['field-bg'], 1.6));
    const key = new THREE.DirectionalLight('#ffffff', 2.2);
    key.position.set(6, 10, 12);
    scene.add(key);
    return {
      render(t) {
        const p = t / duration;
        const a = -0.9 + p * 1.6;
        camera.position.set(Math.sin(a) * 30, 4 + Math.sin(p * 3.1) * 2, Math.cos(a) * 30);
        camera.lookAt(0, 0, 0);
        mesh.rotation.z = p * 0.25;
        gl.renderer.render(scene, camera);
      },
      release: () => {
        geo.dispose();
        mat.dispose();
        gl.release();
      },
    };
  },
});
