"""Forced-align the song's known lyric lines to the isolated vocal stem.

Reads the line text from source/song.description at runtime (it is never
copied out), runs wav2vec2 CTC emissions over the vocal stem, Viterbi-aligns
the whole lyric sheet in one pass, and writes timing only:

  analysis/lines.json  [{id, section, start, end, words: [[start, end], ...]}]

Usage: python align.py <vocals.wav>
"""
import json
import re
import sys
from pathlib import Path

import librosa
import numpy as np
import torch
from transformers import Wav2Vec2ForCTC, Wav2Vec2Processor

ROOT = Path(__file__).resolve().parent.parent
MODEL = "facebook/wav2vec2-large-960h-lv60-self"
SR = 16000
CHUNK_S, PAD_S = 20.0, 2.0
SECTION_IDS = {
    "verse 1": "v1", "verse 2": "v2", "pre-chorus": "p", "chorus": "c",
    "bridge": "b", "final chorus": "c3", "outro": "o",
}


def read_lines():
    text = (ROOT / "source/song.description").read_text()
    body = text.split("\nlyrics\n", 1)[1].split("\n---", 1)[0]
    lines, section, seen = [], None, {}
    for raw in body.splitlines():
        raw = raw.strip()
        if not raw:
            continue
        head = re.fullmatch(r"\[(.+)\]", raw)
        if head:
            name = head.group(1).lower()
            base = SECTION_IDS[name]
            seen[base] = seen.get(base, 0) + 1
            section = base if base in ("v1", "v2", "b", "c3", "o") else f"{base}{seen[base]}"
            continue
        n = sum(1 for l in lines if l["section"] == section) + 1
        lines.append({"id": f"{section}-{n:02d}", "section": section, "text": raw})
    return lines


def emissions(wav):
    proc = Wav2Vec2Processor.from_pretrained(MODEL)
    model = Wav2Vec2ForCTC.from_pretrained(MODEL).eval()
    hop = int(CHUNK_S * SR)
    pad = int(PAD_S * SR)
    out = []
    for s in range(0, len(wav), hop):
        a, b = max(0, s - pad), min(len(wav), s + hop + pad)
        x = proc(wav[a:b], sampling_rate=SR, return_tensors="pt").input_values
        with torch.inference_mode():
            lp = torch.log_softmax(model(x).logits[0], -1).numpy()
        fps = lp.shape[0] / ((b - a) / SR)
        lo = int(round((s - a) / SR * fps))
        hi = lo + int(round(min(hop, len(wav) - s) / SR * fps))
        out.append(lp[lo:hi])
    lp = np.concatenate(out)
    return lp, len(wav) / SR / lp.shape[0], proc.tokenizer.get_vocab()


def viterbi(lp, tokens, blank):
    """CTC forced alignment: best path through blank-interleaved tokens."""
    T, L = lp.shape[0], len(tokens)
    S = 2 * L + 1
    ext = np.full(S, blank)
    ext[1::2] = tokens
    NEG = -1e30
    dp = np.full((T, S), NEG, dtype=np.float32)
    bp = np.zeros((T, S), dtype=np.int8)
    dp[0, 0] = lp[0, ext[0]]
    dp[0, 1] = lp[0, ext[1]]
    skip_ok = np.zeros(S, bool)
    skip_ok[3::2] = ext[3::2] != ext[1:-2:2]
    for t in range(1, T):
        prev = dp[t - 1]
        stay = prev
        step = np.concatenate([[NEG], prev[:-1]])
        skip = np.concatenate([[NEG, NEG], prev[:-2]])
        skip = np.where(skip_ok, skip, NEG)
        stack = np.stack([stay, step, skip])
        choice = stack.argmax(0)
        dp[t] = stack[choice, np.arange(S)] + lp[t, ext]
        bp[t] = choice
    s = S - 1 if dp[-1, S - 1] > dp[-1, S - 2] else S - 2
    path = np.empty(T, dtype=np.int32)
    for t in range(T - 1, -1, -1):
        path[t] = s
        s -= int(bp[t, s])
    return path


def main():
    vocals = sys.argv[1]
    wav, _ = librosa.load(vocals, sr=SR, mono=True)
    lines = read_lines()
    cache = ROOT / "analysis" / (Path(vocals).stem + ".emissions.npz")
    if cache.exists():
        z = np.load(cache)
        lp, sec_per_frame, vocab = z["lp"], float(z["spf"]), json.loads(str(z["vocab"]))
    else:
        lp, sec_per_frame, vocab = emissions(wav)
        np.savez(cache, lp=lp, spf=sec_per_frame, vocab=np.array(json.dumps(vocab)))
    blank = vocab["<pad>"]
    sep = vocab["|"]

    tokens, owner = [], []  # owner: (line index, word index) per token, None for "|"
    for li, line in enumerate(lines):
        words = re.sub(r"[^a-z' ]", " ", line["text"].lower().replace("’", "'")).split()
        line["n_words"] = len(words)
        for wi, w in enumerate(words):
            for ch in w.upper():
                if ch in vocab:
                    tokens.append(vocab[ch])
                    owner.append((li, wi))
            tokens.append(sep)
            owner.append(None)
    path = viterbi(lp, np.array(tokens), blank)

    spans = {}
    for t, s in enumerate(path):
        if s % 2 == 1:
            o = owner[s // 2]
            if o is None:
                continue
            a, b = spans.get(o, (t, t))
            spans[o] = (min(a, t), max(b, t))

    out = []
    for li, line in enumerate(lines):
        words = []
        for wi in range(line["n_words"]):
            a, b = spans.get((li, wi), (None, None))
            words.append([round(a * sec_per_frame, 3), round((b + 1) * sec_per_frame, 3)] if a is not None else None)
        known = [w for w in words if w]
        out.append({
            "id": line["id"], "section": line["section"],
            "start": known[0][0], "end": known[-1][1], "words": words,
        })
    (ROOT / "analysis/lines.json").write_text(json.dumps(out, indent=1))
    for l in out:
        print(f'{l["id"]:7s} {l["start"]:8.3f} -> {l["end"]:8.3f}  ({l["end"]-l["start"]:5.2f}s, {len(l["words"])} words)')


if __name__ == "__main__":
    main()
