// The final render. Checks that the real song and lyrics are in place, rebuilds
// the pages, runs the repo checks, renders 4K at 60 fps at low CPU priority, and
// then checks the file it wrote. Renders are never committed (renders/ is gitignored).
//
//   npm run render:4k                       # 6 workers, output renders/omarchy-4k-<commit>.mp4
//   npm run render:4k -- --workers 4        # fewer workers, gentler on the machine
//   npm run render:4k -- --dry-run          # run the checks and print the render command only
//   npm run render:4k -- --probe <file.mp4> # only check an existing render
import { execFileSync, spawnSync } from 'node:child_process'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const args = process.argv.slice(2)
const opt = (name, fallback) => (args.includes(name) ? args[args.indexOf(name) + 1] : fallback)
const die = (msg) => {
  console.error(`render-final: ${msg}`)
  process.exit(1)
}
const run = (cmd, a) => {
  if (spawnSync(cmd, a, { cwd: root, stdio: 'inherit' }).status !== 0) die(`${cmd} ${a.join(' ')} failed`)
}

/** The file must be 3840x2160 at 60 fps, with sound, and as long as the composition. */
const probe = (file) => {
  const p = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=codec_type,width,height,avg_frame_rate:format=duration', '-of', 'json', file], { cwd: root, encoding: 'utf8' }))
  const v = p.streams.find((s) => s.codec_type === 'video')
  const want = Number(/data-composition-id="main"[^>]*data-duration="([\d.]+)"/.exec(readFileSync(root + 'index.html', 'utf8'))?.[1])
  const got = Number(p.format.duration)
  const bad = [
    v?.width === 3840 && v?.height === 2160 ? '' : `size ${v?.width}x${v?.height}`,
    v?.avg_frame_rate === '60/1' ? '' : `fps ${v?.avg_frame_rate}`,
    p.streams.some((s) => s.codec_type === 'audio') ? '' : 'no audio',
    Math.abs(got - want) < 0.2 ? '' : `length ${got.toFixed(2)} s, expected ${want} s`,
  ].filter(Boolean)
  if (bad.length) die(`${file} is not the final cut: ${bad.join(', ')}`)
  console.log(`render-final: ${file} ok (3840x2160, 60 fps, ${got.toFixed(2)} s, ${Math.round(statSync(resolve(root, file)).size / 1e6)} MB)`)
}

if (args.includes('--probe')) {
  if (!opt('--probe')) die('--probe needs a file')
  probe(opt('--probe'))
  process.exit(0)
}

// The real song, not the silent placeholder CI uses.
const song = 'assets/audio/song.wav'
if (!existsSync(root + song)) die(`${song} is missing: put the real song there`)
const vol = spawnSync('ffmpeg', ['-hide_banner', '-i', song, '-af', 'volumedetect', '-f', 'null', '-'], { cwd: root, encoding: 'utf8' })
if (vol.error) die('ffmpeg is needed (and ffprobe)')
if (!(Number(/max_volume: (-?[\d.]+) dB/.exec(vol.stderr)?.[1]) > -60)) die(`${song} is silent, so it's the placeholder: put the real song there`)

// The real lyrics, not placeholder words. Only the generated header line is looked at.
const lyrics = 'assets/lib/lyrics.js'
if (!existsSync(root + lyrics)) die(`${lyrics} is missing: run npm run lyrics:from <your.lrc>, then npm run lyrics:build`)
if (readFileSync(root + lyrics, 'utf8').slice(0, 200).includes('(placeholder words)')) die(`${lyrics} holds placeholder words: run npm run lyrics:build`)

run('node', ['scripts/assemble.mjs'])
run('node', ['scripts/verify.mjs'])

// Name the file after the commit, marked -dirty when the tree has uncommitted changes.
let tag = 'local'
try {
  tag = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim()
  if (execFileSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' }).trim()) tag += '-dirty'
} catch {}
const out = `renders/omarchy-4k-${tag}.mp4`
const workers = opt('--workers', '6')
if (!/^\d+$/.test(workers) || +workers < 1) die(`--workers needs a whole number, got ${workers}`)

const render = ['-n', '19', 'npx', '--yes', 'hyperframes@0.8.162', 'render', '--resolution', '4k', '--fps', '60', '--quality', 'delivery', '--workers', workers, '--player-ready-timeout', '120000', '--strict', '-o', out]
console.log(`render-final: nice ${render.join(' ')}`)
if (args.includes('--dry-run')) process.exit(0)
console.log('render-final: this takes a while; the machine stays usable at low priority.')
run('nice', render)
probe(out)
