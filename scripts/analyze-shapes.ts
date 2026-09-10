/**
 * Dev-only shape study:  npm run levels:shapes
 *
 * Does a shape need a big board to be worth using? A mask that carves out a
 * ring, a neck or a comb removes tiles *and* narrows what is left, so on a
 * small grid the survivors can be too thin to give the flow any choice. This
 * builds each shape at several sizes with a neutral layout and reports how the
 * resulting boards actually play.
 */
import { findSolution, profileSolution } from '../src/game/solver.ts'
import { buildTokens, isConnected, makeGrid, shapeMask } from './generate-levels.ts'
import type { LevelSpec, Shape } from './generate-levels.ts'
import type { ColorId, LevelDefinition } from '../src/game/types.ts'

const SHAPES: Shape[] = [
  'full',
  'serpentine',
  'atoll',
  'cross',
  'hourglass',
  'frame',
  'pillars',
  'teeth',
]
const SIZES = [8, 9, 10, 11, 12]
const SEEDS = [101, 4409, 90121]
const COLORS: ColorId[] = [0, 1, 2, 3, 4]

interface Row {
  shape: Shape
  size: number
  density: number
  playable: number
  moves: number
  forced: number
  grind: number
  medianOptions: number
}

function trial(shape: Shape, size: number, seed: number): Row | null {
  const spec: LevelSpec = {
    name: shape,
    width: size,
    height: size,
    colors: COLORS,
    target: 2,
    layout: 'blobs',
    shape,
    seed,
    slack: 3,
    moves: [1, 999],
  }
  const built = makeGrid(spec, seed)
  if (!isConnected(built.grid)) return null
  if (built.grid.colors.filter((c) => c === spec.target).length < 5) return null

  const level: LevelDefinition = {
    id: 0,
    name: shape,
    width: size,
    height: size,
    colors: COLORS,
    targetColor: 2,
    turnLimit: size * size,
    rows: buildTokens(spec, built.grid, built.seed).rows,
    seed,
    starScore: [0, 0],
    starTurns: [0, 0],
  }
  const solution = findSolution(level, { attempts: 150, seed })
  if (!solution) return null

  const p = profileSolution(level, solution)
  const sorted = p.options.slice().sort((a, b) => a - b)
  const playable = shapeMask(shape, size, size).filter(Boolean).length
  return {
    shape,
    size,
    playable,
    density: playable / (size * size),
    moves: solution.length,
    forced: p.forced,
    grind: p.grind,
    medianOptions: sorted[Math.floor(sorted.length / 2)] ?? 0,
  }
}

const median = (xs: number[]) => xs.slice().sort((a, b) => a - b)[Math.floor(xs.length / 2)]

console.log('shape        size  playable  density  moves  forced  grind  grind%  medOpts')
for (const shape of SHAPES) {
  for (const size of SIZES) {
    const runs = SEEDS.map((s) => trial(shape, size, s)).filter((r): r is Row => r !== null)
    if (runs.length === 0) {
      console.log(`${shape.padEnd(12)} ${String(size).padStart(4)}  (no usable board)`)
      continue
    }
    const moves = median(runs.map((r) => r.moves))
    const grind = median(runs.map((r) => r.grind))
    const pct = Math.round((grind / moves) * 100)
    console.log(
      `${shape.padEnd(12)} ${String(size).padStart(4)}  ` +
        `${String(runs[0].playable).padStart(8)}  ` +
        `${(runs[0].density * 100).toFixed(0).padStart(6)}%  ` +
        `${String(moves).padStart(5)}  ` +
        `${String(median(runs.map((r) => r.forced))).padStart(6)}  ` +
        `${String(grind).padStart(5)}  ` +
        `${String(pct).padStart(5)}%  ` +
        `${String(median(runs.map((r) => r.medianOptions))).padStart(7)}`,
    )
  }
  console.log('')
}
console.log('density = share of the bounding box that is playable')
console.log('grind%  = share of moves absorbing two tiles or fewer')
console.log('medOpts = median number of colours worth considering per move')
