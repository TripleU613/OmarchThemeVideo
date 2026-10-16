# Agent brief: build one scene

You are building ONE scene of a code-built 4K music video for the Omarchy anthem
(Omarchy is DHH's Arch + Hyprland Linux setup, omarchy.org). The film is a
HyperFrames composition: one HTML page, one JS file per scene, rendered frame by
frame. Your scene is one sung line, about 3 to 5 seconds. Other agents build the
other scenes at the same time and you never see theirs: you connect to them
through agreed **handoff frames**.

## Where things are

- Project: `/home/tripleu/Omarchy Video/music-video`
- **Your file: `assets/scenes/<id>.js`. It is the only file you may create or edit.**
- API to read: `assets/lib/om.js` (math, easing, lattice, inks, canvas),
  `assets/lib/kit.js` (line and word timing, beats, audio, hero field, wordmark painter),
  `assets/lib/handoff.js` (handoff frames and the lyric helper).
- Idioms worth copying: `assets/scenes/i-04.js` (layered canvas, float blur, type
  rasterized into cells), `assets/scenes/v1-08.js`, `assets/scenes/c1-03.js`.
- The whole film's ideas, for context: `storyboard/IDEAS.md`.

## Scene contract

```js
OM.ownWords.add('<id>'); // top of file: you draw your line's words, so the caption bar stays out
OM.scene({
  id: '<id>',
  build(el, { start, duration }) { // start: your window's start (global seconds); duration: its length
    const cv = document.createElement('canvas');
    cv.className = 'om-fill';
    el.appendChild(cv);
    const c = OM.canvas(cv, { alpha: false }); // draw in 1920x1080 CSS px; dpr is applied (2 at 4K)
    return {
      render(t, T) { const ctx = c.ensure(); const dpr = c.dpr; /* T = global song time */ },
      release: () => c.release(),
    };
  },
});
```

- `render` must be a **pure function of T**. The renderer seeks to any frame in any
  order, so nothing carried between frames may change the picture. No
  `Math.random`, `Date`, `performance.now`: use `OM.rng(seed)` or `OM.hash(x, y, s)`.
- Three.js is loaded (`OM.three(el, ...)`, see `assets/lib/stage.js`) if the idea needs real 3D.
- Budget: 12 ms per frame or less at 1080p.

## Handoffs: how your scene connects

`OM.handoff(name, ctx, T, dpr)` paints an agreed frame as the whole picture.
The names are night, spark, glow, field, word, screen, grid, line and spot; read
`handoff.js` for their exact geometry.

- For the first couple of frames from your window start, your frame must be
  **exactly** `OM.handoff(<in>)`. For the last couple of frames before your window
  end, **exactly** `OM.handoff(<out>)`. Everything between is yours.
- The neighbouring scene ends or starts on the same frame, so the hard cut is
  invisible. Show nothing at a cut that isn't in the handoff.
- Best: make the handoff's element **become** your subject, as a match cut (the
  spark becomes the light that enters the crack). Weakest: fading through it.

## The lyrics ARE the motion

- `OM.sung(id)` returns `[{ text, space, t0, t1 }]`: your line's words with their
  aligned onset and end in global seconds. The text loads from the user's lyrics
  file at runtime.
- **Never type the lyric words** in code, comments or your report. Never open
  `lyrics.txt` or `assets/lib/lyrics.js`. Work with word indices, measure text at
  runtime (`ctx.measureText`), and design for any word length (2 to 10 letters).
  You will see the real words in your snapshots. That's fine; don't transcribe them.
- **The words are not a caption.** No text parked below the picture. The words
  are the material the idea acts on: the cracks that get filled, the parts that
  get assembled, the trace that gets drawn. Test: if you removed the words, the
  idea should stop working.
- Each word arrives **on its onset `t0`** (within a frame) and with visible force.
  The whole line reads together for a moment before it leaves. Clear the words
  before your out-handoff.
- Legibility: final letters about 60px cap height or more, high contrast
  (crest, hover or text ink on the dark).
- Type: JetBrains Mono (weights 100 to 800 are loaded; wait on
  `document.fonts.load` before rasterizing), or letters built from lattice cells.

## Look and rules

- **Tokyo Night only.** Field background `#0e0e14` (`ink.bg`); field inks dim
  `#39482e`, mid `#678549`, lit `#9ece6a`, hover `#bbdd97`, crest `#daecc6`
  (`OM.fieldInks('tokyo-night')`); theme tokens from `OM.theme('tokyo-night')`
  (text `#c0caf5`, text-secondary, text-muted, brand, surface, surface-2,
  border-subtle, border-strong, bg).
- Drawn as **lattice light and clean silhouettes**: square, precise, crisp.
  Never photoreal, never clip-art, no copyrighted characters.
- Never replay omarchy.org's own animations: the ttfx text effects on the wordmark,
  the screensaver, the hero's click stamp, roaming sprite or music spectrum, or the
  site's theme wipe. No wordmark unless your brief says so. No full-frame overlay shader.
- **Hit the music.** Your brief lists the downbeats, kicks and rolls in your window,
  and the key word gets the biggest moment.

## Checking your work

```bash
cd "/home/tripleu/Omarchy Video/music-video" && node --check assets/scenes/<id>.js
```

Snapshots share the CPU with everyone, so always run them through the lock, at low
priority, and only at times inside your window:

```bash
cd "/home/tripleu/Omarchy Video/music-video" && flock /tmp/omv-snap.lock nice -n 19 npx hyperframes snapshot --at <t1,t2,...> --no-end --timeout 60000 -o .hyperframes/agent-<id>
```

Then Read `.hyperframes/agent-<id>/contact-sheet.jpg`: one image, and single frames
only when you must. Check that the first frame equals the in-handoff, the last
frame equals the out-handoff, each word lands on its onset, the idea reads from
stills, nothing is clipped, and no error card appears. Use at most 3 snapshot
rounds. Don't run assemble and don't edit any other file; the orchestrator does that.

## Section mode (you own several consecutive scenes)

- Your files: `assets/scenes/<id>.js` for each scene in your section, and only those.
- Facts: `node scripts/scene-facts.mjs <id> <id> ...` prints each scene's window, its
  word timings (timing only) and the music inside it.
- Ideas: your section in `storyboard/IDEAS.md`. Scenes marked **keep** get refined:
  keep their device, give their words the words-as-motion treatment, and meet the cuts.
- The approved bar is chorus 1: read a couple of `assets/scenes/c1-0*.js` to see
  how the words become the material of each idea.
- Every cut in the film is a hard cut. Your first scene starts exactly on your
  section's in-handoff and your last scene ends exactly on its out-handoff (given in
  your prompt). Inside your section you design the cuts yourself: the last frame of
  one scene and the first frame of the next must be the same picture. Use a library
  handoff, or a shared state both scenes draw identically.
- Shared code: scene files load in timeline order, so you may define helpers on
  `OM.<section>` in your first scene file and use them in the later ones. Don't edit
  lib files.
- Music-only scenes are full set pieces with no words.
- Budget: at most 2 snapshot rounds per scene. Batch timestamps for several scenes
  into one snapshot run.
- Report (150 words or less, no lyric text): one line per scene with its device name
  (unique) and key hits, plus anything that needs fixing outside your files.

## Camera and effects pass

Each scene gets the camera move, signature shader and extras from its row in
`storyboard/FX.md`. Read that file's rules first.

- **Engine:** `assets/lib/post.js`. In `build`, create `const fx = OM.post(el, c, { effect: GLSL })`
  after your `OM.canvas`. At the end of `render`, call
  `fx.apply(T, { amount, cam: { zoom, rot, x, y }, p0: [...4], p1: [...4] })`.
  In `release`, call `fx.release()` before `c.release()`.
- **The shader:** your GLSL defines `vec4 effect(vec2 uv)` using `src(uv)`, `cam(uv)`,
  `uTime`, `uAmount`, `uRes`, `uP0`, `uP1`, `hash()` and `vnoise()`. uv's origin is
  bottom-left. Keep it on palette, and when it's off it must return
  `src(cam(uv))` exactly.
- **At the cuts:**
  - `amount` must be 0 for the cut frames: use
    `OM.post.envelope(T, start, end, { ramp, hold })`.
  - At your section's first and last cut, the camera must be at rest too (zoom 1,
    rot 0, x 0, y 0). With both at rest, `fx.apply` shows the raw 2D frame and
    the handoff stays exact.
  - Inside your section, the camera may carry through a cut, as long as both
    scenes compute the same camera at the cut time with continuous speed.
- **Overscan:** a zoom of 1 or more never shows past the frame's edge. If you
  rotate or shift, zoom in enough to cover the corners. As a rough guide, a
  2-degree roll needs about 1.04, and a 40px shift needs about 1.045.
- **Extras:** drawn in your 2D canvas, before `fx.apply`, as pure functions of T:
  particles computed from time and a seed, never simulated frame to frame.
- **Words:** they stay readable at every onset and while the line reads
  together, so ease the effect off them.
- **Checks (2 snapshot rounds per scene at most):** snapshot each cut 4 ms either
  side (the two frames must match), and each cut at -0.25, -0.1, +0.1 and +0.25 s
  (the motion must flow, with no jump at the cut). Add your scene's peak effect
  moment too.

## Report back (120 words or less, no lyric text)

- Device name (8 words or less, unique in the film).
- One sentence: the idea, and how the words drive it.
- The hits you used (times).
- Anything that needs fixing outside your file.
