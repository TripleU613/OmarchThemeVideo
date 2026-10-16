// Snapshot scenes for review. Default: every scene at 25/50/90% of its window.
// Usage: node scripts/qa-sheet.mjs [id ...]      (ids limit the sheet to those scenes)
import { execFileSync } from 'node:child_process'
import { readFileSync, rmSync } from 'node:fs'

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')
const want = new Set(process.argv.slice(2))
const scenes = [...html.matchAll(/id="s-([^"]+)" class="clip scene" data-start="([\d.]+)" data-duration="([\d.]+)"/g)]
  .map(([, id, s, d]) => ({ id, start: +s, dur: +d }))
  .filter((s) => !want.size || want.has(s.id))
const times = scenes.flatMap((s) => [0.25, 0.5, 0.9].map((f) => +(s.start + s.dur * f).toFixed(3)))
const out = `.hyperframes/qa${want.size ? '-' + [...want].join('_') : ''}`
rmSync(new URL(`../${out}`, import.meta.url), { recursive: true, force: true })
execFileSync('npx', ['hyperframes', 'snapshot', '--at', times.join(','), '--no-end', '-o', out, '--timeout', '15000'], {
  cwd: new URL('..', import.meta.url),
  stdio: 'inherit',
})
console.log(`${scenes.length} scenes, ${times.length} frames -> ${out}/contact-sheet.jpg`)
