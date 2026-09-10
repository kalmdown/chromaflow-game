/**
 * Development-only solvability tools.
 *
 * The shipped catalogue stores a reference solution per level; `replaySolution`
 * verifies it through the real engine (that is what the test-suite and the
 * dev-only `validateLevels` call). `findSolution` is the search used offline by
 * `scripts/generate-levels.ts` to discover those reference solutions and to set
 * each level's turn limit.
 */
import { countUnowned } from './board.ts'
import { applyMove, createGame } from './engine.ts'
import { nextInt } from './rng.ts'
import type { ColorId, GameState, LevelDefinition } from './types.ts'

export interface SolveOptions {
  /** Randomised greedy restarts. */
  attempts?: number
  /** Hard cap on moves per attempt. */
  maxMoves?: number
  seed?: number
}

export interface ReplayResult {
  ok: boolean
  reason?: string
  finalState: GameState
}

/** Replays a stored solution through the engine and reports whether it wins. */
export function replaySolution(level: LevelDefinition, solution?: ColorId[]): ReplayResult {
  let state = createGame(level)
  const moves = solution ?? level.solution ?? []
  if (moves.length === 0) {
    return { ok: false, reason: 'no reference solution recorded', finalState: state }
  }
  if (moves.length > level.turnLimit) {
    return {
      ok: false,
      reason: `solution needs ${moves.length} moves but the limit is ${level.turnLimit}`,
      finalState: state,
    }
  }
  for (const [i, color] of moves.entries()) {
    const result = applyMove(state, color)
    if (!result.ok) {
      return { ok: false, reason: `move ${i + 1} rejected (${result.rejected})`, finalState: state }
    }
    state = result.state
  }
  if (state.status !== 'won') {
    return {
      ok: false,
      reason: state.status === 'lost' ? `lost: ${state.lossReason}` : 'board left unfinished',
      finalState: state,
    }
  }
  return { ok: true, finalState: state }
}

/**
 * Randomised greedy search with restarts. Any move that would end the level in
 * a loss is discarded outright, which is what keeps the search honest about the
 * "save the target colour for last" rule.
 */
export function findSolution(level: LevelDefinition, options: SolveOptions = {}): ColorId[] | null {
  const attempts = options.attempts ?? 600
  const maxMoves = options.maxMoves ?? level.width * level.height
  let seed = options.seed ?? level.seed ?? 1
  let best: ColorId[] | null = null

  for (let attempt = 0; attempt < attempts; attempt++) {
    // The first attempt is pure greedy; later ones widen the random pick.
    const spread = attempt === 0 ? 1 : 1 + (attempt % 3)
    const run = greedyAttempt(level, maxMoves, seed, spread, best?.length ?? Infinity)
    seed = run.seed
    if (run.moves && (!best || run.moves.length < best.length)) best = run.moves
  }
  return best
}

interface AttemptResult {
  moves: ColorId[] | null
  seed: number
}

function greedyAttempt(
  level: LevelDefinition,
  maxMoves: number,
  seed: number,
  spread: number,
  limit: number,
): AttemptResult {
  let state = createGame(level)
  const moves: ColorId[] = []
  let rng = seed

  while (state.status === 'playing' && moves.length < maxMoves && moves.length < limit) {
    const candidates: { color: ColorId; gain: number; wins: boolean }[] = []
    for (const color of level.colors) {
      if (color === state.board.ownedColor) continue
      const result = applyMove(state, color)
      if (!result.ok || result.state.status === 'lost') continue
      candidates.push({
        color,
        gain: result.absorbed.length,
        wins: result.state.status === 'won',
      })
    }
    if (candidates.length === 0) return { moves: null, seed: rng }

    const winner = candidates.find((c) => c.wins)
    let pick: ColorId
    if (winner) {
      pick = winner.color
    } else {
      candidates.sort((a, b) => b.gain - a.gain)
      const pool = candidates.slice(0, Math.min(spread, candidates.length))
      const roll = nextInt(rng, pool.length)
      rng = roll.seed
      pick = pool[roll.value].color
    }

    const applied = applyMove(state, pick)
    state = applied.state
    moves.push(pick)
    if (state.status === 'won') return { moves, seed: rng }
    if (state.status === 'lost') return { moves: null, seed: rng }
    if (countUnowned(state.board) === 0) break
  }
  return { moves: null, seed: rng }
}

export interface LevelReport {
  id: number
  name: string
  ok: boolean
  reason?: string
  moves: number
  turnLimit: number
}

/** Dev-only: replays every stored solution and reports the results. */
export function validateLevels(levels: readonly LevelDefinition[]): LevelReport[] {
  return levels.map((level) => {
    const result = replaySolution(level)
    return {
      id: level.id,
      name: level.name,
      ok: result.ok,
      reason: result.reason,
      moves: level.solution?.length ?? 0,
      turnLimit: level.turnLimit,
    }
  })
}
