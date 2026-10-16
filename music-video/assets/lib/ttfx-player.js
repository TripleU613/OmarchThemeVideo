// The site's own text-effect engine (ttfx, github.com/omacom/ttfx), the one
// that etches the homepage wordmark and runs the Omarchy screensaver.
// Sessions are seeded, so a given (input, effect, seed) always plays the
// same frames; seeking forward steps on, seeking back restarts.
(function () {
  const OM = window.OM;
  const BLOCK = 0x2588;

  /** Loads the engine once; resolves before the composition registers. */
  OM.loadTtfx = () =>
    (OM._ttfxLoading ??= import(new URL('assets/ttfx/ttfx.js', document.baseURI).href).then(async (mod) => {
      await mod.default({ module_or_path: new URL('assets/ttfx/all.wasm', document.baseURI).href });
      OM.TTFX = mod;
      return mod;
    }));

  /** Text input for a bitmap: one full block per lit cell, padded around. */
  OM.bitmapText = (bitmap, padCols = 6, padRows = 4) => {
    const cols = bitmap.w + padCols * 2;
    const blank = ' '.repeat(cols);
    const lines = [];
    for (let r = 0; r < padRows; r++) lines.push(blank);
    for (const row of bitmap.rows) lines.push(' '.repeat(padCols) + [...row].map((b) => (b === '1' ? '█' : ' ')).join('') + ' '.repeat(padCols));
    for (let r = 0; r < padRows; r++) lines.push(blank);
    return { text: lines.join('\n'), cols, rows: bitmap.h + padRows * 2, padCols, padRows };
  };

  /**
   * A seekable effect. at(t) returns the frame t seconds in:
   * { w, h, symbols, fg, flags, done }. Cells with symbol 32/0 are empty.
   */
  OM.effect = ({ text, effect, cols, rows, seed = 7, sps = 240, palette = null, background = null }) => {
    let session = null, steps = 0, done = false, w = 0, h = 0;
    let symbols, fg, bg, flags;
    const reset = () => {
      if (session) session.free();
      session = new OM.TTFX.Session(text, effect, cols, rows, seed, sps, palette, background);
      steps = 0;
      done = false;
    };
    return {
      at(t) {
        const target = Math.max(1, Math.floor(Math.max(0, t) * sps) + 1);
        if (!session || target < steps) reset();
        while (steps < target && !done) {
          done = !session.step();
          steps++;
        }
        w = session.width();
        h = session.height();
        const n = w * h;
        if (!symbols || symbols.length < n) {
          symbols = new Uint32Array(n);
          fg = new Uint32Array(n);
          bg = new Uint32Array(n);
          flags = new Uint8Array(n);
        }
        session.fill(symbols, fg, bg, flags);
        return { w, h, symbols, fg, bg, flags, done, BLOCK };
      },
      /**
       * Where ttfx actually puts the text, relative to where the input placed
       * it (the engine re-centers its block). Measured once by running a probe
       * to the end, as omarchy-site's etch measureOffset does.
       */
      offset() {
        const key = effect + ':' + cols + 'x' + rows + ':' + text;
        if (OFFSETS.has(key)) return OFFSETS.get(key);
        const probe = new OM.TTFX.Session(text, effect, cols, rows, seed, sps, palette, background);
        for (let guard = 0; guard < 200000 && probe.step(); guard++);
        const pw = probe.width(), ph = probe.height();
        const sym = new Uint32Array(pw * ph);
        probe.fill(sym, new Uint32Array(pw * ph), new Uint32Array(pw * ph), new Uint8Array(pw * ph));
        probe.free();
        const out = sym.findIndex((x) => x === BLOCK);
        const lines = text.split('\n');
        const inRow = lines.findIndex((l) => l.includes('█'));
        let found = { dx: 0, dy: 0 };
        if (out >= 0 && inRow >= 0) found = { dx: (out % pw) - [...lines[inRow]].indexOf('█'), dy: Math.floor(out / pw) - inRow };
        OFFSETS.set(key, found);
        return found;
      },
      free() {
        if (session) session.free();
        session = null;
      },
    };
  };
  const OFFSETS = new Map();
})();
