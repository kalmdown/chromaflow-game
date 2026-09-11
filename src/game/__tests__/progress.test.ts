import { describe, expect, it } from 'vitest'
import { emptySave, exportSave, mergeSaves, parseSave } from '../progress.ts'
import type { LevelRecord, SaveData } from '../progress.ts'

function record(partial: Partial<LevelRecord> = {}): LevelRecord {
  return { stars: 1, bestScore: 100, bestTurnsLeft: 0, flawless: false, ...partial }
}

function saveWith(records: SaveData['records'], extra: Partial<SaveData> = {}): SaveData {
  return { ...emptySave(), records, ...extra }
}

describe('parseSave', () => {
  it('round-trips an exported save', () => {
    const save = saveWith({ '3': record({ stars: 2 }) }, { lastLevel: 3, seenHowTo: true })
    expect(parseSave(exportSave(save))).toEqual(save)
  })

  it('rejects text that is not a save', () => {
    expect(parseSave('')).toBeNull()
    expect(parseSave('not json')).toBeNull()
    expect(parseSave('[]')).toBeNull()
    expect(parseSave('null')).toBeNull()
    expect(parseSave('{"version":2}')).toBeNull()
  })

  it('repairs a save with junk records rather than rejecting it', () => {
    const parsed = parseSave('{"version":1,"records":{"1":{"stars":99},"2":null}}')
    expect(parsed?.records['1'].stars).toBe(3)
    expect(parsed?.records['2']).toBeUndefined()
  })
})

describe('mergeSaves', () => {
  it('keeps the better result on every axis', () => {
    const local = saveWith({
      '1': record({ stars: 3, bestScore: 900, bestTurnsLeft: 1, flawless: false }),
    })
    const incoming = saveWith({
      '1': record({ stars: 1, bestScore: 1200, bestTurnsLeft: 0, flawless: true }),
    })

    expect(mergeSaves(local, incoming).records['1']).toEqual({
      stars: 3,
      bestScore: 1200,
      bestTurnsLeft: 1,
      flawless: true,
    })
  })

  it('carries over levels the local profile has never cleared', () => {
    const merged = mergeSaves(saveWith({ '1': record() }), saveWith({ '7': record({ stars: 2 }) }))
    expect(Object.keys(merged.records).sort()).toEqual(['1', '7'])
  })

  it('is order-independent, so neither device wins by importing second', () => {
    const a = saveWith({ '1': record({ stars: 3, bestScore: 10 }), '2': record() }, { lastLevel: 2 })
    const b = saveWith({ '1': record({ stars: 1, bestScore: 99 }), '5': record() }, { lastLevel: 5 })
    expect(mergeSaves(a, b)).toEqual(mergeSaves(b, a))
  })

  it('advances lastLevel and seenHowTo but leaves settings local', () => {
    const local = saveWith({}, { lastLevel: 2, seenHowTo: false })
    local.settings = { tileMarks: 'none', motion: 'reduced' }
    const incoming = saveWith({}, { lastLevel: 9, seenHowTo: true })

    const merged = mergeSaves(local, incoming)
    expect(merged.lastLevel).toBe(9)
    expect(merged.seenHowTo).toBe(true)
    expect(merged.settings).toEqual({ tileMarks: 'none', motion: 'reduced' })
  })

  it('never loses a cleared level', () => {
    const local = saveWith({ '1': record(), '2': record() })
    const incoming = saveWith({ '2': record(), '3': record() })
    expect(Object.keys(mergeSaves(local, incoming).records).sort()).toEqual(['1', '2', '3'])
  })
})
