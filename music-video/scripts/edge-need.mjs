// Decides, per sentence (scene) and per side, whether the frame layer may draw there, from a
// draft render made WITHOUT the layer (NO_FRAMES=1 npm run assemble, then render). A side is on
// for a whole scene when its margin (the MARGIN px strip in from that edge) stays empty for the
// whole scene; otherwise it is off for the whole scene. Writes assets/lib/frame-need.js with a
// side mask per scene (bits: 1 top, 2 right, 4 bottom, 8 left), the owner's overrides, and the
// drum events frames.js syncs to. Re-run it on every fresh render:
//   nice -n 19 node scripts/edge-need.mjs [renders/omarchy-noframes-13.mp4]
import { spawn, execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'

const here = (p) => new URL(p, import.meta.url)
const video = process.argv.slice(2).find((a) => !a.startsWith('-')) || 'renders/omarchy-noframes-13.mp4'
const W = 384, H = 216 // 5 CSS px per sample
const MARGIN = 24 // samples: the 120 CSS px strip in from each edge ("a few inches")
const SEG = 16 // margin segments 80 CSS px long
const OCCUPIED = 0.03 // share of a segment's samples that makes it occupied
// Something is there when it sits SALIENT luma steps off the scene's background or moves by that
// much frame to frame (dim lattice texture is fine under the frame), and is bright past BRIGHT
// (words, lit lines), which the frame must never cover. A side is empty in a frame when under
// EMPTY_SHARE of its segments hold anything and at most BRIGHT_MAX hold anything bright, and empty
// for the scene when that holds for all but STRAY of its frames. Calibrated on the owner's five:
// v2-06's top measures 0.19 (owner off), v2-07's top 0 (owner on); p2-01 and p2-03 need their overrides.
const SALIENT = +(process.env.SALIENT || 10), BRIGHT = +(process.env.BRIGHT || 120)
const EMPTY_SHARE = +(process.env.EMPTY_SHARE || 0.3), BRIGHT_MAX = +(process.env.BRIGHT_MAX || 1), STRAY = +(process.env.STRAY || 0.15)
// The owner's ground truth (side masks), which always wins and is checked against the measurement.
const TRUTH = { 'v2-06': 0, 'v2-07': 15, 'p2-01': 15, 'p2-03': 15, 'p2-04': 0 }
// White-theme scenes: Tokyo Night inks would read as stains on white, so the frame stays off.
const FORCED = { 'v1-01': 0, 'v1-02': 0, 'v1-03': 0 }

const html = readFileSync(here('../index.html'), 'utf8')
const scenes = [...html.matchAll(/id="s-([^"]+)" class="clip scene" data-start="([\d.]+)" data-duration="([\d.]+)"/g)].map(([, id, a, d]) => ({ id, start: +a, end: +a + +d }))
const [num, den] = execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=r_frame_rate', '-of', 'csv=p=0', video], { encoding: 'utf8' }).trim().split('/').map(Number)
const fps = num / (den || 1)

// Margin samples, each tagged with its segment and side (0 top, 1 right, 2 bottom, 3 left).
const seg = new Int16Array(W * H).fill(-1), segSide = []
let ns = 0
const strip = (k, x0, x1, y0, y1, alongX) => {
  for (let a = alongX ? x0 : y0; a < (alongX ? x1 : y1); a += SEG, ns++) {
    segSide[ns] = k
    for (let y = alongX ? y0 : a; y < (alongX ? y1 : Math.min(y1, a + SEG)); y++)
      for (let x = alongX ? a : x0; x < (alongX ? Math.min(x1, a + SEG) : x1); x++) seg[y * W + x] = ns
  }
}
strip(0, 0, W, 0, MARGIN, true); strip(2, 0, W, H - MARGIN, H, true)
strip(3, 0, MARGIN, MARGIN, H - MARGIN, false); strip(1, W - MARGIN, W, MARGIN, H - MARGIN, false)
const idx = []
for (let i = 0; i < W * H; i++) if (seg[i] >= 0) idx.push(i)
const segN = new Float32Array(ns), sideN = [0, 0, 0, 0]
for (const i of idx) segN[seg[i]]++
for (let g = 0; g < ns; g++) sideN[segSide[g]]++

// Two streamed passes: the first finds each scene's background (the margin's most common luma),
// the second measures every frame against it. Frames within 0.1 s of a cut belong to the handoff.
const sceneAt = (t) => { let i = 0; while (i < scenes.length - 1 && t >= scenes[i].end) i++; return i }
const inside = (t, s) => t > s.start + 0.1 && t < s.end - 0.1
const decode = (onFrame) => new Promise((ok, fail) => {
  const FRAME = W * H
  let buf = Buffer.alloc(0), n = 0
  const ff = spawn('ffmpeg', ['-v', 'error', '-i', video, '-vf', `scale=${W}:${H}:flags=area,format=gray`, '-f', 'rawvideo', '-'])
  ff.stdout.on('data', (chunk) => {
    buf = Buffer.concat([buf, chunk])
    while (buf.length >= FRAME) { onFrame(buf.subarray(0, FRAME), (n++ + 0.5) / fps); buf = buf.subarray(FRAME) }
  })
  ff.on('close', (c) => (c ? fail(new Error('ffmpeg exit ' + c)) : ok()))
})
const hist = scenes.map(() => new Float64Array(256))
await decode((f, t) => { const si = sceneAt(t); if (inside(t, scenes[si])) for (const i of idx) hist[si][f[i]]++ })
const bg = hist.map((h) => { let b = 0; for (let v = 1; v < 256; v++) if (h[v] > h[b]) b = v; return b })

const stats = scenes.map(() => [[], [], [], []]) // per scene, per side: [share, bright] per frame
let prev = null, prevScene = -1
await decode((f, t) => {
  const si = sceneAt(t)
  if (inside(t, scenes[si])) {
    const sal = new Float32Array(ns), lit = new Float32Array(ns), b = bg[si], still = prevScene !== si
    for (const i of idx) {
      const off = Math.abs(f[i] - b), g = seg[i]
      if (off > SALIENT || (!still && Math.abs(f[i] - prev[i]) > SALIENT)) sal[g]++
      if (off > BRIGHT) lit[g]++
    }
    const share = [0, 0, 0, 0], bright = [0, 0, 0, 0]
    for (let g = 0; g < ns; g++) {
      if (sal[g] / segN[g] > OCCUPIED) share[segSide[g]]++
      if (lit[g] / segN[g] > OCCUPIED) bright[segSide[g]]++
    }
    for (let k = 0; k < 4; k++) stats[si][k].push([share[k] / sideN[k], bright[k]])
  }
  prev = Buffer.from(f)
  prevScene = si
})

const r3 = (x) => Math.round(x * 1000) / 1000
const sides = {}, measured = {}
scenes.forEach((s, si) => {
  let mask = 0
  measured[s.id] = stats[si].map((fr, k) => {
    const bad = fr.filter(([sh, br]) => sh >= EMPTY_SHARE || br > BRIGHT_MAX).length
    const stray = fr.length ? bad / fr.length : 1
    if (bg[si] < 128 && stray <= STRAY) mask |= 1 << k // never on a light scene
    return r3(stray)
  })
  sides[s.id] = mask
})

const flipped = Object.keys(TRUTH).filter((id) => (sides[id] > 0) !== (TRUTH[id] > 0))
const map = JSON.parse(readFileSync(here('../../analysis/audiomap.json'), 'utf8'))
const hits = (drum) => map.events.filter((e) => e.drum === drum).map((e) => [r3(e.t), Math.round(e.energy * 100) / 100])
const data = { source: video, rule: { MARGIN: MARGIN * 5, SALIENT, BRIGHT, EMPTY_SHARE, BRIGHT_MAX, STRAY }, sides, measured, overrides: { ...TRUTH, ...FORCED }, kick: hits('kick'), snare: hits('snare'), hihat: hits('hihat') }
writeFileSync(
  here('../assets/lib/frame-need.js'),
  `// Generated by scripts/edge-need.mjs from ${video}. Do not edit: re-run it on a fresh NO_FRAMES=1 render.\n` +
    `// sides: per scene, the sides whose margin is empty for the whole scene (1 top, 2 right, 4 bottom, 8 left).\n` +
    `// measured: per side, the share of frames with something in the margin. overrides win. Events are [t, energy].\n` +
    `window.OM_FRAME_NEED = ${JSON.stringify(data)};\n`,
)
const final = (id) => data.overrides[id] ?? sides[id]
const bits = (m) => ['T', 'R', 'B', 'L'].filter((_, k) => m & (1 << k)).join('')
const on = scenes.filter((s) => final(s.id))
const sideCount = on.reduce((n, s) => n + bits(final(s.id)).length, 0)
if (process.argv.includes('-v')) console.log(scenes.map((s) => `${s.id.padEnd(6)} ${bits(final(s.id)).padEnd(4)} stray ${measured[s.id].join(' ')}`).join('\n'))
console.log(`on ${on.length}/${scenes.length} scenes, ${sideCount} sides: ${on.map((s) => s.id + ':' + bits(final(s.id))).join(' ')}`)
console.log(flipped.length ? `owner overrides flip: ${flipped.map((id) => `${id} (measured ${bits(sides[id]) || 'none'}, owner ${TRUTH[id] ? 'on' : 'off'})`).join(', ')}` : 'measurement agrees with the owner on all five')
