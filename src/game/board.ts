import type { BoardState, ColorId, LevelDefinition, Tile } from './types.ts'

/**
 * Level rows are whitespace-separated cell tokens:
 *
 * - `0`–`6`          ordinary tile of that colour
 * - `.`              void (a hole in the board — never playable)
 * - `K<color>:<grp>` key tile
 * - `L<color>:<grp>` lock tile (starts locked)
 * - `S<color>`       shuffle tile
 */
export function parseBoard(level: LevelDefinition): BoardState {
  const tiles: Tile[] = []
  if (level.rows.length !== level.height) {
    throw new Error(`Level ${level.id}: expected ${level.height} rows, got ${level.rows.length}`)
  }
  for (const row of level.rows) {
    const cells = row.trim().split(/\s+/)
    if (cells.length !== level.width) {
      throw new Error(`Level ${level.id}: expected ${level.width} cells, got "${row}"`)
    }
    for (const cell of cells) tiles.push(parseCell(cell, level))
  }
  const board: BoardState = {
    width: level.width,
    height: level.height,
    tiles,
    ownedColor: tiles[0].color,
    unlockedGroups: [],
  }
  if (tiles[0].kind === 'void' || tiles[0].kind === 'lock') {
    throw new Error(`Level ${level.id}: the origin tile (0,0) must be playable`)
  }
  claimOrigin(board)
  return board
}

function parseCell(cell: string, level: LevelDefinition): Tile {
  if (cell === '.') return { kind: 'void', color: 0, owned: false }

  const special = /^([KLS])(\d)(?::(\d+))?$/.exec(cell)
  if (special) {
    const [, mark, rawColor, rawGroup] = special
    const color = toColor(rawColor, level)
    if (mark === 'S') return { kind: 'shuffle', color, owned: false }
    if (rawGroup === undefined) {
      throw new Error(`Level ${level.id}: "${cell}" needs a group id, e.g. K3:1`)
    }
    const group = Number(rawGroup)
    return mark === 'K'
      ? { kind: 'key', color, owned: false, group }
      : { kind: 'lock', color, owned: false, group, locked: true }
  }

  if (/^\d$/.test(cell)) return { kind: 'normal', color: toColor(cell, level), owned: false }
  throw new Error(`Level ${level.id}: unrecognised cell token "${cell}"`)
}

function toColor(raw: string, level: LevelDefinition): ColorId {
  const value = Number(raw) as ColorId
  if (!level.colors.includes(value)) {
    throw new Error(`Level ${level.id}: colour ${value} is not in this level's palette`)
  }
  return value
}

/** Seeds the flow region from (0,0) and absorbs its same-coloured neighbours. */
function claimOrigin(board: BoardState): void {
  board.tiles[0].owned = true
  absorbConnected(board, board.ownedColor)
}

export function cloneBoard(board: BoardState): BoardState {
  return {
    width: board.width,
    height: board.height,
    tiles: board.tiles.map((t) => ({ ...t })),
    ownedColor: board.ownedColor,
    unlockedGroups: board.unlockedGroups.slice(),
  }
}

/** Orthogonal neighbours only — diagonals never connect. */
export function neighbors(board: BoardState, index: number): number[] {
  const { width, height } = board
  const x = index % width
  const y = (index / width) | 0
  const out: number[] = []
  if (y > 0) out.push(index - width)
  if (y < height - 1) out.push(index + width)
  if (x > 0) out.push(index - 1)
  if (x < width - 1) out.push(index + 1)
  return out
}

/** A tile counts toward completion unless it is a hole in the board. */
export function isPlayable(tile: Tile): boolean {
  return tile.kind !== 'void'
}

/** Locked locks and voids can never be absorbed. */
export function isAbsorbable(tile: Tile): boolean {
  if (tile.kind === 'void') return false
  if (tile.kind === 'lock' && tile.locked) return false
  return true
}

/**
 * Grows the owned region by every absorbable tile of `color` that is connected
 * to it. Returns the indices of the tiles that were newly absorbed.
 */
export function absorbConnected(board: BoardState, color: ColorId): number[] {
  const absorbed: number[] = []
  const queue: number[] = []
  for (let i = 0; i < board.tiles.length; i++) {
    if (board.tiles[i].owned) queue.push(i)
  }
  const seen = new Uint8Array(board.tiles.length)
  for (const i of queue) seen[i] = 1

  while (queue.length > 0) {
    const index = queue.pop() as number
    for (const n of neighbors(board, index)) {
      if (seen[n]) continue
      const tile = board.tiles[n]
      if (!isAbsorbable(tile) || tile.color !== color) continue
      seen[n] = 1
      tile.owned = true
      absorbed.push(n)
      queue.push(n)
    }
  }
  return absorbed
}

export function countUnowned(board: BoardState): number {
  let n = 0
  for (const tile of board.tiles) if (isPlayable(tile) && !tile.owned) n++
  return n
}

/**
 * Unowned tiles of `color` that the player can still reach some day. Locked
 * locks do not count while they remain locked.
 */
export function countAvailableColor(board: BoardState, color: ColorId): number {
  let n = 0
  for (const tile of board.tiles) {
    if (tile.owned || !isAbsorbable(tile)) continue
    if (tile.color === color) n++
  }
  return n
}

/** Colours that still exist among the reachable unowned tiles. */
export function remainingColors(board: BoardState): ColorId[] {
  const seen = new Set<ColorId>()
  for (const tile of board.tiles) {
    if (!tile.owned && isAbsorbable(tile)) seen.add(tile.color)
  }
  return [...seen].sort((a, b) => a - b)
}

/** Stable identity of a board position — used by the solver's memo table. */
export function boardKey(board: BoardState): string {
  let owned = ''
  let colors = ''
  for (const tile of board.tiles) {
    owned += tile.owned ? '1' : '0'
    colors += tile.kind === 'void' ? '.' : String(tile.color)
  }
  return `${board.ownedColor}|${board.unlockedGroups.join(',')}|${owned}|${colors}`
}
