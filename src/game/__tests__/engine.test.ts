import { describe, expect, it } from 'vitest'
import { applyMove, comboMultiplier, computeStars, createGame } from '../engine.ts'
import { countAvailableColor, countUnowned } from '../board.ts'
import type { ColorId, GameState, LevelDefinition } from '../types.ts'

/** Minimal level factory so each test can state just what it cares about. */
function level(rows: string[], overrides: Partial<LevelDefinition> = {}): LevelDefinition {
  const width = rows[0].trim().split(/\s+/).length
  return {
    id: 999,
    name: 'test',
    width,
    height: rows.length,
    colors: [0, 1, 2, 3, 4],
    targetColor: 0,
    turnLimit: 10,
    rows,
    seed: 12345,
    starScore: [0, 0],
    starTurns: [0, 0],
    ...overrides,
  }
}

function play(state: GameState, colors: ColorId[]): GameState {
  let current = state
  for (const color of colors) {
    const result = applyMove(current, color)
    expect(result.ok).toBe(true)
    current = result.state
  }
  return current
}

describe('flood fill', () => {
  it('connects orthogonally and never diagonally', () => {
    const game = createGame(
      level(['0 1', '1 0'], { targetColor: 0, turnLimit: 3 }),
    )
    // The bottom-right tile shares the origin's colour but only touches it
    // diagonally, so it must not be part of the starting region.
    expect(game.board.tiles[0].owned).toBe(true)
    expect(game.board.tiles[3].owned).toBe(false)

    const first = applyMove(game, 1)
    expect(first.absorbed.length).toBe(2)
    expect(first.state.board.tiles[3].owned).toBe(false)

    const second = applyMove(first.state, 0)
    expect(second.state.board.tiles[3].owned).toBe(true)
    expect(second.state.status).toBe('won')
  })

  it('absorbs the whole connected same-colour blob in one move', () => {
    const game = createGame(
      level(['0 1 1 1', '2 1 1 1', '2 2 2 0'], { targetColor: 0, turnLimit: 6 }),
    )
    const result = applyMove(game, 1)
    expect(result.absorbed.length).toBe(6)
  })

  it('rejects re-selecting the colour the region already has', () => {
    const game = createGame(level(['0 1', '1 0']))
    const result = applyMove(game, game.board.ownedColor)
    expect(result.ok).toBe(false)
    expect(result.rejected).toBe('same-color')
    expect(result.state).toBe(game)
  })

  it('rejects colours outside the level palette', () => {
    const game = createGame(level(['0 1', '1 0'], { colors: [0, 1] }))
    const result = applyMove(game, 4)
    expect(result.ok).toBe(false)
    expect(result.rejected).toBe('color-not-in-level')
  })

  it('treats void cells as absent from the board', () => {
    const game = createGame(level(['0 1 .', '. 1 .'], { targetColor: 1, turnLimit: 3 }))
    expect(countUnowned(game.board)).toBe(2)
    const result = applyMove(game, 1)
    expect(result.state.status).toBe('won')
  })
})

describe('target colour rule', () => {
  it('loses immediately when the last unclaimed target tiles are absorbed early', () => {
    const game = createGame(level(['0 2 1'], { targetColor: 2, turnLimit: 5 }))
    const result = applyMove(game, 2)
    expect(result.state.status).toBe('lost')
    expect(result.state.lossReason).toBe('target-exhausted')
  })

  it('wins when the board is cleared on the target colour', () => {
    const game = createGame(level(['0 1 2 2'], { targetColor: 2, turnLimit: 5 }))
    const after = play(game, [1, 2])
    expect(after.status).toBe('won')
    expect(after.board.ownedColor).toBe(2)
  })

  it('does not fire the exhaustion rule on the winning move', () => {
    const game = createGame(level(['0 2 2'], { targetColor: 2, turnLimit: 5 }))
    const result = applyMove(game, 2)
    expect(result.state.status).toBe('won')
  })
})

describe('keys and locks', () => {
  it('does not absorb a locked tile even when the colour matches', () => {
    // The key belongs to group 2, so group 1's lock never opens.
    const game = createGame(
      level(['0 L1:1 K1:2'], { targetColor: 1, turnLimit: 4 }),
    )
    const result = applyMove(game, 1)
    expect(result.absorbed.length).toBe(0)
    expect(result.state.board.tiles[1].owned).toBe(false)
    expect(result.state.board.tiles[1].locked).toBe(true)
  })

  it('locked tiles do not count as available target colour', () => {
    const game = createGame(level(['0 L2:1 1'], { targetColor: 2, turnLimit: 4 }))
    expect(countAvailableColor(game.board, 2)).toBe(0)
  })

  it('absorbing a key unlocks its group and lets the flow continue', () => {
    const game = createGame(level(['0 K1:1 L1:1'], { targetColor: 1, turnLimit: 4 }))
    const result = applyMove(game, 1)
    expect(result.unlocked).toEqual([1])
    expect(result.state.board.unlockedGroups).toEqual([1])
    expect(result.state.board.tiles[2].locked).toBe(false)
    // The freshly unlocked tile matches the owned colour, so the same move
    // takes it: absorption re-runs to a fixpoint after every unlock.
    expect(result.absorbed.length).toBe(2)
    expect(result.state.status).toBe('won')
  })

  it('only opens locks that share the key group', () => {
    const game = createGame(
      level(['0 K1:1 L1:1 L1:2'], { targetColor: 1, turnLimit: 5 }),
    )
    const result = applyMove(game, 1)
    expect(result.state.board.tiles[2].locked).toBe(false)
    expect(result.state.board.tiles[3].locked).toBe(true)
    expect(result.state.board.tiles[3].owned).toBe(false)
  })
})

describe('shuffle tiles', () => {
  const shuffleLevel = level(
    [
      '0 S1 2 3 4',
      'L2:1 3 2 4 3',
      '2 4 3 2 4',
    ],
    { targetColor: 2, turnLimit: 12 },
  )

  it('preserves tile kinds, positions, locks and the owned region', () => {
    const game = createGame(shuffleLevel)
    const before = game.board.tiles.map((t) => t.kind)
    const lockColorBefore = game.board.tiles[5].color

    const result = applyMove(game, 1)
    expect(result.shuffled).toBe(true)

    const after = result.state.board
    expect(after.tiles.map((t) => t.kind)).toEqual(before)
    expect(after.tiles[5].kind).toBe('lock')
    expect(after.tiles[5].locked).toBe(true)
    expect(after.tiles[5].color).toBe(lockColorBefore)
    expect(after.tiles[0].owned).toBe(true)
    expect(after.tiles[1].owned).toBe(true)
    expect(after.tiles[1].triggered).toBe(true)
  })

  it('re-deals the same colours, so the target colour cannot vanish', () => {
    const game = createGame(shuffleLevel)
    const tally = (state: GameState) => {
      const counts = new Map<number, number>()
      state.board.tiles.forEach((tile) => {
        if (tile.kind !== 'normal' || tile.owned) return
        counts.set(tile.color, (counts.get(tile.color) ?? 0) + 1)
      })
      return [...counts.entries()].sort((a, b) => a[0] - b[0])
    }
    const before = tally(game)
    const result = applyMove(game, 1)
    expect(tally(result.state)).toEqual(before)
    expect(countAvailableColor(result.state.board, 2)).toBeGreaterThan(0)
  })

  it('is deterministic for a given level seed', () => {
    const a = applyMove(createGame(shuffleLevel), 1).state
    const b = applyMove(createGame(shuffleLevel), 1).state
    expect(a.board.tiles.map((t) => t.color)).toEqual(b.board.tiles.map((t) => t.color))
  })

  it('fires only once per shuffle tile', () => {
    const game = createGame(shuffleLevel)
    const first = applyMove(game, 1)
    const colorsAfterFirst = first.state.board.tiles.map((t) => t.color)
    const second = applyMove(first.state, 3)
    expect(second.shuffled).toBe(false)
    // Nothing re-deals; only absorption changes tiles this turn.
    const unchanged = second.state.board.tiles.every(
      (tile, i) => tile.owned || tile.color === colorsAfterFirst[i],
    )
    expect(unchanged).toBe(true)
  })
})

describe('turns, scoring and combos', () => {
  it('loses when the turn limit runs out with tiles left', () => {
    const game = createGame(level(['0 1 2 0'], { targetColor: 0, turnLimit: 1 }))
    const result = applyMove(game, 1)
    expect(result.state.turnsLeft).toBe(0)
    expect(result.state.status).toBe('lost')
    expect(result.state.lossReason).toBe('out-of-turns')
  })

  it('only spends a turn on a valid move', () => {
    const game = createGame(level(['0 1 2 0'], { targetColor: 0, turnLimit: 4 }))
    const rejected = applyMove(game, game.board.ownedColor)
    expect(rejected.state.turnsLeft).toBe(4)
    const accepted = applyMove(game, 1)
    expect(accepted.state.turnsLeft).toBe(3)
    expect(accepted.state.turnsUsed).toBe(1)
  })

  it('refuses moves once the level is over', () => {
    const game = createGame(level(['0 2 1'], { targetColor: 2, turnLimit: 5 }))
    const lost = applyMove(game, 2).state
    const after = applyMove(lost, 1)
    expect(after.ok).toBe(false)
    expect(after.rejected).toBe('not-playing')
  })

  it('scores ten points per absorbed cell', () => {
    const game = createGame(level(['0 1 1 1'], { targetColor: 1, turnLimit: 4 }))
    const result = applyMove(game, 1)
    expect(result.absorbed.length).toBe(3)
    expect(result.gained).toBe(30)
    expect(result.multiplier).toBe(1)
  })

  it('steps the combo multiplier up and caps it at 2x', () => {
    expect(comboMultiplier(0)).toBe(1)
    expect(comboMultiplier(1)).toBe(1)
    expect(comboMultiplier(2)).toBe(1.25)
    expect(comboMultiplier(3)).toBe(1.5)
    expect(comboMultiplier(4)).toBe(2)
    expect(comboMultiplier(9)).toBe(2)
  })

  it('builds a combo on big absorptions and drops it on small ones', () => {
    const game = createGame(
      level(
        [
          '0 1 1 1 1',
          '2 1 1 1 1',
          '2 2 2 2 3',
          '4 4 4 4 3',
        ],
        { targetColor: 4, turnLimit: 10 },
      ),
    )
    const first = applyMove(game, 1)
    expect(first.state.comboStreak).toBe(1)
    const second = applyMove(first.state, 2)
    expect(second.state.comboStreak).toBe(2)
    expect(second.multiplier).toBe(1.25)
    const third = applyMove(second.state, 3)
    expect(third.absorbed.length).toBeLessThan(4)
    expect(third.state.comboStreak).toBe(0)
    expect(third.multiplier).toBe(1)
  })

  it('awards stars from score and spare turns', () => {
    const game = createGame(
      level(['0 1 1 1'], { targetColor: 1, turnLimit: 5, starScore: [30, 60], starTurns: [1, 4] }),
    )
    const won = applyMove(game, 1).state
    expect(won.status).toBe('won')
    // Score clears the second tier, turns do not clear the third.
    expect(computeStars(won)).toBe(2)
  })
})

describe('board parsing', () => {
  it('rejects a row with the wrong number of cells', () => {
    expect(() => createGame(level(['0 1 2', '0 1']))).toThrow(/expected 3 cells/)
  })

  it('rejects colours outside the level palette', () => {
    expect(() => createGame(level(['0 5', '1 1'], { colors: [0, 1] }))).toThrow(/not in this level/)
  })

  it('rejects an unplayable origin', () => {
    expect(() => createGame(level(['. 1', '1 1']))).toThrow(/origin tile/)
  })
})
