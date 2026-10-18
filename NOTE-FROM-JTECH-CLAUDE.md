# Note from the Claude that made the JTech lyric video

TripleU asked me to look at this project and leave you a note. Short version: the engineering is good, but the video doesn't land, for two reasons you can fix: the line timing is loose, and the motion isn't shaped by the song.

## What TripleU sees

- "The animations are crazy, but the flow doesn't follow the song, and it isn't synced to the lyrics."
- They expected a lyric video (words on screen), and there are none.

## What's already right (keep it)

- `analysis/` pipeline: Demucs stems, forced alignment, `lines.json` with per-word windows, `audiomap.json` (beats, downbeats, phrases, energy).
- `assemble.mjs`: one scene per line, starts snapped to the beat before the vocal, no transition reused.
- Scenes are deterministic in composition time, and several fire on sung words (`OM.words(id)`, e.g. c1-03).

## Problem 1: the line timing is loose (measured)

I compared each line's `start` in `analysis/lines.json` against vocal onsets in `analysis/stems/htdemucs_ft/*/vocals.wav` (RMS onset within ±1 s):

- 34 of 58 lines had a clear onset; **16 are off by more than 0.25 s, 13 by more than 0.5 s**.
- Lines 0–4 average **−0.63 s** (the singing starts before the scene does).
- 24 lines couldn't be measured at all, so check those by ear.

Half a second is very visible. When the visuals have no text, imprecise hits just read as "random motion".

How to fix it:
1. Align against the **vocals stem, not the mix**. Your `medium.en` run on the mix only produced "♪♪", because music confuses Whisper. On `vocals.wav`, run faster-whisper with `word_timestamps=True`, `condition_on_previous_text=False`, `vad_filter=False`. Or use the forced aligner you already have through torchaudio (`torchaudio.pipelines.MMS_FA`), fed the transcript you already hold, at word level.
2. Verify every line against vocal onsets (the check above). Fix outliers individually, by ear in the preview with audio. Don't just accept the aligner's output.
3. Re-run `build-timing.mjs` and `assemble.mjs`.

## Problem 2: the motion isn't shaped by the song

Every scene runs at full intensity, so nothing builds or releases. Use `audiomap.json`'s energy curve and the sections:
- **Verses** should be quieter: one idea per scene, slower camera, fewer moving parts.
- **Choruses** go big: hits on downbeats, bigger cuts, more density.
- **Bridge / breakdown** strips back. The **last chorus** is the biggest moment.
- Per scene: **one hero motion**. Everything else supports it or stays still.
- Make the sync *legible*. A viewer must be able to see that something happens *on* each sung word or downbeat: a punch, cut, flash or drop. Motion that loops on its own clock reads as noise, so tie continuous motion to the energy curve, or remove it.

## On lyrics

Resolved: TripleU has permission to use the song and show its lyrics. The song and the lyrics now live in the repo, and every line's words are on screen as the material of its scene.

## Process that worked on the JTech video

TripleU liked it, and these are the habits they asked for there:
- Show **tiny pieces first** (a 10–20 s section with audio) and get their reaction before building everything.
- Every line or section should look **unique**. No "ctrl+A" effects running across the whole video; each section gets its own grid, signature effect and transition style.
- Check sections **in a browser with audio at real speed**, not only stills. Pull stills at the exact moments TripleU names, e.g. "2:25".
- Render with a deterministic clock (you have HyperFrames). Render a 5–10 s QA clip before any full render.

Reference code from that project (engine, per-line moves, section looks, aligner, deterministic renderer) is in `reference-jtech-lyric-video/`. It's code only, for ideas; it's a plain-HTML/WAAPI build, not HyperFrames, so don't copy it wholesale.
