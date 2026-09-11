/**
 * Chromaflow — core domain types.
 *
 * Everything in `src/game` is pure and framework-free: the React layer only
 * calls into these functions and renders whatever comes back.
 */

import type { ThemeId } from './palette.ts'

/** Index into the active palette. Levels use between 5 and 7 colors. */
export type ColorId = 0 | 1 | 2 | 3 | 4 | 5 | 6

export const ALL_COLOR_IDS: readonly ColorId[] = [0, 1, 2, 3, 4, 5, 6]

export type TileKind =
  /** Ordinary colored tile. */
  | 'normal'
  /** Absorbing it unlocks every lock sharing its group id. */
  | 'key'
  /** Unplayable until its group's key has been absorbed. */
  | 'lock'
  /** Absorbing it re-rolls the colors of the remaining ordinary tiles. */
  | 'shuffle'
  /** A hole in the board. Never playable, never counted. */
  | 'void'

export interface Tile {
  kind: TileKind
  color: ColorId
  /** Present on `key` and `lock` tiles; pairs them together. */
  group?: number
  /** `lock` tiles only — true until the matching key is absorbed. */
  locked?: boolean
  /** Whether the tile belongs to the player's flow region. */
  owned: boolean
  /** `key` / `shuffle` tiles only — their one-shot effect has already fired. */
  triggered?: boolean
}

export interface BoardState {
  width: number
  height: number
  /** Row-major, length === width * height. */
  tiles: Tile[]
  /** Colour of the whole owned region. */
  ownedColor: ColorId
  /** Key groups collected so far. */
  unlockedGroups: number[]
  /** Index of the tile the flow grows from. */
  origin: number
}

export type GameStatus = 'playing' | 'won' | 'lost'

export type LossReason =
  | 'out-of-turns'
  | 'target-exhausted'
  | 'wrong-final-color'

/** Shown above the board. A rule introduces a mechanic; a tip is only advice. */
export interface LevelHint {
  kind: 'rule' | 'tip'
  text: string
}

export interface LevelDefinition {
  id: number
  name: string
  /** Colour theme keyed to the level's name — see `palette.ts`. */
  theme: ThemeId
  width: number
  height: number
  /** Palette subset in play, e.g. `[0,1,2,3,4]`. */
  colors: ColorId[]
  targetColor: ColorId
  turnLimit: number
  /** Row strings of whitespace-separated cell tokens — see `parseBoard`. */
  rows: string[]
  /** Tile the flow grows from, as `[x, y]`. Defaults to the top-left corner. */
  origin?: [number, number]
  /** Seed for the deterministic shuffle-tile RNG. */
  seed: number
  /** Score needed for the 2nd and 3rd star. */
  starScore: [number, number]
  /** Turns that must remain for the 2nd and 3rd star. */
  starTurns: [number, number]
  hint?: LevelHint
  /** Reference solution found by the solver — used by the level validator. */
  solution?: ColorId[]
}

export interface GameState {
  level: LevelDefinition
  board: BoardState
  turnsUsed: number
  turnsLeft: number
  score: number
  /** Number of consecutive turns that absorbed at least `COMBO_MIN_CELLS`. */
  comboStreak: number
  status: GameStatus
  lossReason?: LossReason
  /** Deterministic RNG cursor, advanced by shuffle tiles. */
  rng: number
  /** True once undo has been used on this attempt (blocks the "flawless" badge). */
  usedUndo: boolean
}

export interface MoveResult {
  /** False when the move was rejected; `state` is then returned unchanged. */
  ok: boolean
  state: GameState
  /** Why the move was rejected. */
  rejected?: 'not-playing' | 'same-color' | 'color-not-in-level'
  /** Indices of tiles absorbed by this move. */
  absorbed: number[]
  /** Points added, combo multiplier already applied. */
  gained: number
  multiplier: number
  /** Key groups unlocked by this move. */
  unlocked: number[]
  /** Whether a shuffle tile fired. */
  shuffled: boolean
}
