// Repo hygiene, run locally (`npm run verify`) and in CI:
// - every storyboard scene has a scene file that names its id, and no scene file is a stray;
// - every sung line's scene draws its own words (OM.ownWords.add): the words are the motion;
// - nothing that must stay local is tracked: song audio, lyric text, renders, snapshot caches;
// - no tracked file is over 25 MB.
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
const local = [/(^|\/)lyrics\.txt$/, /assets\/lib\/lyrics\.js$/, /\.(wav|mp3|flac|m4a|aac|ogg|mp4|mov|webm|mkv)$/i, /(^|\/)renders\//, /(^|\/)\.hyperframes\//, /^source\//]
for (const f of tracked) {
  if (local.some((r) => r.test(f))) fail.push(`must stay local, but is tracked: ${f}`)
  try {
    if (statSync(here('../../' + f)).size > 25 * 1024 * 1024) fail.push(`over 25 MB: ${f}`)
  } catch {}
}

if (fail.length) {
  for (const f of fail) console.error(`verify: ${f}`)
  process.exit(1)
}
console.log(`verify: ok (${scenes.length} scenes, ${[...sung].length} sung lines draw their own words, ${tracked.length} tracked files checked)`)
