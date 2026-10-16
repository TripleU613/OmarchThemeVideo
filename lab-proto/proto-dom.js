// Prototype: DOM type on a scene-local GSAP timeline, plus anime.js drawing
// the mark's strokes, both seeked from local time.
OM.scene({
  id: 'proto-dom',
  build(el, { duration }) {
    el.innerHTML = `
      <div class="pd-wrap">
        <svg class="pd-mark" viewBox="0 0 1200 1200">${OM.MARK_STROKES.map((d) => `<path d="${d}"/>`).join('')}</svg>
        <h1 class="pd-title">Beautiful, fun &amp; agentic Linux</h1>
      </div>`;
    const tl = gsap.timeline({ paused: true });
    tl.fromTo(el.querySelector('.pd-title'), { yPercent: 110, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.7, ease: 'expo.out' }, 0.3);
    const paths = [...el.querySelectorAll('.pd-mark path')];
    const draws = paths.map((p, i) => {
      const len = p.getTotalLength();
      p.style.strokeDasharray = len;
      return anime.animate(p, { strokeDashoffset: [len, 0], duration: 900, delay: i * 120, ease: 'inOutCubic', autoplay: false });
    });
    return {
      render(t) {
        tl.seek(t, false);
        for (const d of draws) d.seek(t * 1000);
      },
    };
  },
});
