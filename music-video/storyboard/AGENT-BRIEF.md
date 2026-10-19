# Agent brief: build one scene

You are building ONE scene of a code-built 4K music video for the Omarchy anthem
(Omarchy is DHH's Arch + Hyprland Linux setup, omarchy.org). The film is a
HyperFrames composition: one HTML page, one JS file per scene, rendered frame by
frame. Your scene is one sung line, about 3 to 5 seconds. Other agents build the
other scenes at the same time and you never see theirs: you connect to them
through agreed **handoff frames**.

## Where things are

- Project: `music-video/` in this repo (run every command below from there)
- **Your file: `assets/scenes/<id>.js`. It is the only file you may create or edit.**
- API to read: `assets/lib/om.js` (math, easing, lattice, inks, canvas),
  `assets/lib/kit.js` (line and word timing, beats and `OM.beatOnset`, the drums
  measured on the song (`OM.T.drums`, `OM.T.beatsOn`), the edit camera and
  `OM.edit.plan` (AGENTS.md rule 10), the beat jiggle `OM.jiggle`, audio, hero
  field, wordmark painter),
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
  aligned onset and end in global seconds. The text loads from
  `assets/lib/lyrics.js`, built from `lyrics.txt`.
- **Never hard-code the words** in scene code: take them from `OM.sung(id)`, so a
  lyric fix reaches your scene. Work with word indices, measure text at runtime
  (`ctx.measureText`), and design for any word length (2 to 10 letters).
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
  and the key word gets the biggest moment. Put a hit on a beat-grid time through
  `OM.beatOnset(t)` (the grid runs about 46 ms late; this returns the drum onset).
  Kick and snare event times are already on the drum.
- **Keep the words whole.** Never under the 40 px border band, never covered or
  struck through by your props, no stray shape in the gap between two words.

## Checking your work

```bash
node --check assets/scenes/<id>.js
```

Snapshots share the CPU with everyone, so always run them through the lock, at low
priority, and only at times inside your window:

```bash
flock /tmp/omv-snap.lock nice -n 19 npx hyperframes snapshot --at <t1,t2,...> --no-end --timeout 60000 -o .hyperframes/agent-<id>
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
- **Timing accuracy:** the beat grid (beats and downbeats) runs about 46 ms late
  against the real drums, measured across the whole song. Kick and snare events
  and word onsets are accurate (all analysis times sit on 23 ms frames). For a
  hard visual hit, use the kick or snare event, or wrap the grid time in
  `OM.beatOnset(t)`, which returns that beat's drum onset. Never key a hit to a
  raw grid time.
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
- Report (150 words or less): one line per scene with its device name
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

## Report back (120 words or less)

- Device name (8 words or less, unique in the film).
- One sentence: the idea, and how the words drive it.
- The hits you used (times).
- Anything that needs fixing outside your file.

## Pause sprinkles pass

After a line's last word the frame can sit for 1 to 3 s until the cut. Fill that
pause, and any gap of 0.8 s or more inside a line, with small extra touches timed
to the music.

- **Additive only.** These stay exactly as they are: each word's arrival, the
  read hold (at least 0.4 s after the last word lands, with the whole line still),
  the exit into the out-handoff, and the cut frames. No new devices, no rebuilds.
- **Every kick and snare in the pause gets a visible accent that grows out of
  the scene's own device and objects.** A crane's cable swings and a rivet sparks
  on the kick; a skyline's windows twinkle on the hats. No generic overlays (glint
  sweeps, particle bursts, bloom pulses, flashes) unless they come from the
  scene's own objects. A pause with no kicks or snares rides the hi-hat rolls or
  the energy (`npm run facts <id>`).
- **A touch in a mid-line gap never delays or covers a word.**
- **The line stays readable.** The accents go around it or on it, never over it,
  and everything eases to rest for the exit as before.
- **Optional:** in the last ~0.4 s before the exit, a small anticipation of what
  comes next, with the out-handoff unchanged.
- **Same rules as ever:** pure function of T, Tokyo Night, 12 ms per frame
  (extra draws and particles are the usual cost, so time it), at most 2
  snapshot rounds per scene through the flock.
- **Report each sprinkle by name,** with the hits it lands on. Names are unique
  across the film, because nothing repeats.

## Match cuts and explosions pass

The owner loved the b-05 to b-06 melt and the c3-01 explosion and wants more of
both.

- **Match cuts:** convert your listed cuts so they no longer pass through an
  empty frame (black, a lone dot, a thin line). The outgoing scene's main object
  or material visibly becomes the incoming scene's, continuously, landing on the
  beat. The cut frame is a shared state that both scenes draw identically. No
  fades, dims, blur crossfades or trips through black. Every word's onset and
  the read holds stay.
- **Explosions:** on your section's biggest hit, use your assigned style, which
  is unique in the film. It starts within one frame of the hit, and the words
  read again within 0.2 s. Particles are analytic, on palette, within budget.
  Square shockwaves are taken (i-03, c3-01, c3-09), so don't reuse them.
- **Timing:** kick and snare events, or grid − 0.046 s.
- **Checks:** both cut pairs at ±4 ms, frames across each new transition, and at
  most 3 snapshot rounds.
- **Report:** the name of each transition and explosion, with its hits.
