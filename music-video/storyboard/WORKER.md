# Scene builder contract

You are building scenes for a 4K music video for "We Can Fix Everything (The Ultimate Machine)",
the Omarchy anthem, made entirely in code and themed after the omarchy.org homepage. The goal is
work that impresses DHH: precise, restrained, on-brand, with real motion craft. Every scene is one
lyric line (or an instrumental beat) with ONE signature idea that appears nowhere else in the film.

Project: `music-video/` in this repo (HyperFrames). Read before writing:
- `storyboard/scenes.json`: your scenes' `idea`, `device`, `theme`, `tech`, `sync`. The spec is the brief; make it great.
- `assets/lib/om.js`, `assets/lib/kit.js`, `assets/lib/stage.js`: the shared kit (read them; do not edit them; ask in your report if you need a kit change).
- Reference scenes: `assets/scenes/i-01.js`, `i-02.js`, `c1-03.js`; Three.js reference `assets/scenes/v2-05.js`.
- Site details: the omarchy.org homepage (its palettes and hero field are already ported into the kit).

## Hard rules (a scene that breaks one is rejected)

1. **The sung words come from the lyrics file.** A line scene draws its own words through `OM.sung(id)` (text from `assets/lib/lyrics.js`, built from `lyrics.txt`), never hard-coded; timing comes from `OM.line(id)` / `OM.word(id, k)`. Other on-screen words: Omarchy brand strings (Omarchy, omarchy.org, Omarchy 4.0.4), the song title, theme names, real Omarchy keybinds/commands/app names, generic UI labels you invent, numbers, the copy already on the omarchy.org homepage. No third-party logos or copyrighted characters/artwork.
2. **On theme only.** The film's palette is **Tokyo Night** (the homepage default, green on #0e0e14). Use another of the 22 site themes only when switching themes is the scene's idea. Every color comes from `OM.theme(id)` tokens / `OM.fieldInks(id)` of the scene's theme (`assets/lib/themes.js`, the site's 22 palettes). Type is `'JetBrains Mono'` (weights 100-800). Square corners (border-radius 0) unless the spec says the element is deliberately foreign. The pixel lattice is the recurring motif. Banned: glitch/RGB split, chromatic aberration, scanlines, film grain, vignette, lens flare, bloom haze, drop shadows (a 1px ring like the site's `--t-elevation` is fine), rainbow gradients, emoji, generic stock-motion. No full-frame overlay layer.
3. **Your device only.** Build the scene's `device`. Do not reuse another scene's signature move (the ledger is the `device` column of scenes.json). Supporting motion inside your scene is fine.
4. **Deterministic.** `render(t, T)` must be a pure function of time. No `Math.random`, `Date.now`, `performance.now`, `requestAnimationFrame`, `setTimeout`, CSS animations/transitions, or network. Randomness: `OM.rng(seed)` / `OM.hash(x, y, seed)` used in `build()` to precompute; never advance an RNG inside `render()`. Anything that accumulates over time (physics, cellular automata) must be precomputed in `build()` or recomputed from t.
5. **Every sung word lands a hit.** For a line scene, each word onset (`OM.words(id)` / `OM.wordAt(id, T)`) must visibly drive something in the scene's own device (a cell lands, a key goes down, a window spawns, a flap turns). The line is never just a backdrop under the vocal.
6. **Sync to the music.** Use the measured timing, never guessed seconds: `OM.line(id).start/end`, `OM.word(id, k)` (global seconds of word k, 0-based), `OM.beatsIn(a, b)`, `OM.downbeatsIn(a, b)`, `OM.SPB`, `OM.pulse(hits, T, half)`, `OM.audio(T)` -> `{ bands[16], vocal, kick }`. Key hits land on the word/beat within one frame. Build in global time `T` when syncing (render gets `t` local and `T` global).

## Scene API

```js
OM.scene({
  id: 'v2-01',
  build(el, { start, duration, id }) {
    // el: the scene's full-frame <section> (1920x1080 CSS px; rendered at 2x for 4K).
    // Build DOM/canvas/WebGL here. Called when the scene becomes active.
    return {
      render(t, T) { /* t = seconds into the scene, T = global seconds */ },
      release() { /* free canvases (c.release()), WebGL (gl.release()) */ },
    };
  },
});
```

- Canvas: `const c = OM.canvas(canvasEl, { alpha: false })`; in render `const ctx = c.ensure()` (draw in CSS px, `c.dpr` for snapping). Canvas element gets `className = 'om-fill'`.
- Lattice: `OM.HOME` (the film's lattice, cells ~14.6x14.3px, wordmark at x 370, y 404), `OM.cell(ctx, L, col, row, dpr)`, `OM.cellAt(L, x, y)`, `OM.lattice({...})` for other scales.
- Hero material: `OM.hero(ctx, T, dpr, { inks: OM.fieldInks(theme), L, mode, word, gain, levels, mask, glows, stamps, bands })`, `OM.paintWord`, `OM.stamp`, `OM.spritePath`, `OM.WORDMARK`, `OM.LOGO`, `OM.MARK_PATH`, `OM.MARK_STROKES`.
- Desktop: `OM.desktop(ctx, x, y, w, h, theme, { windows, active, s, seed, contents, bar })`, `OM.dwindle(...)`.
- Three.js: `const gl = OM.three(el)` -> `{ renderer, canvas, release }`; global `THREE` (r181). Render in `render()`; dispose geometries/materials in `release()`. Keep it lean: instancing, no shadow maps over 2048, no post-processing passes.
- DOM + GSAP: build a scene-local `gsap.timeline({ paused: true })` in `build()` and call `tl.seek(t, false)` in render. Use `fromTo` with every from-property also in to. Never register timelines on `window.__timelines`. Style with a `<style>` element you append inside `el`, with selectors prefixed by your scene id (e.g. `.v201-...`). Use `el.querySelector`, not `document`.
- Fonts in canvas: `ctx.font = "500 40px 'JetBrains Mono'"` (fonts are loaded before render starts).

## Quality bar

- Beautiful as a still at its most visible moment; generous negative space; type aligned to the lattice where it makes sense.
- Motion with intent: expo/cubic eases, anticipation and settle; nothing linear unless mechanical; no limp fades as the main move.
- The scene's first frame is a deliberate entrance (it hard-cuts in on the beat from the previous scene), and its last frame is a clean hold or a handoff the next scene can follow.
- Text sizes readable at 1080p: headings 56px+, labels 20px+.
- Performance: under ~150ms per frame at 4K (2x DPR). Avoid per-frame allocation of big arrays; precompute.

## Verify your own work (required)

From the project dir: `node scripts/assemble.mjs` once (only needed if index.html is missing your scene, it normally loads `assets/scenes/<id>.js` automatically), then
`npx hyperframes snapshot --at <global times> --no-end -o .hyperframes/check-<id>`
at the scene's start, each sync hit, the middle and the end, and LOOK at the PNGs / `contact-sheet.jpg` with your image reader. Fix what is off. Also run `npx hyperframes lint` and make sure your file adds no errors. Do not run full renders.

## Report

When done, report per scene: file path, what you built in two lines, the times you checked, anything you are unsure of. Do not edit files outside `assets/scenes/<your ids>.js` (and optional `assets/scenes/<id>.data.js` for precomputed data).
