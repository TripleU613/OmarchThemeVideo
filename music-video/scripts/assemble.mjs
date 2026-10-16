// Assembles index.html and STORYBOARD.md from storyboard/scenes.json and the
// measured timing. A line's scene starts on the beat just before the vocal
// when one falls within 0.30s, otherwise 60ms ahead of it; every scene runs
// until the next begins. Scenes not built yet render as a labelled slate.
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'

const here = (p) => new URL(p, import.meta.url)
const { scenes, tail = 0 } = JSON.parse(readFileSync(here('../storyboard/scenes.json'), 'utf8'))
const lines = Object.fromEntries(JSON.parse(readFileSync(here('../../analysis/lines.json'), 'utf8')).map((l) => [l.id, l]))
const map = JSON.parse(readFileSync(here('../../analysis/audiomap.json'), 'utf8'))
const beats = map.grid.beats_sec
const SONG = map.audio.duration_sec
// The film may run `tail` seconds past the song (scenes.json): the last scene holds on in silence.
const DURATION = SONG + tail
const r3 = (x) => Math.round(x * 1000) / 1000

// A hard cut must land at or before the first sung word, so cut scenes take no late-beat tolerance.
function lead(t, strict = false) {
  let best = null
  for (const b of beats) if (b <= t + (strict ? 0 : 0.05)) best = b
  return best !== null && t - best <= 0.3 ? best : t - 0.06
}

const timed = scenes.map((s) => ({ ...s, start: r3(s.at ?? lead(lines[s.line].start, s.trans === 'cut')) }))
// Transitions: a scene names one ({ type, v, beats }) or "cut"; otherwise it takes the
// next unused one from the pool. No (type, variant) is ever used twice.
const POOL = [
  ['dither'], ['iris'], ['wipe', { deg: 0 }], ['noise'], ['columns'], ['diamond'], ['clock'], ['venetian'],
  ['iris', { x: 0, y: 0 }], ['wipe', { deg: 90 }], ['doors'], ['spiral'], ['box'], ['rain'], ['wipe', { deg: 225 }],
  ['noise', { seed: 3 }], ['checker'], ['iris', { x: 1920, y: 1080 }], ['columns', { from: 'right' }], ['stairs'],
  ['wipe', { deg: 180 }], ['cross'], ['diamond', { x: 0, y: 540 }], ['doors', { axis: 'y' }], ['band'], ['clock', { x: 960, y: 1080 }],
  ['iris', { x: 1920, y: 0 }], ['wipe', { deg: 315 }], ['box', { x: 480, y: 540 }], ['noise', { seed: 7 }], ['wipe', { deg: 270 }],
  ['iris', { x: 0, y: 1080 }], ['diamond', { x: 1920, y: 540 }], ['wipe', { deg: 45 }], ['clock', { x: 0, y: 0 }], ['wipe', { deg: 135 }],
  ['zigzag'], ['blinds'], ['shards'], ['ripple'], ['interlace'], ['tetris'], ['snake'], ['quad'], ['sunburst'], ['blocks'],
  ['stripes'], ['gate'], ['corners'], ['ring'], ['logopath'], ['word'], ['mark'], ['word', { x: 640, y: 540 }], ['mark', { x: 1440, y: 540 }],
  ['iris', { x: 960, y: 1080 }], ['diamond', { x: 960, y: 0 }], ['clock', { x: 1920, y: 1080 }],
]
const key = (type, v) => type + JSON.stringify(v || {})
const used = new Set(timed.filter((s) => s.trans && s.trans !== 'cut').map((s) => key(s.trans.type, s.trans.v)))
const SPB = 60 / map.tempo.bpm
timed.forEach((s, i) => {
  s.end = r3(i + 1 < timed.length ? timed[i + 1].start : DURATION)
  if (s.end <= s.start) throw new Error(`${s.id}: empty window ${s.start}-${s.end}`)
  if (i === 0 || s.trans === 'cut') { s.trans = null; s.enter = 0; return }
  if (!s.trans) {
    const next = POOL.find(([type, v]) => !used.has(key(type, v)))
    if (!next) throw new Error('transition pool exhausted at ' + s.id)
    used.add(key(...next))
    s.trans = { type: next[0], v: next[1] }
  }
  s.enter = r3((s.trans.beats ?? 1) * SPB)
})
const seen = new Map()
for (const s of timed) if (s.trans) {
  const k = key(s.trans.type, s.trans.v)
  if (seen.has(k)) throw new Error(`transition reused: ${s.id} and ${seen.get(k)} (${k})`)
  seen.set(k, s.id)
}

const built = (id) => existsSync(here(`../assets/scenes/${id}.js`))
const sections = timed
  .map((s, i) => {
    const from = r3(s.start - s.enter)
    return `      <section id="s-${s.id}" class="clip scene" data-start="${from}" data-duration="${r3(s.end - from)}" data-enter="${s.enter}" data-track-index="${(i % 2) + 1}"></section>`
  })
  .join('\n')
// Built scenes load their file; the rest get an inline slate (no 404s). Re-run after adding scenes.
const scripts = timed
  .map((s) => (built(s.id) ? `    <script src="assets/scenes/${s.id}.js"></script>` : `    <script>OM.slate(${JSON.stringify({ id: s.id, device: s.device, theme: s.theme, line: s.line || null })})</script>`))
  .join('\n') +
  // Captions load only once scripts/build-lyrics.mjs has written lyrics.js from your lyrics.txt.
  (existsSync(here('../assets/lib/lyrics.js')) ? '\n    <script src="assets/lib/lyrics.js"></script>\n    <script src="assets/lib/captions.js"></script>' : '') +
  // Frame effects sit above the scenes and below the captions. NO_FRAMES=1 leaves them out, for the
  // draft renders scripts/edge-need.mjs measures (they must not see the layer they decide).
  (process.env.NO_FRAMES !== '1' && existsSync(here('../assets/lib/frame-need.js'))
    ? '\n    <script src="assets/lib/frame-need.js"></script>\n    <script src="assets/lib/frames.js"></script>'
    : '')

const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1920, height=1080" />
    <!-- Generated by scripts/assemble.mjs from storyboard/scenes.json. Edit those, then re-run. -->
    <script src="assets/vendor/gsap.min.js"></script>
    <script src="assets/vendor/three.iife.min.js"></script>
    <script src="assets/lib/themes.js"></script>
    <script src="assets/lib/timing.js"></script>
    <script src="assets/lib/audio.js"></script>
    <script src="assets/lib/meetup-map.js"></script>
    <script src="assets/lib/globe.js"></script>
    <script src="assets/lib/om.js"></script>
    <script src="assets/lib/stage.js"></script>
    <script src="assets/lib/ttfx-player.js"></script>
    <script src="assets/lib/kit.js"></script>
    <script src="assets/lib/transitions.js"></script>
    <script src="assets/lib/handoff.js"></script>
    <script src="assets/lib/post.js"></script>
    <script>window.OM_TRANS = ${JSON.stringify(Object.fromEntries(timed.filter((s) => s.trans).map((s) => [s.id, s.trans])))};</script>
    <style>
      @font-face {
        font-family: 'JetBrains Mono';
        src: url('assets/fonts/jetbrains-mono-var.woff2') format('woff2');
        font-weight: 100 800;
        font-style: normal;
      }
      @font-face {
        font-family: 'JetBrains Mono';
        src: url('assets/fonts/jetbrains-mono-var-italic.woff2') format('woff2');
        font-weight: 100 800;
        font-style: italic;
      }
      @font-face {
        font-family: 'Geist';
        src: url('assets/fonts/geist-var.woff2') format('woff2');
        font-weight: 100 900;
      }
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { margin: 0; overflow: hidden; background: #0e0e14; }
      #root { position: relative; width: 100%; height: 100%; overflow: hidden; background: #0e0e14; font-family: 'JetBrains Mono', monospace; }
      .scene { position: absolute; inset: 0; overflow: hidden; }
      .om-fill, .om-gl { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
      .om-slate { position: absolute; inset: 0; display: flex; flex-direction: column; justify-content: center; gap: 18px; padding: 0 160px; background: #13141c; color: #c0caf5; font-family: 'JetBrains Mono', monospace; }
      .om-slate b { font-size: 64px; font-weight: 600; color: #9ece6a; }
      .om-slate span { font-size: 30px; color: #a9b1d6; }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-width="1920" data-height="1080" data-duration="${r3(DURATION)}">
${sections}
      <audio id="song" src="assets/audio/song.wav" data-start="0" data-duration="${r3(SONG)}" data-track-index="10" data-volume="1"></audio>
    </div>
${scripts}
    <script>
      // Bound now, so the player never sees an empty registry; the runtime holds
      // seeking until fonts and the ttfx engine are ready.
      window.__hf = window.__hf || {};
      window.__hf.buildReady = window.__hf.buildReady || {};
      window.__hf.buildReady['om-assets'] = Promise.all([document.fonts.ready, OM.loadTtfx()]);
      const tl = gsap.timeline({ paused: true });
      OM.mount(tl, ${r3(DURATION)});
      window.__timelines['main'] = tl;
    </script>
  </body>
</html>
`
writeFileSync(here('../index.html'), html)

// dev.html: the live player. Same scenes and libraries, no composition id, driven by the song.
const head = html.slice(html.indexOf('<script src="assets/vendor'), html.indexOf('<style>'))
const fonts = html.slice(html.indexOf('@font-face'), html.indexOf('* { margin'))
const meta = Object.fromEntries(timed.map((s) => [s.id, { device: s.device, theme: s.theme, line: s.line || null, built: built(s.id) }]))
const dev = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Omarchy video · dev player</title>
    <!-- Generated by scripts/assemble.mjs. Live preview only; renders come from index.html. -->
    ${head}<link rel="stylesheet" href="assets/dev/player.css" />
    <style>
      ${fonts}.om-fill, .om-gl { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
      .om-slate { position: absolute; inset: 0; display: flex; flex-direction: column; justify-content: center; gap: 18px; padding: 0 160px; background: #13141c; color: #c0caf5; font-family: 'JetBrains Mono', monospace; }
      .om-slate b { font-size: 64px; font-weight: 600; color: #9ece6a; }
      .om-slate span { font-size: 30px; color: #a9b1d6; }
    </style>
  </head>
  <body>
    <div id="app">
      <div id="view">
        <div id="root">
${sections.replaceAll(' class="clip scene"', ' class="scene"')}
        </div>
      </div>
      <aside id="list"></aside>
      <footer>
        <div class="row"><button id="play"></button><button id="loop">loop scene</button><span id="time"></span><span id="hud-id"></span><span id="hud-dev"></span><span id="dots"></span><span id="hud-theme"></span></div>
        <div id="scrub"></div>
        <div class="row keys">space play · ←/→ 2s · shift+←/→ scene · ,/. frame · L loop · M mute · time is in the URL</div>
      </footer>
    </div>
    <audio id="song" src="assets/audio/song.wav" preload="none"></audio>
    <script>window.OM_SCENES = ${JSON.stringify(meta)};</script>
${scripts}
    <script src="assets/dev/player.js"></script>
  </body>
</html>
`
// dev.html only: each local script and stylesheet URL carries a hash of its content, so a
// rewritten scene is a new URL and a browser can never run a stale cached copy. A content
// hash (not mtime) keeps the page identical on every machine; lyrics.js is left unstamped
// because it is built locally from your own lyrics file and never committed.
const hash = (p) => createHash('sha1').update(readFileSync(here('../' + p))).digest('hex').slice(0, 8)
const versioned = (html) =>
  html.replace(/(src|href)="(assets\/[^"?]+\.(?:js|css))"/g, (m, attr, p) => (p === 'assets/lib/lyrics.js' ? m : `${attr}="${p}?v=${hash(p)}"`))
writeFileSync(here('../dev.html'), versioned(dev))

const fmt = (t) => `${Math.floor(t / 60)}:${(t % 60).toFixed(2).padStart(5, '0')}`
const md = [
  '---',
  'canvas: { w: 1920, h: 1080, render: 3840x2160 }',
  'mode: companion',
  'message: "Omarchy is the ultimate machine: beautiful, malleable, yours"',
  '---',
  '',
  '# Storyboard',
  '',
  'Generated from `storyboard/scenes.json` by `scripts/assemble.mjs`. Lines are referenced by id only.',
  '',
  '| # | id | window | theme | signature device | transition in | built |',
  '|---|----|--------|-------|------------------|---------------|-------|',
  ...timed.map((s, i) => `| ${i + 1} | ${s.id} | ${fmt(s.start)} - ${fmt(s.end)} (${(s.end - s.start).toFixed(2)}s) | ${s.theme} | ${s.device} | ${s.trans ? s.trans.type + (s.trans.v ? ' ' + JSON.stringify(s.trans.v) : '') : 'cut'} | ${built(s.id) ? 'yes' : '-'} |`),
  '',
  ...timed.flatMap((s) => [`## ${s.id} · ${fmt(s.start)}${s.line ? ` · line ${s.line}` : ''}`, '', `**Device:** ${s.device}  `, `**World / theme / tech:** ${s.world} / ${s.theme} / ${s.tech}  `, `**Sync:** ${s.sync}`, '', s.idea, '']),
].join('\n')
writeFileSync(here('../STORYBOARD.md'), md)

const devices = new Map()
for (const s of timed) {
  const k = s.device.toLowerCase()
  if (devices.has(k)) throw new Error(`device reused: ${s.id} and ${devices.get(k)}`)
  devices.set(k, s.id)
}
console.log(`${timed.length} scenes, ${timed.filter((s) => built(s.id)).length} built, ${devices.size} unique devices, ends ${fmt(DURATION)}`)
