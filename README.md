# Omarchy Theme Video

A five-minute music video for the Omarchy anthem, *We Can Fix Everything (The
Ultimate Machine)* by Kevin Koontz / REARRANGED, built entirely in code. There's
no video editor, stock footage or generated imagery. It's 66 scenes of JavaScript
drawing on canvas, every sung word timed to the vocal, the whole thing in the
Tokyo Night look of [omarchy.org](https://omarchy.org), rendered to video with
[HyperFrames](https://hyperframes.heygen.com). The one image that isn't drawn
from scratch is the finale's portrait of DHH. It's dot data (220×346 shades,
packed into `x-end.js`) traced from a photo the owner supplied.

This repo is the full project and a worked example of the method, so you can
make one for your own song.

## How it's made

```
song.wav ──► analysis/          stems, word timing, beats      lines.json, audiomap.json
lyrics   ──► lyrics-from-lrc    your words on that timing      lyrics.txt → lyrics.js
ideas    ──► storyboard/        one idea per line              IDEAS.md, scenes.json
         ──► assemble           scene windows and pages        index.html, dev.html, STORYBOARD.md
         ──► assets/scenes/     one JS file per scene          66 scenes, built by agents
         ──► serve / snapshot   watch and check                dev player, contact sheets
         ──► render             frames to MP4                  renders/*.mp4
```

1. **Analyze the song** (`analysis/`, Python). Demucs separates the vocal stem. A
   wav2vec2 forced aligner places every word of the lyric sheet on the vocal
   (`align.py`, `refine.py`, `finalize.py` → `lines.json`, timing only). librosa
   finds beats, downbeats, kicks, snares, rolls and energy (`features.py` →
   `audiomap.json`), and `refine_events.py` measures every drum hit and beat again
   on the song itself, on the attack (`drums.json`).
2. **Bring your lyrics.** Point `npm run lyrics:from` at a word-by-word `.lrc`,
   `.srt` or `.ass` file. Only the words are used; they're placed on the aligned
   timing and checked word for word (`lyrics.txt`), then `npm run lyrics:build`
   writes `assets/lib/lyrics.js`. Both are tracked, with the song.
3. **Write one idea per line.** Every sung line gets a visual metaphor with a
   setup, a turn on the key word and a payoff, and the words are the material it
   acts on. The three choruses escalate: one person and one machine, then a
   crowd and a city, then the world and the sky. See `storyboard/IDEAS.md`.
4. **Assemble.** `storyboard/scenes.json` lists the scenes. `npm run assemble`
   computes each window (a scene starts on the beat at or before its first word)
   and writes `index.html` for rendering, `dev.html` for the live player, and
   `STORYBOARD.md`.
5. **Build the scenes.** Each scene is a pure function of song time drawing on a
   canvas: `OM.scene({ id, build(el, { start, duration }) { return { render(t, T) {} } } })`.
   Scenes cut on agreed **handoff frames** (`assets/lib/handoff.js`): each starts
   exactly on its incoming handoff and ends exactly on its outgoing one. That
   lets scenes built separately, even by different agents at the same time, cut
   together invisibly.
   Each scene also has its own whole-frame camera move and its own GLSL shader
   (`assets/lib/post.js`, planned per scene in `storyboard/FX.md`). The canvas
   runs through that shader on the GPU. At the cuts both ease to rest and the
   pass switches itself off, so the handoff frames stay pixel exact.
   Over every scene, one shared edit camera (the end of `assets/lib/kit.js`) cuts
   the film to the drums measured on the song (`analysis/refine_events.py`): it
   punches in on beats 1 and 3, jolts and rolls on the backbeats, hits harder on
   the beat that lands a cut, and builds through fills into the drops. It is a
   single transform on the whole picture, so it runs straight through the cuts,
   and each scene tunes it in its own window with `OM.edit.plan(id, {...})`.
   Around the picture, a frame-effects layer (`assets/lib/frames.js`) adds one
   beat-synced border idea per section. It runs all the way round in scenes that
   leave an edge empty, and subtler where only some edges are. Under it, a faint
   pixelated fog rims the whole film, breathing on the beat in the colour of the
   picture's edge. To find the empty edges and those colours,
   `scripts/edge-need.mjs` measures a draft rendered without the layer
   (`NO_FRAMES=1 npm run assemble`).
6. **Watch and check.** `npm run serve` opens the live player at
   `http://localhost:3123/dev.html`. Snapshots render exact frames, and seams are
   checked by comparing the frames either side of every cut.
7. **Render.** `npm run render:preview` for a quick draft, `npm run render:4k`
   for the final (`scripts/render-final.mjs`). The final script stops if the
   song or lyrics are still placeholders. It rebuilds and checks the pages,
   renders 4K at 60 fps at low CPU priority, then checks the size, frame rate,
   sound and length of the file. Add `-- --dry-run` to see what it will run.

### Built with agents

The scenes were built by coding agents working from one shared brief
(`music-video/storyboard/AGENT-BRIEF.md`). Chorus 1 went first as a pilot, one
agent per scene. After review, ten agents built the rest of the film in
parallel, one per section, each owning its scenes and designing the cuts inside
its section. An orchestrator fixed the handoffs between sections in advance,
then checked every cut and scene and sent fixes back.

## Make your own

1. Put your song at `music-video/assets/audio/song.wav`, and its lyric sheet in
   `source/song.description` under a line reading `lyrics` (the format
   `analysis/align.py` reads).
2. Run the analysis scripts in `analysis/` to produce `lines.json` and
   `audiomap.json`.
3. In `music-video/`, run `npm run lyrics:from <your.lrc>`, then
   `npm run lyrics:build`.
4. Write your ideas, list your scenes in `storyboard/scenes.json`, and run
   `npm run assemble`.
5. Build scenes (by hand or with agents and the brief), watching in
   `npm run serve`.
6. Run `npm run verify`, then render.

## Commands (in `music-video/`)

| Command | What it does |
|---|---|
| `npm run serve` | Live dev player on port 3123 (no-cache, seekable) |
| `npm run assemble` | Rebuild the pages from the storyboard and timing |
| `npm run facts <id> ...` | A scene's window, word timings and the music inside it |
| `npm run lyrics:from <file>` | Lay your word-by-word lyric file onto the timing |
| `npm run lyrics:build` | Build `lyrics.js` from `lyrics.txt` (counts only, no text printed) |
| `npm run lyrics:placeholder` | Timed placeholder words, for working without lyrics |
| `npm run audio:placeholder` | A silent song of the film's length, for working without the audio |
| `npm run verify` | Repo hygiene: scenes, words, no placeholders or local files tracked |
| `npm run snapshot -- --at 81.2,85.0 -o .hyperframes/check` | Exact frames as a contact sheet |
| `npm run render:preview` | Draft 1080p render at 24 fps |
| `node scripts/edge-need.mjs <draft.mp4>` | Re-measure which scenes need frame effects (render that draft with `NO_FRAMES=1`) |
| `npm run render:4k` | Final 4K render at 60 fps, checked before and after (`-- --dry-run`, `-- --workers 4`, `-- --probe <file>`) |

The live player's keys: space to play or pause, arrows to move 2 s, Shift+arrows
for the previous or next scene, `,` and `.` for one frame, L to loop the scene,
M to mute. The time lives in the URL (`#t=81.25`).

## Not in this repo

- **Raw source material** (`source/`): the master the analysis reads, the
  lyric sheet and stems. The song the film plays (`assets/audio/song.wav`) and
  its words (`lyrics.txt`, `assets/lib/lyrics.js`) are tracked, with the owner's
  permission. Scenes take the words from `OM.sung(id)`, never hard-coded, so a
  fork can swap in its own song and lyrics.
- **Renders and snapshot caches.** They're large and regenerated on demand.
- **The omarchy.org site source,** which the look is based on. See
  [omarchy.org](https://omarchy.org).

## Rules

`AGENTS.md` has the rules every scene follows (words as motion, determinism,
invisible cuts, Tokyo Night, the frame budget) and the working rules for agents.

## Credits

Made by [TripleU613](https://github.com/TripleU613). Song: *We Can Fix Everything
(The Ultimate Machine)* by Kevin Koontz / REARRANGED (not included). Omarchy by
DHH. Built with HyperFrames, Three.js and GSAP. Type is JetBrains Mono and Geist,
both under the SIL Open Font License.
