// How many steps each effect needs for the wordmark (padded like the hero) and the ASCII screen.
import { readFileSync } from 'node:fs'
const ttfx = await import(new URL('../assets/ttfx/ttfx.js', import.meta.url))
await ttfx.default({ module_or_path: readFileSync(new URL('../assets/ttfx/all.wasm', import.meta.url)) })
const rows = readFileSync(new URL('../assets/lib/om.js', import.meta.url), 'utf8').match(/WORDMARK = \{[\s\S]*?rows: \[([\s\S]*?)\]/)[1].match(/'([01]+)'/g).map((s) => s.slice(1, -1))
const pad = (r) => '      ' + [...r].map((b) => (b === '1' ? '█' : ' ')).join('') + '      '
const blank = ' '.repeat(81 + 12)
const text = [...Array(4).fill(blank), ...rows.map(pad), ...Array(4).fill(blank)].join('\n')
for (const effect of process.argv.slice(2)) {
  const s = new ttfx.Session(text, effect, 93, 27, 7, 240, null, null)
  let n = 1
  while (s.step() && n < 200000) n++
  console.log(effect.padEnd(16), n, 'steps', `(${(n / 240).toFixed(2)}s @240)`, `${s.width()}x${s.height()}`)
  s.free()
}
