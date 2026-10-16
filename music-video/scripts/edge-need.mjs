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
const BAND = 12 // samples deep: 60 CSS px, wider than the 40 px frames.js draws in
const SEG = 16 // band segments 80 CSS px long
const DELTA = 8 // luma steps off the background (or frame to frame) that count as something there
const OCCUPIED = 0.03 // share of a segment's samples that makes it occupied
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
strip(0, W, 0, BAND, 'x'); strip(0, W, H - BAND, H, 'x'); strip(0, BAND, BAND, H - BAND, 'y'); strip(W - BAND, W, BAND, H - BAND, 'y')
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
        if (prev && prevScene === si) moved[k] = Math.abs(lum[k] - prev[idx[k]]) > DELTA ? 1 : 0
      }
      P.frames.push({ lum, moved })
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
const measured = {}, need = {}
scenes.forEach((s, i) => {
  const P = per[i]
  if (!P.frames.length) { measured[s.id] = { bg: 0, busy: 1 }; need[s.id] = 0; return }
  let bg = 0
  for (let v = 1; v < 256; v++) if (P.hist[v] > P.hist[bg]) bg = v
  const occ = P.frames.map(({ lum, moved }) => {
    const hit = new Float32Array(ns)
    for (let k = 0; k < lum.length; k++) if (moved[k] || Math.abs(lum[k] - bg) > DELTA) hit[seg[idx[k]]]++
    let o = 0
    for (let g = 0; g < ns; g++) if (hit[g] / segN[g] > OCCUPIED) o++
    return o / ns
  }).sort((a, b) => a - b)
  const busy = occ[Math.floor(occ.length * 0.75)]
  measured[s.id] = { bg, busy: r3(busy) }
  need[s.id] = r3(Math.max(0, 1 - busy / FULL))
})

const verdict = (id) => (need[id] >= THRESHOLD ? 1 : 0)
const flipped = Object.keys(TRUTH).filter((id) => verdict(id) !== TRUTH[id])
const map = JSON.parse(readFileSync(here('../../analysis/audiomap.json'), 'utf8'))
const hits = (drum) => map.events.filter((e) => e.drum === drum).map((e) => [r3(e.t), Math.round(e.energy * 100) / 100])
const data = { source: video, threshold: THRESHOLD, need, measured, overrides: { ...TRUTH, ...FORCED }, kick: hits('kick'), snare: hits('snare'), hihat: hits('hihat') }
writeFileSync(
  here('../assets/lib/frame-need.js'),
  `// Generated by scripts/edge-need.mjs from ${video}. Do not edit: re-run it on a fresh NO_FRAMES=1 render.\n` +
    `// need: 1 = the scene's outer band is empty and still. overrides win over need. Events are [t, energy] from audiomap.json.\n` +
    `window.OM_FRAME_NEED = ${JSON.stringify(data)};\n`,
)
const on = scenes.filter((s) => (data.overrides[s.id] ?? verdict(s.id)) > 0).map((s) => s.id)
if (process.argv.includes('-v')) console.log(scenes.map((s) => `${s.id.padEnd(6)} need ${need[s.id].toFixed(2)} busy ${measured[s.id].busy.toFixed(2)} bg ${measured[s.id].bg}`).join('\n'))
console.log(`threshold ${THRESHOLD}; on ${on.length}/${scenes.length}: ${on.join(' ')}`)
console.log(flipped.length ? `owner overrides flip: ${flipped.map((id) => `${id} (need ${need[id]}, owner ${TRUTH[id] ? 'on' : 'off'})`).join(', ')}` : 'measurement agrees with the owner on all five')
