# Camera and effects: one of each per scene

Every scene gets three additions, all unique across the film and all tied to
its idea:

- **Camera:** a whole-frame movement, through `OM.post`'s `cam` (zoom, rotation, shift).
- **Shader:** the scene's own GLSL `effect()`, its signature look. No two scenes
  share one, and none runs over the whole film.
- **Extras:** extra effects drawn in the 2D scene (particles, glints, flashes),
  deterministic in song time.

## Rules

1. **On palette.** Effects live inside Tokyo Night: greens, the theme's blues,
   dark grounds. No rainbow chromatic splits, no off-palette tints. A colour
   split, if used, offsets luminance in green tones only.
2. **The words stay readable.** No effect may blur, distort or hide a word at its
   onset or while the line reads together. Ease the effect off the words, or
   keep them crisp.
3. **Cuts stay invisible.**
   - The shader's `amount` is exactly 0 at every cut: use `OM.post.envelope`, or
     hold it at 0 for the cut frames.
   - Inside your section, the camera may carry straight through a cut, as long
     as both scenes hold the same camera at the cut and its speed is continuous.
   - At your section's first and last cut (the handoffs to other sections), the
     camera is at rest: zoom 1, no rotation, no shift.
4. **Smooth, not snapped.** Ease into and out of every handoff over 0.3 s or more.
   Nothing should jump in the last or first two frames of a scene. A cut on a big
   hit should feel like a deliberate punch, not a glitch.
5. **Deterministic.** Uniforms come from song time. Particles are computed from
   time analytically, never simulated frame to frame.

## Intro

- **i-01** · Camera: very slow push-in (1.00 to 1.06) with faint breathing · Shader: dark-room halation, the LED's glow blooming and breathing with it · Extras: dust motes drifting through the LED light
- **i-02** · Camera: crane up as the sun rises (the frame lifts and settles) · Shader: crepuscular rays streaming from the sun point between the letters · Extras: stars twinkling out, one long dawn flare
- **i-03** · Camera: spiral zoom, turning against the implosion, then locking on the hit · Shader: twist distortion around the centre, tightening with the collapse · Extras: sparks spiralling inward
- **i-04** · Camera: keep its drift and push, add a dolly-zoom swell into the lock · Shader: anamorphic horizontal streaks off the crisp title at the lock · Extras: foreground bokeh dust floating past

## Verse 1

- **v1-01** · Camera: top-down crane pulling up (1.25 to 1.0) to reveal the phone · Shader: tilt-shift miniature blur (sharp band, soft top and bottom) · Extras: a tiny shake as each padlock snaps
- **v1-02** · Camera: tilt up the strings in steps on the words · Shader: string sway, a gentle wave warp strongest near the top · Extras: fine dust falling through the light
- **v1-03** · Camera: slow lateral truck along the store, punching in on each coin · Shader: cold fluorescent flicker in the white world · Extras: spinning coins with glints
- **v1-04** · Camera: handheld tension building to the tear, then released · Shader: relief lighting on the torn paper edge, green bleeding through the seam · Extras: paper fibres and scraps flying
- **v1-05** · Camera: slow diagonal drift with focus breathing · Shader: rain refraction, droplet lenses and running streaks on the glass · Extras: streaks of drops, condensation fading
- **v1-06** · Camera: an impact punch on each hammer strike, plus a slow push · Shader: heat shimmer rising above the anvil · Extras: spark showers with gravity, embers floating up
- **v1-07** · Camera: tracking with the scanner bar's sweep · Shader: photocopy degradation (toner noise, banding, crushed contrast) resolving crisp on the last word · Extras: the scanner light bar's glow passing
- **v1-08** · Camera: slow push into the print's core with a scanner's micro-rotation · Shader: edge-detect glow along the ridges (Sobel outline light) · Extras: verification particles riding the wave

## Pre-chorus 1

- **p1-01** · Camera: flip-through pan, stepping right on each word · Shader: a groove sheen, a radial highlight sweeping the vinyl · Extras: dust in the spotlight beam
- **p1-02** · Camera: slow rotation following the pen (about 3 degrees) · Shader: long-exposure streaks, directional echo along the pen's path · Extras: sparks off the pen tip
- **p1-03** · Camera: ratchet roll, a small click-rotation as each gear locks · Shader: a specular sweep across the gear faces · Extras: tiny sparks where teeth mesh
- **p1-04** · Camera: whip and tilt up following the launch, pulling back as it shrinks · Shader: launch motion blur along the flight line · Extras: a light-trail ribbon, wind streaks

## Chorus 1

- **c1-01** · Camera: slow orbit (2 degrees, 1.00 to 1.05) around the bowl · Shader: specular glints running along the green seams · Extras: sparkles where seams meet
- **c1-02** · Camera: turntable rotation, then a crash zoom on the slam · Shader: X-ray technical view that flips to the real render at power-on · Extras: assembly sparks at each click
- **c1-03** · Camera: impact punch-in on each press, with overshoot · Shader: ink bleed and paper grain under the presses · Extras: ink droplets and paper-dust puffs
- **c1-04** · Camera: over-the-shoulder dolly with gentle parallax · Shader: shallow depth of field, the edges falling soft · Extras: screen-light flicker, motes in the beam
- **c1-05** · Camera: tracking pan across the sheet as the inking runs · Shader: graphite grain that fades out as the render becomes real · Extras: pencil shavings and eraser crumbs
- **c1-06** · Camera: step zooms on each merge level · Shader: neon bloom with horizontal glare on the check sweep · Extras: bit-sparks when bars swap
- **c1-07** · Camera: a defibrillator jolt on each thump, then heartbeat pulses · Shader: phosphor persistence, green afterglow trails on the trace · Extras: blip sparks at each spike
- **c1-08** · Camera: crane down from above onto the stage, then push to the screen · Shader: volumetric spotlight haze in the cone · Extras: stage smoke drifting, a dust puff as the cloth falls

## Verse 2

- **v2-01** · Camera: snap-zoom punches on each snap, slow drift between · Shader: magnetic ripple, space bending around each window as it snaps · Extras: contact sparks
- **v2-02** · Camera: sway riding the vocal level · Shader: green-tone luminance split pulsing with each note · Extras: note particles rising from struck windows
- **v2-03** · Camera: tumbling roll with the falling windows, then reversing · Shader: rewind tracking lines and scrub blur, green-tinted · Extras: debris that rewinds with the windows
- **v2-04** · Camera: lateral parallax between the two exposures, converging · Shader: double-exposure screen blend converging to one image · Extras: phosphor dot glow at power-off
- **v2-05** · Camera: low glide along the keyboard with a rack focus · Shader: macro depth of field across the keys · Extras: key backlight bloom, dust over the board · Jiggle: camera zoom +0.5% on each beat (OM.jiggle)
- **v2-06** · Camera: chase cam behind the plane, rolling on the banks · Shader: radial wind blur and speed lines · Extras: cloud wisps passing, wingtip sparkles
- **v2-07** · Camera: running with a gait bob, settling dead still when they stop · Shader: motion blur while running, crisp when still · Extras: kicked-up dust, path-building sparks
- **v2-08** · Camera: road vibration and a slow roll into curves · Shader: sunrise lens flare with horizon heat shimmer · Extras: passing light streaks, lane markers flashing by

## Pre-chorus 2

- **p2-01** · Camera: orbit around the turntable centre · Shader: neon jukebox glow with rotating record sheen arcs · Extras: needle sparkles
- **p2-02** · Camera: architectural rise from plan view into perspective · Shader: corner shading (ambient occlusion) deepening as the walls rise · Extras: construction dust
- **p2-03** · Camera: aerial climb, pulling back and turning as the city powers on · Shader: layered atmospheric fog by depth · Extras: traffic streaks along the roads
- **p2-04** · Camera: steep climb with turbulence · Shader: light scattering through the cloud layers · Extras: contrail vapour, condensation

## Chorus 2

- **c2-01** · Camera: slow-motion pull-out as the shards fly home, then lock · Shader: glass refraction at the shard edges, with caustic sparkle · Extras: glass glints
- **c2-02** · Camera: steady industrial tracking along the line, a push at the end · Shader: factory haze with shafts through high windows · Extras: welding sparks
- **c2-03** · Camera: low-angle tilt up the hull, a jolt on the smash · Shader: water reflection shimmer along the waterline · Extras: shards and foam spray
- **c2-04** · Camera: helicopter pass, a slow track with altitude bob · Shader: city bloom with window flicker · Extras: blinking warning lights, searchlight beams
- **c2-05** · Camera: snap pans following each stroke · Shader: wet-glass streak refraction behind the blade · Extras: droplet spray off the squeegee
- **c2-06** · Camera: fast lateral tracking alongside the herd, with a gallop bob · Shader: dust-haze motion blur · Extras: dust clouds, flying grass
- **c2-07** · Camera: wide establishing shot, then a push along the span with the train · Shader: canyon depth haze plus the train's headlight flare · Extras: falling grit, sparks on the rails
- **c2-08** · Camera: fast dive through the layers with banking · Shader: circuit-trace glow pulses racing along the paths · Extras: electrons flowing along the traces

## Bridge

- **b-01** · Camera: macro slide along the wheels · Shader: narrow focus band, mechanical depth of field · Extras: dust specks, click flashes
- **b-02** · Camera: slow pull-back revealing the wall, with a float · Shader: per-screen flicker bloom · Extras: power-on sparkles
- **b-03** · Camera: low tracking behind the roller, a bump on each kick · Shader: asphalt heat haze · Extras: gravel bits, steam off the roller
- **b-04** · Camera: microscope drift with focus wobble · Shader: microscope lens, circular vignette and slight fisheye · Extras: drifting micro-particles
- **b-05** · Camera: following the liquid light from the desk to the door · Shader: liquid caustics, refracted ripples of light · Extras: droplets, light splashes · Jiggle: the pool swells on the beats its kicks and words leave free
- **b-06** · Camera: slow lateral relay pan · Shader: candle-flicker exposure with soft halation · Extras: embers rising, smoke wisps
- **b-07** · Camera: time-lapse push-in, stepping with each life stage · Shader: one screen look per era (a curved old CRT, then a clean flat panel) · Extras: dust in window light
- **b-08** · Camera: tracking the cascade on a rising spiral · Shader: an impact ripple from each domino that falls · Extras: dust puffs per domino · Jiggle: camera zoom +0.5% on the beats between its own hits

## Build

- **x-b1** · Camera: spinning zoom accelerating with the vortex · Shader: gravitational lensing, an Einstein-ring warp around the eye · Extras: debris spiralling in
- **x-b2** · Camera: forward rush with banking · Shader: polar tunnel warp with light-speed radial streaks · Extras: star streaks

## Chorus 3

- **c3-01** · Camera: slow tilt across the sky with a gentle sway · Shader: aurora shimmer, a curtain wave warp with glow · Extras: twinkling stars, a shooting star
- **c3-02** · Camera: orbital roll around the planet with a slow zoom · Shader: atmospheric rim scattering · Extras: satellite glints, drifting debris
- **c3-03** · Camera: wide pan following the formation · Shader: bokeh for distant drones, glow trails for near ones · Extras: twinkle sparkles across the swarm
- **c3-04** · Camera: sweeping crane across the stands · Shader: fisheye lens with floodlight glare · Extras: green confetti, camera-flash pops
- **c3-05** · Camera: low dolly forward through the field, rising · Shader: foreground depth blur · Extras: pollen floating
- **c3-06** · Camera: gliding arcs with the flock · Shader: sky-gradient haze with motion streaks · Extras: specks drifting off the flock
- **c3-07** · Camera: tilt up as the clouds part, with flash shakes on the thunder · Shader: lightning exposure flashes and moving cloud shadows · Extras: lightning bolts, droplets suspended mid-air
- **c3-08** · Camera: continuous vertical crane rising with the tower · Shader: height fog gradient · Extras: welding sparks, beacon lights
- **c3-09** · Camera: crash zoom into the collapse, explosive pull-back on rebirth · Shader: a shockwave ring distortion · Extras: particles exploding outward

## Outro

- **x-o1** · Camera: slow dolly out, settling · Shader: a morning light-leak sweep with gentle halation · Extras: dust in the sunbeams. **Credits include "Made by TripleU613".**
- **o-01** · Camera: subtle hero float, faint scale breathing · Shader: one clean glint sweeping across the frame · Extras: sparkles as the buttons build
- **x-end** · Camera: slow push in on the cursor as everything drains · Shader: a cursor-glow bloom, the last light · Extras: drained cells falling away as particles
