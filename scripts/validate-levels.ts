/**
 * Dev-only catalogue check:  npm run levels:validate
 *
 * Replays every level's stored reference solution through the real engine and
 * fails the process if any level cannot be won inside its turn limit. The same
 * check runs as part of `npm test`; this script exists so it can be run on its
 * own (in CI, or after hand-editing src/game/levels.ts).
 */
import { LEVELS } from '../src/game/levels.ts'
import { validateLevels } from '../src/game/solver.ts'

const reports = validateLevels(LEVELS)
let failed = 0

for (const report of reports) {
  const status = report.ok ? 'ok  ' : 'FAIL'
  const detail = report.ok ? `${report.moves}/${report.turnLimit} moves` : report.reason
  console.log(`${status} level ${String(report.id).padStart(2)}  ${report.name.padEnd(20)} ${detail}`)
  if (!report.ok) failed++
}

console.log(`\n${reports.length - failed}/${reports.length} levels verified solvable.`)
if (failed > 0) process.exit(1)
