// i-02 · Dawn behind the name. It opens on i-01's horizon: the night, one mid
// line, the cursor on it. Stars come out over the first bar. On the 9.27
// downbeat the cursor ignites and a flash runs out along the horizon; the sun
// rises from it behind the wordmark, which stands on the horizon as a dark
// mountain range, rim-lit. The light is the homepage field's own dither, and
// the letters cut it into shafts: each sky cell is shadowed where a letter
// stands between it and the sun, so rays stream up through the gaps and the
// counters. The 12.93 kick bursts the shafts; the downbeats pulse them and the
// snares flick the stars, which fade as the sky fills. A lake below mirrors
// it. The dawn holds from 19.96, the frame i-03 opens on (OM.intro.dawn).
OM.scene({
  id: 'i-02',
  build(el) {
    const cv = document.createElement('canvas');
    cv.className = 'om-fill';
    el.appendChild(cv);
    const c = OM.canvas(cv, { alpha: false });
    return {
      render(t, T) {
        const ctx = c.ensure();
        OM.intro.dawn(ctx, T, c.dpr);
      },
      release: () => c.release(),
    };
  },
});
