---
workflow: general-video
flow: companion
storyboard: yes
message: "Omarchy is the ultimate machine: beautiful, malleable, yours"
destination: youtube
aspect: 1920x1080
render: 3840x2160
language: en
length: 299.947s
angle: music-video
---

## Intent

A music video for "We Can Fix Everything (The Ultimate Machine)" by Kevin Koontz /
REARRANGED, the Omarchy anthem that also plays on omarchy.org. Made entirely in
code (Three.js, GSAP, CSS, canvas) and themed after the omarchy.org homepage, so
it reads as the site itself coming alive, with attention to detail, flowing moves
and timing that is perfect to the vocal and the drums.

## Assets

- assets/audio/song.wav: the song, the audio spine for the analysis and the final mix.
- The omarchy.org homepage source (not in this repo): the palettes, the wordmark and logo bitmaps and the hero field are ported from it.

## Customizations

- Every lyric line is its own scene with its own idea; no animation device is ever reused (the `device` of each scene in storyboard/scenes.json).
- Repeated lyrics (three choruses, two pre-choruses) get entirely different treatments: each chorus lives in a different world.
- Final deliverable rendered at 4K (3840x2160) from 1920x1080 CSS at device scale 2.

## Notes

- The sung words are on screen as the material of each line's idea (the owner has permission; they load from lyrics.txt via lyrics.js). Other on-screen words are Omarchy's own: the wordmark, the song title, theme names, keybinds, real command names.
- No single overlay or post shader across the whole piece: each scene owns its surface; index.html has no global grain, vignette, CRT or bloom layer.
- Nothing off theme: every color comes from the 22 site themes (tokens in assets/lib/themes.js), type is JetBrains Mono, corners are square, the pixel lattice is the recurring motif. Tokyo Night (green on #0e0e14) is home base.
- Lines are referenced by id (v1-01 … o-01) in code.
