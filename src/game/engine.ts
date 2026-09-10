import {
  absorbConnected,
  cloneBoard,
  countAvailableColor,
  countUnowned,
  parseBoard,
} from './board.ts'
import { shuffled } from './rng.ts'
import type {
  BoardState,
  ColorId,
  GameState,
  LevelDefinition,
  MoveResult,
} from './types.ts'

/** Cells that must be absorbed in one turn to extend a combo. */
export const COMBO_MIN_CELLS = 4

/** Multiplier for the 1st, 2nd, 3rd and 4th-or-later consecutive combo turn. */
export const COMBO_STEPS = [1, 1.25, 1.5, 2] as const

export const POINTS_PER_CELL = 10

export function comboMultiplier(streak: number): number {
  if (streak <= 0) return 1
  return COMBO_STEPS[Math.min(streak - 1, COMBO_STEPS.length - 1)]
}

export function createGame(level: LevelDefinition): GameState {
  const board = parseBoard(level)
  const state: GameState = {
    level,
    board,
    turnsUsed: 0,
    turnsLeft: level.turnLimit,
    score: 0,
    comboStreak: 0,
    status: 'playing',
    rng: level.seed,
    usedUndo: false,
  }
  evaluate(state)
  return state
}

function cloneState(state: GameState): GameState {
  return {
    ...state,
    board: cloneBoard(state.board),
  }
}

/**
 * Plays one turn. Resolution order is fixed and exhaustively re-run to a
 * fixpoint, so keys that connect new regions and shuffles that re-colour the
 * board always leave the invariant "no reachable tile of the owned colour sits
 * next to the flow region" intact.
 */
export function applyMove(state: GameState, color: ColorId): MoveResult {
  const reject = (rejected: MoveResult['rejected']): MoveResult => ({
    ok: false,
    state,
    rejected,
    absorbed: [],
    gained: 0,
    multiplier: comboMultiplier(state.comboStreak),
    unlocked: [],
    shuffled: false,
  })

  // 1. Validate the selected colour.
  if (state.status !== 'playing') return reject('not-playing')
  if (!state.level.colors.includes(color)) return reject('color-not-in-level')
  if (color === state.board.ownedColor) return reject('same-color')

  const next = cloneState(state)

  // 2. Recolour the owned region.
  for (const tile of next.board.tiles) if (tile.owned) tile.color = color
  next.board.ownedColor = color

  // 3–5. Absorb, resolve keys, resolve shuffles — to a fixpoint.
  const resolution = resolveEffects(next.board, color, next.rng, next.level.targetColor)
  next.rng = resolution.seed
  next.turnsUsed += 1
  next.turnsLeft -= 1

  // 6. Score and combo.
  const cells = resolution.absorbed.length
  next.comboStreak = cells >= COMBO_MIN_CELLS ? next.comboStreak + 1 : 0
  const multiplier = comboMultiplier(next.comboStreak)
  const gained = Math.round(cells * POINTS_PER_CELL * multiplier)
  next.score += gained

  // 7–9. Loss / win checks.
  evaluate(next)

  return {
    ok: true,
    state: next,
    absorbed: resolution.absorbed,
    gained,
    multiplier,
    unlocked: resolution.unlocked,
    shuffled: resolution.shuffled,
  }
}

interface Resolution {
  absorbed: number[]
  unlocked: number[]
  shuffled: boolean
  seed: number
}

function resolveEffects(
  board: BoardState,
  color: ColorId,
  seed: number,
  targetColor: ColorId,
): Resolution {
  const absorbed: number[] = []
  const unlocked: number[] = []
  let shuffledBoard = false
  let rng = seed
  let changed = true

  while (changed) {
    changed = false

    const more = absorbConnected(board, color)
    if (more.length > 0) {
      absorbed.push(...more)
      changed = true
    }

    // Keys first: unlocking only ever adds options, so it must settle before
    // a shuffle re-rolls the board.
    for (const index of absorbed) {
      const tile = board.tiles[index]
      if (tile.kind !== 'key' || tile.triggered) continue
      tile.triggered = true
      changed = true
      if (tile.group === undefined || board.unlockedGroups.includes(tile.group)) continue
      board.unlockedGroups.push(tile.group)
      unlocked.push(tile.group)
      for (const other of board.tiles) {
        if (other.kind === 'lock' && other.group === tile.group) other.locked = false
      }
    }
    if (changed) continue

    for (const index of absorbed) {
      const tile = board.tiles[index]
      if (tile.kind !== 'shuffle' || tile.triggered) continue
      tile.triggered = true
      rng = redistributeColors(board, rng, targetColor)
      shuffledBoard = true
      changed = true
    }
  }

  return { absorbed, unlocked, shuffled: shuffledBoard, seed: rng }
}

/**
 * Re-deals the colours already on the board across the remaining ordinary
 * tiles. Positions, tile kinds, key/lock pairings, the owned region and every
 * still-locked tile are left untouched; because the colour multiset is only
 * permuted, a shuffle can never be what makes the target colour run out.
 */
function redistributeColors(board: BoardState, seed: number, targetColor: ColorId): number {
  const eligible: number[] = []
  for (let i = 0; i < board.tiles.length; i++) {
    const tile = board.tiles[i]
    if (tile.kind === 'normal' && !tile.owned) eligible.push(i)
  }
  if (eligible.length === 0) return seed

  const deal = shuffled(
    eligible.map((i) => board.tiles[i].color),
    seed,
  )
  eligible.forEach((index, slot) => {
    board.tiles[index].color = deal.value[slot]
  })

  // Belt and braces: the permutation preserves colour counts, but if a future
  // variant ever re-rolls colours outright, keep one target tile alive so the
  // premature-exhaustion rule stays the player's fault, not the dice's.
  if (countAvailableColor(board, targetColor) === 0) {
    board.tiles[eligible[0]].color = targetColor
  }
  return deal.seed
}

/** Applies the win / loss rules to `state` in place. */
function evaluate(state: GameState): void {
  const { board, level } = state
  const unowned = countUnowned(board)

  if (unowned > 0 && countAvailableColor(board, level.targetColor) === 0) {
    state.status = 'lost'
    state.lossReason = 'target-exhausted'
    return
  }
  if (unowned === 0) {
    if (board.ownedColor === level.targetColor) {
      state.status = 'won'
    } else {
      state.status = 'lost'
      state.lossReason = 'wrong-final-color'
    }
    return
  }
  if (state.turnsLeft <= 0) {
    state.status = 'lost'
    state.lossReason = 'out-of-turns'
  }
}

export interface StarResult {
  stars: 1 | 2 | 3
}

/** Completion alone earns one star; score and spare turns earn the other two. */
export function computeStars(state: GameState): 1 | 2 | 3 {
  if (state.status !== 'won') return 1
  const { starScore, starTurns } = state.level
  let stars = 1
  if (state.score >= starScore[0] && state.turnsLeft >= starTurns[0]) stars = 2
  if (state.score >= starScore[1] && state.turnsLeft >= starTurns[1]) stars = 3
  return stars as 1 | 2 | 3
}

export const LOSS_MESSAGES: Record<NonNullable<GameState['lossReason']>, string> = {
  'out-of-turns': 'You ran out of turns before the board was fully absorbed.',
  'target-exhausted':
    'The last unclaimed tiles of the target colour were absorbed too early. Keep at least one target tile on the board until the very last move.',
  'wrong-final-color': 'The board is full, but your flow ended on the wrong colour.',
}
