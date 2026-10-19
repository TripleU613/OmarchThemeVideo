// Live dev player for dev.html: plays the real scenes against the song in real
// time, no rendering. Space play/pause · ←/→ 2s · Shift+←/→ prev/next scene ·
// ,/. one frame · L loop scene · M mute. The time lives in the URL (#t=81.25).
(function () {
  const OM = window.OM;
  const audio = document.getElementById('song');
  const root = document.getElementById('root');
  const view = document.getElementById('view');
  const meta = window.OM_SCENES;
  const scenes = [...root.querySelectorAll('section.scene')].map((el) => {
    const start = +el.dataset.start;
    return { el, id: el.id.slice(2), start, end: start + +el.dataset.duration, ...meta[el.id.slice(2)] };
  });
  const D = Math.max(window.OM_TIMING.duration, ...scenes.map((s) => s.end)); // the film can outrun the song
  const $ = (s) => document.querySelector(s);
  const fmt = (t) => `${Math.floor(t / 60)}:${(t % 60).toFixed(2).padStart(5, '0')}`;
  const sceneAt = (t) => scenes.findLast((s) => t >= s.start && t < s.end) || scenes[scenes.length - 1];

  // Fit the 1920x1080 root into the view.
  function fit() {
    const b = view.getBoundingClientRect();
    const s = Math.min(b.width / 1920, b.height / 1080);
    root.style.transform = `translate(${(b.width - 1920 * s) / 2}px, ${(b.height - 1080 * s) / 2}px) scale(${s})`;
  }
  new ResizeObserver(fit).observe(view);

  // Scrubber: one segment per scene, in its theme's brand color; slates hatched.
  const bar = $('#scrub');
  const brandOf = (theme) => {
    const id = String(theme).split(/[^a-z0-9-]+/)[0];
    return (OM.THEMES[id] || OM.THEMES['tokyo-night']).brand;
  };
  for (const s of scenes) {
    const seg = document.createElement('i');
    seg.style.flexGrow = s.end - s.start;
    seg.style.setProperty('--c', brandOf(s.theme));
    if (!s.built) seg.className = 'slate';
    seg.title = `${s.id} · ${fmt(s.start)} · ${s.device}`;
    bar.appendChild(seg);
  }
  const head = document.createElement('b');
  bar.appendChild(head);
  const seekFromBar = (e) => seek(((e.clientX - bar.getBoundingClientRect().left) / bar.clientWidth) * D);
  let dragging = false;
  bar.addEventListener('pointerdown', (e) => { dragging = true; bar.setPointerCapture(e.pointerId); seekFromBar(e); });
  bar.addEventListener('pointermove', (e) => dragging && seekFromBar(e));
  bar.addEventListener('pointerup', () => (dragging = false));

  // Scene list.
  const list = $('#list');
  for (const s of scenes) {
    const row = document.createElement('button');
    row.innerHTML = `<span class="id"></span><span class="at"></span><span class="dev"></span>`;
    row.querySelector('.id').textContent = s.id;
    row.querySelector('.at').textContent = fmt(s.start);
    row.querySelector('.dev').textContent = s.device;
    if (!s.built) row.classList.add('slate');
    row.onclick = () => seek(s.start + 0.001);
    s.row = row;
    list.appendChild(row);
  }

  let t = Math.min(D, Math.max(0, parseFloat((location.hash.match(/t=([\d.]+)/) || [])[1]) || 0));
  let loop = null;
  let shown = -1;
  let current = null;

  function show(time) {
    for (const s of scenes) s.el.style.display = time >= s.start && time < s.end ? '' : 'none';
    OM.tick(time);
    shown = time;
    const s = sceneAt(time);
    head.style.left = `${(time / D) * 100}%`;
    $('#time').textContent = `${fmt(time)} / ${fmt(D)}`;
    if (s !== current) {
      current?.row.classList.remove('on');
      s.row.classList.add('on');
      s.row.scrollIntoView({ block: 'nearest' });
      $('#hud-id').textContent = s.id;
      $('#hud-dev').textContent = s.device;
      $('#hud-theme').textContent = s.theme + (s.built ? '' : ' · slate');
      current = s;
    }
    // One dot per sung word of the scene's line; lit once it has been sung.
    const dots = $('#dots');
    if (s.line) {
      const w = OM.wordAt(s.line, time);
      if (dots.childElementCount !== w.count) dots.replaceChildren(...Array.from({ length: w.count }, () => document.createElement('i')));
      [...dots.children].forEach((d, k) => d.classList.toggle('on', k <= w.index));
      dots.classList.toggle('hit', w.hit > 0.5);
    } else dots.replaceChildren();
    $('#loop').classList.toggle('on', !!loop);
  }

  function seek(time) {
    tailFrom = null;
    t = Math.min(D - 0.001, Math.max(0, time));
    audio.currentTime = t;
    if (loop && (t < loop.start || t >= loop.end)) loop = null;
    show(t);
    history.replaceState(null, '', `#t=${t.toFixed(2)}`);
  }

  // The film can run past the song (scenes.json `tail`): when the audio ends, keep the clock going on wall time.
  let tailFrom = null;
  audio.addEventListener('ended', () => { if (t < D - 0.01) tailFrom = performance.now() - (t - audio.duration) * 1000; });
  function frame() {
    if (tailFrom !== null) {
      t = Math.min(D - 0.001, audio.duration + (performance.now() - tailFrom) / 1000);
      if (t >= D - 0.001) tailFrom = null;
      show(t);
    } else if (!audio.paused) {
      t = audio.currentTime;
      if (loop && t >= loop.end) { audio.currentTime = loop.start; t = loop.start; }
      show(t);
    } else if (t !== shown) show(t);
    requestAnimationFrame(frame);
  }

  const toggle = () => (tailFrom !== null ? (tailFrom = null) : audio.paused ? audio.play() : (audio.pause(), history.replaceState(null, '', `#t=${t.toFixed(2)}`)));
  $('#play').onclick = toggle;
  $('#loop').onclick = () => { loop = loop ? null : { start: current.start, end: current.end }; show(t); };
  audio.addEventListener('play', () => $('#play').classList.add('on'));
  audio.addEventListener('pause', () => $('#play').classList.remove('on'));
  addEventListener('keydown', (e) => {
    if (e.target.closest('input, textarea')) return;
    const i = scenes.indexOf(current);
    if (e.code === 'Space') { e.preventDefault(); toggle(); }
    else if (e.key === 'ArrowRight' && e.shiftKey) seek((scenes[i + 1] || current).start + 0.001);
    else if (e.key === 'ArrowLeft' && e.shiftKey) seek((t - current.start > 0.6 ? current : scenes[i - 1] || current).start + 0.001);
    else if (e.key === 'ArrowRight') seek(t + 2);
    else if (e.key === 'ArrowLeft') seek(t - 2);
    else if (e.key === '.') seek(t + 1 / 30);
    else if (e.key === ',') seek(t - 1 / 30);
    else if (e.key === 'l' || e.key === 'L') $('#loop').click();
    else if (e.key === 'm' || e.key === 'M') audio.muted = !audio.muted;
    else return;
    e.preventDefault();
  });

  // Pasting a new #t= into the address bar seeks without a reload.
  addEventListener('hashchange', () => {
    const h = parseFloat((location.hash.match(/t=([\d.]+)/) || [])[1]);
    if (Number.isFinite(h) && Math.abs(h - t) > 0.005) seek(h);
  });
  // python's http.server ignores Range requests, so Chrome treats the song as a
  // stream it cannot seek: every seek past what has buffered snaps back to 0.
  // Loaded whole into a blob, it is seekable anywhere, whatever serves the page.
  // If the fetch fails it falls back to the plain src (plays, but may not seek).
  const song = fetch(audio.getAttribute('src'))
    .then((r) => (r.ok ? r.blob() : Promise.reject(r.status)))
    .then((b) => {
      audio.src = URL.createObjectURL(b);
      return new Promise((r) => audio.addEventListener('loadedmetadata', r, { once: true }));
    })
    .catch((err) => console.warn('[dev] song not loaded as a blob; seeking may fail:', err));
  $('#time').textContent = 'loading…';
  Promise.all([document.fonts.ready, song]).then(() => {
    fit();
    audio.currentTime = t;
    show(t);
    requestAnimationFrame(frame);
  });
})();
