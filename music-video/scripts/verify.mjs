// Repo hygiene, run locally (`npm run verify`) and in CI:
// - every storyboard scene has a scene file that names its id, and no scene file is a stray;
// - every sung line's scene draws its own words (OM.ownWords.add): the words are the motion;
// - nothing that must stay local is tracked: renders, snapshot caches, raw source material;
// - the tracked song and lyrics are the real ones, never the silent placeholder or placeholder words;
// - no tracked file is over 25 MB, except the song (95 MB, under GitHub's 100 MB limit).
import { execFileSync } from 'node:child_process'
import { readFileSync, readdirSync, statSync } from 'node:fs'

const here = (p) => new URL(p, import.meta.url)
const fail = []
const { scenes } = JSON.parse(readFileSync(here('../storyboard/scenes.json'), 'utf8'))
const sung = new Set(JSON.parse(readFileSync(here('../../analysis/lines.json'), 'utf8')).map((l) => l.id))
const files = new Set(readdirSync(here('../assets/scenes/')).filter((f) => f.endsWith('.js')).map((f) => f.slice(0, -3)))

for (const s of scenes) {
  if (!files.has(s.id)) {
    fail.push(`no scene file for ${s.id}`)
    continue
  }
  const src = readFileSync(here(`../assets/scenes/${s.id}.js`), 'utf8')
  if (!src.includes(`'${s.id}'`) && !src.includes(`"${s.id}"`)) fail.push(`${s.id}.js never names its id`)
  if (sung.has(s.id) && !src.includes('OM.ownWords.add')) fail.push(`${s.id} has a sung line but does not draw its own words`)
}
for (const f of files) if (!scenes.some((s) => s.id === f)) fail.push(`stray scene file ${f}.js (not in storyboard/scenes.json)`)

// Tracked files (skipped outside a git checkout).
let tracked = []
try {
  tracked = execFileSync('git', ['ls-files'], { cwd: here('../..'), encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).split('\n').filter(Boolean)
} catch {}
const local = [/(^|\/)renders\//, /(^|\/)\.hyperframes\//, /^source\//]
const SONG = 'music-video/assets/audio/song.wav', LYRICS = 'music-video/assets/lib/lyrics.js'
for (const f of tracked) {
  if (local.some((r) => r.test(f))) fail.push(`must stay local, but is tracked: ${f}`)
  try {
    if (statSync(here('../../' + f)).size > (f === SONG ? 95 : 25) * 1024 * 1024) fail.push(`too big for the repo: ${f}`)
  } catch {}
}
// The placeholders stand in for the song and its words on machines without them; never commit them.
/** True for the all-zero WAV that scripts/placeholder-audio.mjs writes. */
const silent = (url) => {
  const b = readFileSync(url), d = b.indexOf('data', 12)
  if (d < 0) return false
  for (let i = d + 8; i < b.length; i += 997) if (b[i]) return false
  return true
}
if (tracked.includes(SONG) && silent(here('../../' + SONG))) fail.push(`${SONG} is the silent placeholder: put the real song there`)
if (tracked.includes(LYRICS) && readFileSync(here('../../' + LYRICS), 'utf8').slice(0, 200).includes('(placeholder words)')) fail.push(`${LYRICS} holds placeholder words: run npm run lyrics:build`)

if (fail.length) {
  for (const f of fail) console.error(`verify: ${f}`)
  process.exit(1)
}
console.log(`verify: ok (${scenes.length} scenes, ${[...sung].length} sung lines draw their own words, ${tracked.length} tracked files checked)`)
