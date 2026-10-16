import { readFileSync } from 'node:fs'
const base = new URL('../../omarchy-site/public/ttfx/', import.meta.url)
const ttfx = await import(new URL('0.3.2/ttfx.js', base))
await ttfx.default({ module_or_path: readFileSync(new URL('effects/all.wasm', base)) })
const catalog = JSON.parse(ttfx.effect_catalog())
console.log(catalog.length, 'effects')
for (const e of catalog) console.log(`  ${e.name.padEnd(16)} ${e.about.slice(0, 90)}`)
