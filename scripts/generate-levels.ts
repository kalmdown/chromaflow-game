/**
 * Offline level-catalogue builder (development only — not part of the app).
 *
 *   npm run levels:build
 *
 * Each entry below describes a hand-tuned level *shape*: board size, palette,
 * layout family, special-tile placement and a difficulty budget. The script
 * lays out the board deterministically, searches for a real solution with the
 * engine itself, tightens the turn limit around that solution and writes
 * `src/game/levels.ts`. Nothing is emitted unless a solution was found, so the
 * shipped catalogue cannot contain an unwinnable board.
 */
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { findSolution } from '../src/game/solver.ts'
import { nextInt, nextRandom } from '../src/game/rng.ts'
import type { ColorId, LevelDefinition } from '../src/game/types.ts'

type Layout = 'blobs' | 'bands' | 'rings' | 'patchwork' | 'weave'
type Shape = 'full' | 'diamond' | 'cross' | 'frame' | 'notch' | 'hourglass'

interface SpecialPlan {
  /** Number of key/lock groups; each group gets one key and a lock cluster. */
  lockGroups?: number
  lockClusterSize?: number
  shuffles?: number
}

interface LevelSpec {
  name: string
  width: number
  height: number
  colors: ColorId[]
  target: ColorId
  layout: Layout
  shape: Shape
  seed: number
  /** Extra turns granted on top of the discovered solution. */
  slack: number
  /** Acceptable reference-solution length; the seed is re-rolled to hit it. */
  moves: [number, number]
  specials?: SpecialPlan
  hint?: string
}

const FIVE: ColorId[] = [0, 1, 2, 3, 4]
const SIX: ColorId[] = [0, 1, 2, 3, 4, 5]
const SEVEN: ColorId[] = [0, 1, 2, 3, 4, 5, 6]

const SPECS: LevelSpec[] = [
  // 1-3 - basic flood-fill, forgiving.
  {
    name: 'First Ripple', width: 8, height: 8, colors: FIVE, target: 2,
    layout: 'blobs', shape: 'full', seed: 1041, slack: 5, moves: [6, 10],
    hint: 'Pick a colour. Your region takes it and swallows every touching tile of that colour.',
  },
  {
    name: 'Open Water', width: 8, height: 8, colors: FIVE, target: 4,
    layout: 'blobs', shape: 'full', seed: 2207, slack: 5, moves: [7, 11],
    hint: 'Big absorptions are worth more. Four tiles or more in one turn starts a combo.',
  },
  {
    name: 'Slow Tide', width: 8, height: 8, colors: FIVE, target: 0,
    layout: 'bands', shape: 'full', seed: 3313, slack: 4, moves: [7, 12],
    hint: 'Bands fall fastest when you work along them instead of across them.',
  },

  // 4-6 - the final-colour rule, taught explicitly.
  {
    name: 'Save the Last Drop', width: 8, height: 8, colors: FIVE, target: 3,
    layout: 'blobs', shape: 'full', seed: 4127, slack: 4, moves: [7, 12],
    hint: 'New rule: your flow must FINISH on the target colour, so keep target tiles on the board until the end.',
  },
  {
    name: 'Held Back', width: 9, height: 9, colors: FIVE, target: 1,
    layout: 'patchwork', shape: 'full', seed: 5231, slack: 4, moves: [8, 13],
    hint: 'If you absorb the very last unclaimed target tiles while others remain, the level is lost.',
  },
  {
    name: 'Reserve', width: 9, height: 9, colors: FIVE, target: 4,
    layout: 'rings', shape: 'full', seed: 6421, slack: 3, moves: [8, 14],
    hint: 'Count the target tiles before you commit. One of them has to survive to the final move.',
  },

  // 7-10 - tighter budgets, shaped boards.
  {
    name: 'Narrow Channel', width: 9, height: 9, colors: SIX, target: 5,
    layout: 'blobs', shape: 'notch', seed: 7013, slack: 3, moves: [9, 15],
  },
  {
    name: 'Cut Diamond', width: 9, height: 9, colors: SIX, target: 2,
    layout: 'rings', shape: 'diamond', seed: 8117, slack: 3, moves: [8, 15],
  },
  {
    name: 'Crossflow', width: 10, height: 10, colors: SIX, target: 0,
    layout: 'weave', shape: 'cross', seed: 9227, slack: 3, moves: [9, 16],
  },
  {
    name: 'Hourglass', width: 10, height: 10, colors: SIX, target: 3,
    layout: 'blobs', shape: 'hourglass', seed: 10333, slack: 3, moves: [10, 16],
  },

  // 11-14 - keys and locks.
  {
    name: 'Iron Gate', width: 9, height: 9, colors: FIVE, target: 2,
    layout: 'blobs', shape: 'full', seed: 11071, slack: 4, moves: [8, 15],
    specials: { lockGroups: 1, lockClusterSize: 5 },
    hint: 'Grey tiles are locked. Absorb the matching key tile to open them.',
  },
  {
    name: 'Two Keys', width: 10, height: 10, colors: FIVE, target: 1,
    layout: 'patchwork', shape: 'full', seed: 12157, slack: 3, moves: [10, 17],
    specials: { lockGroups: 2, lockClusterSize: 4 },
    hint: 'Each key opens only its own group. The number on the lock tells you which.',
  },
  {
    name: 'Vault Ring', width: 10, height: 10, colors: SIX, target: 4,
    layout: 'rings', shape: 'frame', seed: 13217, slack: 3, moves: [10, 18],
    specials: { lockGroups: 2, lockClusterSize: 5 },
  },
  {
    name: 'Deadbolt', width: 10, height: 10, colors: SIX, target: 5,
    layout: 'weave', shape: 'notch', seed: 14251, slack: 2, moves: [10, 18],
    specials: { lockGroups: 2, lockClusterSize: 6 },
  },

  // 15-18 - shuffles, then everything at once.
  {
    name: 'Static', width: 10, height: 10, colors: SIX, target: 0,
    layout: 'blobs', shape: 'full', seed: 15277, slack: 4, moves: [10, 17],
    specials: { shuffles: 1 },
    hint: 'A shuffle tile re-deals every unclaimed ordinary tile the moment you absorb it.',
  },
  {
    name: 'Interference', width: 10, height: 10, colors: SIX, target: 3,
    layout: 'bands', shape: 'diamond', seed: 16333, slack: 3, moves: [10, 18],
    specials: { shuffles: 2 },
  },
  {
    name: 'Locked Static', width: 11, height: 11, colors: SIX, target: 1,
    layout: 'patchwork', shape: 'cross', seed: 17389, slack: 3, moves: [11, 19],
    specials: { lockGroups: 1, lockClusterSize: 5, shuffles: 1 },
  },
  {
    name: 'Chromaflow', width: 11, height: 11, colors: SEVEN, target: 6,
    layout: 'weave', shape: 'full', seed: 18397, slack: 2, moves: [12, 20],
    specials: { lockGroups: 2, lockClusterSize: 5, shuffles: 2 },
    hint: 'Keys, locks and shuffles together. Finish on Sand - and keep one Sand tile in reserve.',
  },
]

// ---------------------------------------------------------------- layout ---

interface Grid {
  width: number
  height: number
  colors: (ColorId | null)[]
}

const STEPS: [number, number][] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
]

function makeGrid(spec: LevelSpec, seed: number): { grid: Grid; seed: number } {
  const { width, height } = spec
  const colors: (ColorId | null)[] = new Array(width * height).fill(null)
  let s = seed

  const mask = shapeMask(spec.shape, width, height)
  const put = (i: number, c: ColorId) => {
    if (mask[i]) colors[i] = c
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x
      if (!mask[i]) continue
      const roll = nextRandom(s)
      s = roll.seed
      const pal = spec.colors
      const random = () => {
        const pick = nextInt(s, pal.length)
        s = pick.seed
        return pal[pick.value]
      }

      switch (spec.layout) {
        case 'blobs': {
          // Copy an already-placed orthogonal neighbour most of the time so the
          // board grows in readable clumps rather than confetti.
          const prev: ColorId[] = []
          if (x > 0 && colors[i - 1] !== null) prev.push(colors[i - 1] as ColorId)
          if (y > 0 && colors[i - width] !== null) prev.push(colors[i - width] as ColorId)
          if (prev.length > 0 && roll.value < 0.55) {
            const pick = nextInt(s, prev.length)
            s = pick.seed
            put(i, prev[pick.value])
          } else {
            put(i, random())
          }
          break
        }
        case 'bands': {
          put(i, roll.value < 0.25 ? random() : pal[(x + y) % pal.length])
          break
        }
        case 'rings': {
          const cx = (width - 1) / 2
          const cy = (height - 1) / 2
          const d = Math.round(Math.max(Math.abs(x - cx), Math.abs(y - cy)))
          put(i, roll.value < 0.3 ? random() : pal[d % pal.length])
          break
        }
        case 'patchwork': {
          const block = ((x / 2) | 0) + ((y / 2) | 0) * 3
          put(i, roll.value < 0.3 ? random() : pal[block % pal.length])
          break
        }
        case 'weave': {
          put(i, roll.value < 0.35 ? random() : pal[(x * 2 + y * 3) % pal.length])
          break
        }
      }
    }
  }
  return { grid: { width, height, colors }, seed: s }
}

function shapeMask(shape: Shape, width: number, height: number): boolean[] {
  const mask: boolean[] = new Array(width * height).fill(true)
  const set = (x: number, y: number, v: boolean) => {
    if (x >= 0 && y >= 0 && x < width && y < height) mask[y * width + x] = v
  }
  const cx = (width - 1) / 2
  const cy = (height - 1) / 2

  switch (shape) {
    case 'full':
      break
    case 'diamond': {
      const r = Math.floor((width + height) / 4) + 1
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          if (Math.abs(x - cx) + Math.abs(y - cy) > r) set(x, y, false)
        }
      }
      break
    }
    case 'cross': {
      const arm = Math.floor(width / 4)
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const nearLeft = x < arm
          const nearRight = x >= width - arm
          const nearTop = y < arm
          const nearBottom = y >= height - arm
          if ((nearLeft || nearRight) && (nearTop || nearBottom)) set(x, y, false)
        }
      }
      break
    }
    case 'frame': {
      const inset = 3
      for (let y = inset; y < height - inset; y++) {
        for (let x = inset; x < width - inset; x++) set(x, y, false)
      }
      break
    }
    case 'notch': {
      const n = Math.floor(width / 3)
      for (let y = height - n; y < height; y++) {
        for (let x = width - n; x < width; x++) set(x, y, false)
      }
      break
    }
    case 'hourglass': {
      const mid = Math.floor(height / 2)
      for (let y = 0; y < height; y++) {
        const pinch = Math.max(0, 2 - Math.abs(y - mid))
        for (let k = 0; k < pinch; k++) {
          set(k, y, false)
          set(width - 1 - k, y, false)
        }
      }
      break
    }
  }
  carveInlet(mask, width, height)
  return mask
}

/**
 * (0,0) must always be playable. Symmetric shapes bite off all four corners,
 * so when the origin lands in a bite we open a one-tile inlet along the top row
 * (or left column) until it meets the body — which reads as a deliberate
 * channel rather than a stray floating tile.
 */
function carveInlet(mask: boolean[], width: number, height: number): void {
  if (mask[0]) return
  let x = 0
  while (x < width && !mask[x]) x++
  let y = 0
  while (y < height && !mask[y * width]) y++

  if (x < width && (y >= height || x <= y)) {
    for (let k = 0; k <= x; k++) mask[k] = true
  } else if (y < height) {
    for (let k = 0; k <= y; k++) mask[k * width] = true
  } else {
    mask[0] = true
  }
}

// -------------------------------------------------------------- specials ---

function buildTokens(spec: LevelSpec, grid: Grid, seed: number): { rows: string[]; seed: number } {
  const { width, height } = grid
  const tokens: string[] = grid.colors.map((c) => (c === null ? '.' : String(c)))
  let s = seed
  const plan = spec.specials ?? {}
  const taken = new Set<number>()
  const free = (i: number) => grid.colors[i] !== null && !taken.has(i) && i !== 0

  // Lock clusters sit away from the origin; their key sits on the near side so
  // it is always reachable without passing through the locks.
  for (let g = 1; g <= (plan.lockGroups ?? 0); g++) {
    const farLine = Math.floor((width + height) * 0.55)
    const anchorPool: number[] = []
    for (let i = 0; i < tokens.length; i++) {
      const x = i % width
      const y = (i / width) | 0
      if (free(i) && x + y >= farLine) anchorPool.push(i)
    }
    if (anchorPool.length === 0) continue
    const pick = nextInt(s, anchorPool.length)
    s = pick.seed

    // Grow a small blob of locks out from the anchor.
    const cluster: number[] = []
    const queue = [anchorPool[pick.value]]
    while (queue.length > 0 && cluster.length < (plan.lockClusterSize ?? 4)) {
      const i = queue.shift() as number
      if (!free(i)) continue
      taken.add(i)
      cluster.push(i)
      const x = i % width
      const y = (i / width) | 0
      for (const [dx, dy] of STEPS) {
        const nx = x + dx
        const ny = y + dy
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue
        queue.push(ny * width + nx)
      }
    }
    for (const i of cluster) tokens[i] = `L${grid.colors[i]}:${g}`

    const nearLine = Math.floor((width + height) * 0.5)
    const keyPool: number[] = []
    for (let i = 0; i < tokens.length; i++) {
      const x = i % width
      const y = (i / width) | 0
      if (free(i) && x + y > 1 && x + y < nearLine) keyPool.push(i)
    }
    if (keyPool.length === 0) continue
    const kp = nextInt(s, keyPool.length)
    s = kp.seed
    const keyIndex = keyPool[kp.value]
    tokens[keyIndex] = `K${grid.colors[keyIndex]}:${g}`
    taken.add(keyIndex)
  }

  for (let n = 0; n < (plan.shuffles ?? 0); n++) {
    const pool: number[] = []
    for (let i = 0; i < tokens.length; i++) {
      const x = i % width
      const y = (i / width) | 0
      if (free(i) && x + y > 2) pool.push(i)
    }
    if (pool.length === 0) break
    const pick = nextInt(s, pool.length)
    s = pick.seed
    const i = pool[pick.value]
    tokens[i] = `S${grid.colors[i]}`
    taken.add(i)
  }

  const rows: string[] = []
  for (let y = 0; y < height; y++) {
    rows.push(tokens.slice(y * width, y * width + width).join(' '))
  }
  return { rows, seed: s }
}

// ---------------------------------------------------------------- checks ---

/** Every playable tile must be reachable from (0,0), ignoring colours. */
function isConnected(grid: Grid): boolean {
  const { width, height, colors } = grid
  const seen = new Uint8Array(colors.length)
  const stack = [0]
  seen[0] = 1
  let count = 1
  while (stack.length > 0) {
    const i = stack.pop() as number
    const x = i % width
    const y = (i / width) | 0
    for (const [dx, dy] of STEPS) {
      const nx = x + dx
      const ny = y + dy
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue
      const n = ny * width + nx
      if (seen[n] || colors[n] === null) continue
      seen[n] = 1
      count++
      stack.push(n)
    }
  }
  return count === colors.filter((c) => c !== null).length
}

function playableCount(rows: string[]): number {
  return rows.join(' ').split(/\s+/).filter((t) => t !== '.').length
}

// ----------------------------------------------------------------- build ---

function buildLevel(spec: LevelSpec, id: number): LevelDefinition {
  const seedBudget = 160
  let fallback: LevelDefinition | null = null

  for (let attempt = 0; attempt < seedBudget; attempt++) {
    const seed = spec.seed + attempt * 977
    const built = makeGrid(spec, seed)
    if (!isConnected(built.grid)) continue

    // The target colour must exist in quantity, or the level is dead on
    // arrival the moment the player touches it.
    const targetCells = built.grid.colors.filter((c) => c === spec.target).length
    if (targetCells < 5) continue

    const tokenised = buildTokens(spec, built.grid, built.seed)
    const draft: LevelDefinition = {
      id,
      name: spec.name,
      width: spec.width,
      height: spec.height,
      colors: spec.colors,
      targetColor: spec.target,
      turnLimit: spec.width * spec.height,
      rows: tokenised.rows,
      seed: (seed * 31 + 7) >>> 0,
      starScore: [0, 0],
      starTurns: [0, 0],
      hint: spec.hint,
    }

    const solution = findSolution(draft, { attempts: 400, seed: draft.seed })
    if (!solution) continue

    const level = finalise(draft, spec, solution)
    const [lo, hi] = spec.moves
    if (solution.length >= lo && solution.length <= hi) return level
    if (!fallback) fallback = level
  }

  if (fallback) {
    console.warn(`level ${id} (${spec.name}): fell back to a board outside the target move range`)
    return fallback
  }
  throw new Error(`level ${id} (${spec.name}): no solvable board found`)
}

function finalise(draft: LevelDefinition, spec: LevelSpec, solution: ColorId[]): LevelDefinition {
  const base = playableCount(draft.rows) * 10
  return {
    ...draft,
    turnLimit: solution.length + spec.slack,
    starScore: [Math.round(base * 1.05), Math.round(base * 1.3)],
    starTurns: [spec.slack >= 2 ? 1 : 0, Math.max(1, spec.slack - 1)],
    solution,
  }
}

// ------------------------------------------------------------------ emit ---

function emit(levels: LevelDefinition[]): string {
  const body = levels
    .map((level) => {
      const rows = level.rows.map((r) => `      '${r}',`).join('\n')
      const hint = level.hint ? `\n    hint: ${JSON.stringify(level.hint)},` : ''
      return [
        '  {',
        `    id: ${level.id},`,
        `    name: ${JSON.stringify(level.name)},`,
        `    width: ${level.width},`,
        `    height: ${level.height},`,
        `    colors: [${level.colors.join(', ')}],`,
        `    targetColor: ${level.targetColor},`,
        `    turnLimit: ${level.turnLimit},`,
        `    seed: ${level.seed},`,
        `    starScore: [${level.starScore.join(', ')}],`,
        `    starTurns: [${level.starTurns.join(', ')}],${hint}`,
        '    rows: [',
        rows,
        '    ],',
        `    solution: [${(level.solution ?? []).join(', ')}],`,
        '  },',
      ].join('\n')
    })
    .join('\n')

  return `/**
 * Chromaflow level catalogue - GENERATED FILE.
 *
 * Produced by \`npm run levels:build\` (scripts/generate-levels.ts). Every level
 * ships with a reference \`solution\` that the engine test-suite replays, so the
 * catalogue is verified solvable on every test run. Prefer editing the specs in
 * the generator over hand-editing this file.
 */
import type { LevelDefinition } from './types.ts'

export const LEVELS: readonly LevelDefinition[] = [
${body}
]

export const TOTAL_LEVELS = LEVELS.length

export function getLevel(id: number): LevelDefinition | undefined {
  return LEVELS.find((level) => level.id === id)
}
`
}

const here = dirname(fileURLToPath(import.meta.url))
const levels = SPECS.map((spec, index) => {
  const level = buildLevel(spec, index + 1)
  console.log(
    `level ${String(level.id).padStart(2)}  ${level.name.padEnd(20)} ` +
      `${level.width}x${level.height}  solution=${level.solution?.length}  limit=${level.turnLimit}`,
  )
  return level
})
writeFileSync(resolve(here, '../src/game/levels.ts'), emit(levels), 'utf8')
console.log(`\nwrote ${levels.length} levels to src/game/levels.ts`)
