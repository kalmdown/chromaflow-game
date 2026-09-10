import { describe, expect, it } from 'vitest'
import { LEVELS, TOTAL_LEVELS } from '../levels.ts'
import { createGame } from '../engine.ts'
import { countAvailableColor, countUnowned } from '../board.ts'
import { replaySolution } from '../solver.ts'

describe('level catalogue', () => {
  it('ships eighteen levels numbered 1..18', () => {
    expect(TOTAL_LEVELS).toBe(18)
    expect(LEVELS.map((l) => l.id)).toEqual(Array.from({ length: 18 }, (_, i) => i + 1))
  })

  it.each(LEVELS.map((level) => [level.id, level.name, level] as const))(
    'level %i (%s) loads and is solvable within its turn limit',
    (_id, _name, level) => {
      const game = createGame(level)
      expect(game.status).toBe('playing')
      expect(game.board.tiles.length).toBe(level.width * level.height)
      expect(countUnowned(game.board)).toBeGreaterThan(0)
      // The target colour has to be reachable from the very first turn.
      expect(countAvailableColor(game.board, level.targetColor)).toBeGreaterThan(0)

      const replay = replaySolution(level)
      expect(replay.reason ?? 'ok').toBe('ok')
      expect(replay.ok).toBe(true)
      expect(replay.finalState.status).toBe('won')
      expect(replay.finalState.board.ownedColor).toBe(level.targetColor)
      expect(countUnowned(replay.finalState.board)).toBe(0)
    },
  )

  it('introduces mechanics in the documented order', () => {
    const kinds = (id: number) => LEVELS[id - 1].rows.join(' ')
    // Keys and locks first appear at 11, shuffles at 15.
    for (let id = 1; id <= 10; id++) expect(kinds(id)).not.toMatch(/[KL]\d:/)
    for (let id = 1; id <= 14; id++) expect(kinds(id)).not.toMatch(/S\d/)
    expect(kinds(11)).toMatch(/K\d:/)
    expect(kinds(15)).toMatch(/S\d/)
  })

  it('keeps turn limits above the reference solution length', () => {
    for (const level of LEVELS) {
      expect(level.solution?.length ?? Infinity).toBeLessThanOrEqual(level.turnLimit)
      expect(level.colors.length).toBeGreaterThanOrEqual(5)
      expect(level.colors.length).toBeLessThanOrEqual(7)
      expect(level.colors).toContain(level.targetColor)
    }
  })
})
