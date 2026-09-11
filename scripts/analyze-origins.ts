/**
 * Dev-only origin study:  npm run levels:origins
 *
 * What happens to a level if the flow starts somewhere other than where its
 * shape puts it? Every spec is built once from its base seed (not the re-rolled
 * attempt that shipped), so the board is held fixed and only the origin moves.
 * Each candidate origin is then tokenised, solved and profiled exactly as the
 * generator would, and compared against the shape's own choice.
 *
 * Origin classes:
 *   shape    the tile the generator drew from the rim
 *   rim      a tile of maximum eccentricity - as far from everything as it gets
 *   centre   a tile of minimum eccentricity - the board's hub
 *   random   seeded uniform picks over every playable tile
 *
 * A '-' row means the solver found nothing for that board and origin.
 */
import { findSolution, profileSolution } from '../src/game/solver.ts'
import { nextInt } from '../src/game/rng.ts'
import { bfsDistances, buildTokens, isEngaging, makeGrid, SPECS } from './generate-levels.ts'
import type { LevelSpec } from './generate-levels.ts'
import type { LevelDefinition } from '../src/game/types.ts'

const RANDOM_PICKS = 6
const ATTEMPTS = 200

type Origin = [number, number]

interface Trial {
  moves: number
  forced: number
  grind: number
  opening: number
  engaging: boolean
  inRange: boolean
  specialsPlaced: boolean
  eccentricity: number
}

function trial(spec: LevelSpec, origin: Origin, eccentricity: number): Trial | null {
  const built = makeGrid(spec, spec.seed)
  built.grid.origin = origin
  const tokenised = buildTokens(spec, built.grid, built.seed)

  const plan = spec.specials ?? {}
  const tokens = tokenised.rows.join(' ').split(/\s+/)
  const wantLocks = (plan.lockGroups ?? 0) * (plan.lockClusterSize ?? 4)
  const wantKeys = plan.lockGroups ?? 0
  const wantShuffles = plan.shuffles ?? 0
  const specialsPlaced =
    tokens.filter((t) => t.startsWith('L')).length >= wantLocks &&
    tokens.filter((t) => t.startsWith('K')).length >= wantKeys &&
    tokens.filter((t) => t.startsWith('S')).length >= wantShuffles

  const level: LevelDefinition = {
    id: 0,
    name: spec.name,
    theme: spec.theme,
    width: spec.width,
    height: spec.height,
    colors: spec.colors,
    targetColor: spec.target,
    turnLimit: spec.width * spec.height,
    rows: tokenised.rows,
    origin,
    seed: (spec.seed * 31 + 7) >>> 0,
    starScore: [0, 0],
    starTurns: [0, 0],
  }
  const solution = findSolution(level, { attempts: ATTEMPTS, seed: level.seed })
  if (!solution) return null
  const p = profileSolution(level, solution)
  const moves = solution.length
  return {
    moves,
    forced: p.forced,
    grind: p.grind,
    opening: p.absorbed[0],
    engaging: isEngaging(level, solution),
    inRange: moves >= spec.moves[0] && moves <= spec.moves[1],
    specialsPlaced,
    eccentricity,
  }
}

const median = (xs: number[]) => xs.slice().sort((a, b) => a - b)[Math.floor(xs.length / 2)] ?? 0
const pct = (xs: boolean[]) => `${Math.round((100 * xs.filter(Boolean).length) / Math.max(1, xs.length))}%`

const byClass: Record<string, Trial[]> = { shape: [], rim: [], centre: [], random: [] }
const deltas: Record<string, number[]> = { rim: [], centre: [], random: [] }

console.log('level                shape          rim            centre         random (median of 6)')
console.log('                     mv fc gr ecc   mv fc gr ecc   mv fc gr ecc   mv fc gr ecc  engaging  inRange')

SPECS.forEach((spec, index) => {
  const { width, height } = spec
  const grid = makeGrid(spec, spec.seed).grid
  const playable = grid.colors.map((c) => c !== null)
  const tiles: number[] = []
  playable.forEach((p, i) => p && tiles.push(i))

  const ecc = new Map<number, number>()
  for (const i of tiles) {
    const d = bfsDistances(width, height, playable, i)
    ecc.set(i, Math.max(...tiles.map((t) => d[t])))
  }
  const maxEcc = Math.max(...ecc.values())
  const minEcc = Math.min(...ecc.values())
  const at = (i: number): Origin => [i % width, (i / width) | 0]

  const shippedIndex = grid.origin[1] * width + grid.origin[0]
  const rimIndex = tiles.find((i) => ecc.get(i) === maxEcc) as number
  const centreIndex = tiles.find((i) => ecc.get(i) === minEcc) as number

  const shipped = trial(spec, at(shippedIndex), ecc.get(shippedIndex) as number)
  const rim = trial(spec, at(rimIndex), maxEcc)
  const centre = trial(spec, at(centreIndex), minEcc)

  const randoms: Trial[] = []
  let s = spec.seed ^ 0x5eed
  for (let k = 0; k < RANDOM_PICKS; k++) {
    const pick = nextInt(s, tiles.length)
    s = pick.seed
    const i = tiles[pick.value]
    const t = trial(spec, at(i), ecc.get(i) as number)
    if (t) randoms.push(t)
  }

  const cell = (t: Trial | null) =>
    t ? `${String(t.moves).padStart(2)} ${String(t.forced).padStart(2)} ${String(t.grind).padStart(2)} ${String(t.eccentricity).padStart(3)}` : ' -  -  -   -'
  const randomCell = randoms.length
    ? `${String(median(randoms.map((t) => t.moves))).padStart(2)} ${String(median(randoms.map((t) => t.forced))).padStart(2)} ${String(median(randoms.map((t) => t.grind))).padStart(2)} ${String(median(randoms.map((t) => t.eccentricity))).padStart(3)}`
    : ' -  -  -   -'

  console.log(
    `${String(index + 1).padStart(2)} ${spec.name.padEnd(17)} ${cell(shipped)}   ${cell(rim)}   ${cell(centre)}   ${randomCell}  ${pct(randoms.map((t) => t.engaging)).padStart(8)}  ${pct(randoms.map((t) => t.inRange)).padStart(7)}`,
  )

  if (shipped) byClass.shape.push(shipped)
  if (rim) byClass.rim.push(rim)
  if (centre) byClass.centre.push(centre)
  byClass.random.push(...randoms)
  if (shipped) {
    if (rim) deltas.rim.push(rim.moves - shipped.moves)
    if (centre) deltas.centre.push(centre.moves - shipped.moves)
    for (const t of randoms) deltas.random.push(t.moves - shipped.moves)
  }
})

console.log('\nclass     n   medMoves  medΔmoves  medForced  engaging  inRange  specialsOK')
for (const [name, trials] of Object.entries(byClass)) {
  console.log(
    `${name.padEnd(8)} ${String(trials.length).padStart(3)}   ${String(median(trials.map((t) => t.moves))).padStart(6)}   ${String(name === 'shape' ? 0 : median(deltas[name])).padStart(7)}   ${String(median(trials.map((t) => t.forced))).padStart(6)}    ${pct(trials.map((t) => t.engaging)).padStart(6)}   ${pct(trials.map((t) => t.inRange)).padStart(6)}   ${pct(trials.map((t) => t.specialsPlaced)).padStart(6)}`,
  )
}
