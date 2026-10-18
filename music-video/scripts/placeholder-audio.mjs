// Writes a silent assets/audio/song.wav the length of the film when no song is
// present (a checkout without the tracked song), so the composition lints and
// previews without it. Leaves an existing song.wav untouched. Never commit it:
// npm run verify fails on a tracked silent song.
//
//   node scripts/placeholder-audio.mjs
import { existsSync, readFileSync, writeFileSync } from 'node:fs'

const here = (p) => new URL(p, import.meta.url)
const out = here('../assets/audio/song.wav')
if (existsSync(out)) {
  console.log('assets/audio/song.wav already exists; left as is.')
  process.exit(0)
}
const { audio } = JSON.parse(readFileSync(here('../../analysis/audiomap.json'), 'utf8'))
const rate = 8000, seconds = Math.ceil(audio.duration_sec)
const data = rate * seconds * 2 // 16-bit mono
const wav = Buffer.alloc(44 + data)
wav.write('RIFF', 0); wav.writeUInt32LE(36 + data, 4); wav.write('WAVE', 8)
wav.write('fmt ', 12); wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22)
wav.writeUInt32LE(rate, 24); wav.writeUInt32LE(rate * 2, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34)
wav.write('data', 36); wav.writeUInt32LE(data, 40)
writeFileSync(out, wav)
console.log(`wrote a silent ${seconds}s placeholder at assets/audio/song.wav`)
