// Timing facts for scenes, for whoever builds them: each scene's window (as
// assembled into index.html), its neighbours, its sung words' onset and end
// (timing only, never text), and the music inside the window from
// analysis/audiomap.json: downbeats, strong kicks, snares, rolls, specials and
// the energy level.
//
//   node scripts/scene-facts.mjs v1-01 v1-02 ...
import { readFileSync } from 'node:fs'

const here = (p) => new URL(p, import.meta.url)
const html = readFileSync(here('../index.html'), 'utf8')
const order = [...html.matchAll(/id="s-([^"]+)" class="clip scene" data-start="([\d.]+)" data-duration="([\d.]+)"/g)].map((m) => ({ id: m[1], from: +m[2], end: +m[2] + +m[3] }))
const lines = Object.fromEntries(JSON.parse(readFileSync(here('../../analysis/lines.json'), 'utf8')).map((l) => [l.id, l]))
const map = JSON.parse(readFileSync(here('../../analysis/audiomap.json'), 'utf8'))
const f = (t) => (+t).toFixed(3)

for (const id of process.argv.slice(2)) {
  const k = order.findIndex((s) => s.id === id)
  if (k < 0) { console.log(`${id}: no such scene`); continue }
  const { from: a, end: b } = order[k]
  const ev = map.events.filter((e) => e.t >= a && e.t < b)
  const pick = (drum, min) => ev.filter((e) => e.drum === drum && e.energy >= min).map((e) => f(e.t))
  const l = lines[id]
  console.log(`== ${id}  window ${f(a)} -> ${f(b)}  (${(b - a).toFixed(2)}s)  prev ${order[k - 1]?.id ?? 'none'}  next ${order[k + 1]?.id ?? 'none'}`)
  console.log(l ? `  words (${l.words.length}): ${l.words.map((w, i) => `w${i} ${f(w[0])}-${f(w[1])}`).join(', ')}` : '  words: none (music only)')
  console.log(`  downbeats: ${map.grid.downbeats_sec.filter((t) => t >= a && t < b).map(f).join(', ') || '-'}`)
  console.log(`  strong kicks: ${pick('kick', 0.2).join(', ') || '-'}`)
  console.log(`  snares: ${pick('snare', 0.15).join(', ') || '-'}`)
  const rolls = map.rolls.filter((r) => r.start < b && r.end > a).map((r) => `${r.kind} ${r.drum} ${f(r.start)}-${f(r.end)}`)
  console.log(`  rolls: ${rolls.join('; ') || '-'}`)
  const special = ev.filter((e) => e.special).map((e) => `${e.special}@${f(e.t)}`)
  const keys = map.key_moments.filter((m) => m.t >= a && m.t < b).map((m) => `${m.kind}@${m.t}`)
  if (special.length || keys.length) console.log(`  moments: ${[...special, ...keys].join(', ')}`)
  const ph = map.energy_phases.filter((p) => p.start < b && p.end > a).map((p) => `${p.start}-${p.end}s ${p.level} ${p.energy.toFixed(2)}`)
  console.log(`  energy: ${ph.join('; ')}`)
}
