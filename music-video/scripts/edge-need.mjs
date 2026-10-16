// Measures how empty each scene's outer border band is in a draft render made
// WITHOUT the frames layer (NO_FRAMES=1), and writes assets/lib/frame-need.js:
// a 0..1 need per scene (1 = the band is empty and black, a frame helps).
// It also copies the drum events frames.js syncs to, since the page has no
// other copy of them. Re-run it on every fresh render:
//   nice -n 19 node scripts/edge-need.mjs [renders/omarchy-preview-12.mp4]
import { spawn, execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'

const here = (p) => new URL(p, import.meta.url)
const video = process.argv.slice(2).find((a) => !a.startsWith('-')) || 'renders/omarchy-preview-12.mp4'
const W = 384, H = 216 // 5 CSS px per sample
const BAND = 10 // samples deep: 50 CSS px, wider than the 40 px frames.js draws in
const SEG = 16 // band segments 80 CSS px long
const DELTA = 8 // luma steps off the background (or frame to frame) that count as something there
const OCCUPIED = 0.03 // share of a segment's samples that makes it occupied
// Per time: the frame may also come in during a busy scene's empty stretches. A moment is open when
// under OPEN_OCC of the band holds anything salient (off the background or moving by SALIENT luma
// steps; dim lattice texture is fine under the frame) and at most BRIGHT_MAX segments hold anything
// bright (words, lit edges), which the frame must never cover.
const SALIENT = 24, OPEN_OCC = +(process.env.OPEN_OCC || 0.25), BRIGHT = +(process.env.BRIGHT || 120), BRIGHT_MAX = +(process.env.BRIGHT_MAX || 2)
const OPEN_PAD = 0.15 // seconds of margin kept clear before and after content in the band
const OPEN_MIN = 1.5 // shortest open stretch worth a frame
const ENSURE = [[227.55, 243.253]], ENSURE_LEN = 3.5 // sections that must show their idea at least once
const FULL = 0.4 // segment occupancy at which need reaches 0
const THRESHOLD = 0.4 // need at or above this turns the frame on (under 24% of the band occupied); v2-06, owner off, measures 0.31
// The owner's ground truth, kept as overrides and checked against the measurement.
const TRUTH = { 'v2-06': 0, 'v2-07': 1, 'p2-01': 1, 'p2-03': 1, 'p2-04': 0 }
// White-theme scenes: Tokyo Night inks would read as stains on white, so the frame stays off.
const FORCED = { 'v1-01': 0, 'v1-02': 0, 'v1-03': 0 }

const html = readFileSync(here('../index.html'), 'utf8')
const scenes = [...html.matchAll(/id="s-([^"]+)" class="clip scene" data-start="([\d.]+)" data-duration="([\d.]+)"/g)].map(([, id, a, d]) => ({ id, start: +a, end: +a + +d }))
const [num, den] = execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=r_frame_rate', '-of', 'csv=p=0', video], { encoding: 'utf8' }).trim().split('/').map(Number)
const fps = num / (den || 1)

// Band samples, each tagged with its segment.
const seg = new Int16Array(W * H).fill(-1)
let ns = 0
const strip = (x0, x1, y0, y1, along) => {
  for (let a = along === 'x' ? x0 : y0; a < (along === 'x' ? x1 : y1); a += SEG, ns++)
    for (let y = along === 'x' ? y0 : a; y < (along === 'x' ? y1 : Math.min(y1, a + SEG)); y++)
      for (let x = along === 'x' ? a : x0; x < (along === 'x' ? Math.min(x1, a + SEG) : x1); x++) seg[y * W + x] = ns
}
// Sides as frames.js numbers them: 0 top, 1 right, 2 bottom, 3 left.
const segSide = []
const side = (k, ...a) => { const n0 = ns; strip(...a); for (let g = n0; g < ns; g++) segSide[g] = k }
side(0, 0, W, 0, BAND, 'x'); side(2, 0, W, H - BAND, H, 'x'); side(3, 0, BAND, BAND, H - BAND, 'y'); side(1, W - BAND, W, BAND, H - BAND, 'y')
const sideN = [0, 0, 0, 0]
for (let g = 0; g < ns; g++) sideN[segSide[g]]++
const idx = []
for (let i = 0; i < W * H; i++) if (seg[i] >= 0) idx.push(i)
const segN = new Float32Array(ns)
for (const i of idx) segN[seg[i]]++

// Pass 1 (streamed): per frame, keep only the band samples; background is fixed per scene afterwards.
const per = scenes.map(() => ({ hist: new Float64Array(256), frames: [] }))
let prev = null, prevScene = -1, n = 0, si = 0, buf = Buffer.alloc(0)
const FRAME = W * H
const ff = spawn('ffmpeg', ['-v', 'error', '-i', video, '-vf', `scale=${W}:${H}:flags=area,format=gray`, '-f', 'rawvideo', '-'])
ff.stdout.on('data', (chunk) => {
  buf = Buffer.concat([buf, chunk])
  while (buf.length >= FRAME) {
    const f = buf.subarray(0, FRAME)
    buf = buf.subarray(FRAME)
    const t = (n + 0.5) / fps
    while (si < scenes.length - 1 && t >= scenes[si].end) si++
    const s = scenes[si], P = per[si]
    if (t > s.start + 0.1 && t < s.end - 0.1) { // frames next to a cut belong to the handoff
      const lum = new Uint8Array(idx.length), moved = new Uint8Array(idx.length)
      for (let k = 0; k < idx.length; k++) {
        lum[k] = f[idx[k]]
        P.hist[lum[k]]++
        if (prev && prevScene === si) moved[k] = Math.abs(lum[k] - prev[idx[k]])
      }
      P.frames.push({ t, lum, moved })
    }
    prev = Buffer.from(f)
    prevScene = si
    n++
  }
})
await new Promise((ok, fail) => ff.on('close', (c) => (c ? fail(new Error('ffmpeg exit ' + c)) : ok())))

// Per scene: background = the band's most common luma. A segment is occupied in a frame when
// enough of it is off the background or moving. busy = 75th percentile of the occupied share.
const r3 = (x) => Math.round(x * 1000) / 1000
const measured = {}, need = {}, timeline = []
scenes.forEach((s, i) => {
  const P = per[i]
  if (!P.frames.length) { measured[s.id] = { bg: 0, busy: 1 }; need[s.id] = 0; return }
  let bg = 0
  for (let v = 1; v < 256; v++) if (P.hist[v] > P.hist[bg]) bg = v
  const occT = P.frames.map(({ t, lum, moved }) => {
    const hit = new Float32Array(ns), sal = new Float32Array(ns), lit = new Float32Array(ns)
    for (let k = 0; k < lum.length; k++) {
      const g = seg[idx[k]], off = Math.abs(lum[k] - bg)
      if (moved[k] > DELTA || off > DELTA) hit[g]++
      if (moved[k] > SALIENT || off > SALIENT) sal[g]++
      if (off > BRIGHT) lit[g]++
    }
    let o = 0
    const os = [0, 0, 0, 0], ob = [0, 0, 0, 0]
    for (let g = 0; g < ns; g++) {
      if (hit[g] / segN[g] > OCCUPIED) o++
      if (sal[g] / segN[g] > OCCUPIED) os[segSide[g]]++
      if (lit[g] / segN[g] > OCCUPIED) ob[segSide[g]]++
    }
    let mask = 0 // the sides that are open at this frame
    if (bg < 128) for (let k = 0; k < 4; k++) if (os[k] / sideN[k] < OPEN_OCC && ob[k] <= BRIGHT_MAX) mask |= 1 << k // never on a light scene
    timeline.push([t, s.id, mask, ob])
    return o / ns
  })
  const occ = [...occT].sort((a, b) => a - b)
  const busy = occ[Math.floor(occ.length * 0.75)]
  measured[s.id] = { bg, busy: r3(busy) }
  need[s.id] = r3(Math.max(0, 1 - busy / FULL))
})

const verdict = (id) => (need[id] >= THRESHOLD ? 1 : 0)
// Open stretches: runs of frames whose sides in `mask` are all open (bridging the skipped frames at a
// cut), kept OPEN_PAD clear of closed frames, at least OPEN_MIN long, never in a scene forced off.
// The whole band is claimed first; then left+right and top+bottom pairs fill the time that is left.
const off = new Set(Object.entries({ ...TRUTH, ...FORCED }).filter(([, v]) => !v).map(([k]) => k))
const stretches = []
const claimed = (t) => stretches.some(([a, b]) => t >= a - OPEN_PAD && t <= b + OPEN_PAD)
for (const m of [15, 10, 5]) {
  const found = []
  let run = null
  for (const [t, id, mask] of timeline) {
    if ((mask & m) === m && !off.has(id) && !claimed(t)) {
      if (run && t - run[1] < 0.25) run[1] = t
      else found.push((run = [t, t]))
    } else run = null
  }
  stretches.push(...found.map(([a, b]) => [r3(a + OPEN_PAD), r3(b - OPEN_PAD), m]).filter(([a, b]) => b - a >= OPEN_MIN))
}
// A section with no open time at all still gets its idea once: the ENSURE_LEN window and side pair
// with the least bright content in its band (the build, whose scenes fill the edges throughout).
for (const [a0, b0] of ENSURE) {
  if (stretches.some(([a, b]) => Math.min(b, b0) - Math.max(a, a0) >= OPEN_MIN)) continue
  const fr = timeline.filter(([t, id]) => t >= a0 + 0.3 && t <= b0 - 0.3 && !off.has(id))
  let best = null
  for (const [m, ks] of [[10, [1, 3]], [5, [0, 2]]])
    for (let i = 0; i < fr.length; i++) {
      let cost = 0, j = i
      for (; j < fr.length && fr[j][0] - fr[i][0] < ENSURE_LEN; j++) cost += ks.reduce((n, k) => n + fr[j][3][k], 0)
      if (j < fr.length && (!best || cost < best.cost)) best = { cost, m, a: fr[i][0], b: fr[j][0] }
    }
  if (best) { stretches.push([r3(best.a), r3(best.b), best.m]); console.log(`ensured ${a0}-${b0}: ${r3(best.a)}-${r3(best.b)} sides ${best.m}, bright cost ${best.cost}`) }
}
stretches.sort((a, b) => a[0] - b[0])
const flipped = Object.keys(TRUTH).filter((id) => verdict(id) !== TRUTH[id])
const map = JSON.parse(readFileSync(here('../../analysis/audiomap.json'), 'utf8'))
const hits = (drum) => map.events.filter((e) => e.drum === drum).map((e) => [r3(e.t), Math.round(e.energy * 100) / 100])
const data = { source: video, threshold: THRESHOLD, need, measured, open: stretches, overrides: { ...TRUTH, ...FORCED }, kick: hits('kick'), snare: hits('snare'), hihat: hits('hihat') }
writeFileSync(
  here('../assets/lib/frame-need.js'),
  `// Generated by scripts/edge-need.mjs from ${video}. Do not edit: re-run it on a fresh NO_FRAMES=1 render.\n` +
    `// need: 1 = the scene's outer band is empty and still. overrides win over need. open: [t0, t1, sides] stretches (song s, side bits 1 top 2 right 4 bottom 8 left) where a busy scene's band is clear. Events are [t, energy] from audiomap.json.\n` +
    `window.OM_FRAME_NEED = ${JSON.stringify(data)};\n`,
)
const on = scenes.filter((s) => (data.overrides[s.id] ?? verdict(s.id)) > 0).map((s) => s.id)
if (process.argv.includes('-v')) console.log(scenes.map((s) => `${s.id.padEnd(6)} need ${need[s.id].toFixed(2)} busy ${measured[s.id].busy.toFixed(2)} bg ${measured[s.id].bg}`).join('\n'))
if (process.env.DUMP) writeFileSync(process.env.DUMP, JSON.stringify(timeline)) // per-frame [t, scene, open, salient share, bright segments]
const openT = (m) => stretches.filter((x) => x[2] === m).reduce((n, [a, b]) => n + b - a, 0).toFixed(1)
console.log(`open stretches ${stretches.length}: whole band ${openT(15)} s, left+right ${openT(10)} s, top+bottom ${openT(5)} s`)
console.log(`threshold ${THRESHOLD}; on ${on.length}/${scenes.length}: ${on.join(' ')}`)
console.log(flipped.length ? `owner overrides flip: ${flipped.map((id) => `${id} (need ${need[id]}, owner ${TRUTH[id] ? 'on' : 'off'})`).join(', ')}` : 'measurement agrees with the owner on all five')
