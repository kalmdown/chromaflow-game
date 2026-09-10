/**
 * Mulberry32 — a tiny deterministic PRNG.
 *
 * The whole engine is replayable, so the RNG cursor lives inside `GameState`
 * and every consumer threads the next cursor back out. Undo restores the
 * cursor along with the board, which keeps shuffles reproducible.
 */
export function nextRandom(seed: number): { value: number; seed: number } {
  let t = (seed + 0x6d2b79f5) | 0
  let r = Math.imul(t ^ (t >>> 15), 1 | t)
  r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r
  return { value: ((r ^ (r >>> 14)) >>> 0) / 4294967296, seed: t }
}

/** Integer in `[0, max)`. */
export function nextInt(seed: number, max: number): { value: number; seed: number } {
  const r = nextRandom(seed)
  return { value: Math.floor(r.value * max), seed: r.seed }
}

/** Fisher–Yates over a copy of `items`. */
export function shuffled<T>(items: T[], seed: number): { value: T[]; seed: number } {
  const out = items.slice()
  let s = seed
  for (let i = out.length - 1; i > 0; i--) {
    const r = nextInt(s, i + 1)
    s = r.seed
    const j = r.value
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return { value: out, seed: s }
}
