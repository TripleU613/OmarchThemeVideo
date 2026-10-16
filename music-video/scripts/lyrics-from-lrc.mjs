// Lays out a word-by-word lyric file you supply (.lrc, .srt or .ass) as
// lyrics.txt on the video's aligned lines, ready for build-lyrics.mjs.
//
//   node scripts/lyrics-from-lrc.mjs ~/Downloads/new/song.lrc
//
// Only your words are used. Their timestamps are estimates and are ignored:
// the video keeps the forced-aligned timing in analysis/lines.json. Where the
// lines break comes from the sheet analysis/align.py aligned against, matched
// to your words token by token (structure only; none of its text is copied).
// A timed word your file has no word for becomes "~" (timed, no text); a word
// of yours with no timed slot rides on the word before it. Prints counts only.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const file = process.argv[2]
if (!file) {
  console.error('usage: node scripts/lyrics-from-lrc.mjs <lyrics.lrc|.srt|.ass>')
  process.exit(1)
}
const raw = fs.readFileSync(file, 'utf8')
let words
if (/\.lrc$/i.test(file)) words = raw.split(/\r?\n/).map((l) => l.match(/^\[\d+:\d+(?:\.\d+)?\](.*)$/)).filter((m) => m && m[1].trim()).map((m) => m[1].trim())
else if (/\.srt$/i.test(file)) words = raw.split(/\r?\n\s*\r?\n/).map((b) => b.trim().split(/\r?\n/).slice(2).join(' ').trim()).filter(Boolean)
else if (/\.ass$/i.test(file)) words = raw.split(/\r?\n/).filter((l) => l.startsWith('Dialogue:')).map((l) => l.split(',').slice(9).join(',').replace(/\{[^}]*\}/g, '').trim()).filter(Boolean)
else {
  console.error('expected a .lrc, .srt or .ass file')
  process.exit(1)
}

// align.py's word rule: letters and apostrophes; anything else splits.
const norm = (s) => s.toLowerCase().replace(/’/g, "'").replace(/[^a-z' ]/g, ' ').split(/\s+/).filter(Boolean)
const U = words.flatMap((w, i) => norm(w).map((t) => ({ i, t })))
const body = fs.readFileSync(path.join(ROOT, '../source/song.description'), 'utf8').split('\nlyrics\n')[1].split('\n---')[0]
const sheet = body.split(/\r?\n/).map((s) => s.trim()).filter((s) => s && !/^\[.+\]$/.test(s))
const LJ = JSON.parse(fs.readFileSync(path.join(ROOT, '../analysis/lines.json'), 'utf8'))
const lines = Array.isArray(LJ) ? LJ : LJ.lines
const S = sheet.flatMap((s, li) => norm(s).map((t) => ({ li, t })))
if (sheet.length !== lines.length || S.length !== lines.reduce((n, l) => n + l.words.length, 0)) {
  console.error('the sheet no longer matches analysis/lines.json; re-run the alignment first')
  process.exit(1)
}

// Longest common subsequence of tokens, then each gap between matches is filled in order.
const n = U.length, m = S.length
const dp = Array.from({ length: n + 1 }, () => new Int32Array(m + 1))
for (let a = n - 1; a >= 0; a--) for (let b = m - 1; b >= 0; b--) dp[a][b] = U[a].t === S[b].t ? dp[a + 1][b + 1] + 1 : Math.max(dp[a + 1][b], dp[a][b + 1])
const pairs = []
for (let a = 0, b = 0; a < n && b < m; ) {
  if (U[a].t === S[b].t) pairs.push([a++, b++])
  else if (dp[a + 1][b] >= dp[a][b + 1]) a++
  else b++
}
const slot = new Array(m).fill(null) // user word index for each timed slot
const extra = [] // [user word index, slot it rides on]
let pa = 0, pb = 0
for (const [a, b] of [...pairs, [n, m]]) {
  // gap: user tokens pa..a-1, slots pb..b-1
  const gu = U.slice(pa, a), k = b - pb
  gu.forEach((u, j) => (j < k ? (slot[pb + j] = u.i) : extra.push([u.i, Math.max(0, pb + k - 1)])))
  if (a < n) slot[b] = U[a].i
  pa = a + 1
  pb = b + 1
}

// One output line per aligned line; a user word is written once, at its first slot.
const out = lines.map(() => [])
const seen = new Set()
const blanks = [], riders = []
S.forEach((s, b) => {
  const i = slot[b]
  if (i === null) { out[s.li].push('~'); blanks.push(lines[s.li].id); return }
  if (seen.has(i)) return
  seen.add(i)
  let w = words[i]
  for (const [e, at] of extra) if (at === b) { w += ' ' + words[e]; riders.push(lines[s.li].id) }
  out[s.li].push(w)
})
fs.writeFileSync(path.join(ROOT, 'lyrics.txt'), out.map((ws) => ws.join(' ')).join('\n') + '\n')
console.log(`lyrics.txt written: ${lines.length} lines; ${words.length} of your words placed on ${m - blanks.length} of ${m} timed words`)
if (blanks.length) console.log(`timed words with no word in your file (left blank): ${blanks.join(', ')}`)
if (riders.length) console.log(`words of yours with no timed slot (joined to the word before): ${riders.join(', ')}`)
