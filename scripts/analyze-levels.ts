/**
 * Dev-only difficulty profiler:  npm run levels:analyze
 *
 * Replays each level's reference solution and, at every position, asks how many
 * colours were actually worth considering. A move with one real option is a
 * forced click — the player is just paying a turn to walk down a corridor — and
 * a move that absorbs one or two tiles is a grind. Both are cheap to add by
 * accident when a board shape has a narrow entrance, so they are worth watching.
 */
import { LEVELS } from '../src/game/levels.ts'
import { applyMove, createGame } from '../src/game/engine.ts'
import type { GameState, LevelDefinition } from '../src/game/types.ts'

/** Colours that are legal, do not lose on the spot, and absorb something. */
function liveOptions(state: GameState): number {
  let count = 0
  for (const color of state.level.colors) {
    if (color === state.board.ownedColor) continue
    const result = applyMove(state, color)
    if (!result.ok) continue
    if (result.state.status === 'lost') continue
    if (result.absorbed.length === 0) continue
    count++
  }
  return count
}

interface Profile {
  level: LevelDefinition
  options: number[]
  absorbed: number[]
}

function profile(level: LevelDefinition): Profile {
  let state = createGame(level)
  const options: number[] = []
  const absorbed: number[] = []
  for (const color of level.solution ?? []) {
    options.push(liveOptions(state))
    const result = applyMove(state, color)
    absorbed.push(result.absorbed.length)
    state = result.state
  }
  return { level, options, absorbed }
}

const rows = LEVELS.map(profile)

console.log(
  'lvl  name                 size   moves  forced  grind  medOpts  absorbed per move',
)
for (const { level, options, absorbed } of rows) {
  const forced = options.filter((n) => n <= 1).length
  const grind = absorbed.filter((n) => n <= 2).length
  const sorted = options.slice().sort((a, b) => a - b)
  const median = sorted[Math.floor(sorted.length / 2)]
  const flag = forced >= 3 || grind >= 4 ? '  <-- look at this one' : ''
  console.log(
    `${String(level.id).padStart(3)}  ${level.name.padEnd(20)} ` +
      `${`${level.width}x${level.height}`.padEnd(6)} ${String(absorbed.length).padStart(5)}  ` +
      `${String(forced).padStart(6)} ${String(grind).padStart(6)}  ${String(median).padStart(7)}  ` +
      `${absorbed.join(' ')}${flag}`,
  )
}

const totalForced = rows.reduce((n, r) => n + r.options.filter((o) => o <= 1).length, 0)
const totalMoves = rows.reduce((n, r) => n + r.absorbed.length, 0)
console.log(
  `\n${totalForced} forced moves across ${totalMoves} (${((totalForced / totalMoves) * 100).toFixed(1)}%).`,
)
console.log('forced = only one colour both survives and absorbs anything.')
console.log('grind  = the move absorbed two tiles or fewer.')
