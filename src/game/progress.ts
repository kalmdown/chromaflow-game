/**
 * localStorage-backed progress and settings.
 *
 * Reads are defensive: a corrupt or half-written blob degrades to a fresh
 * profile rather than throwing on boot, and every write is wrapped because
 * private-browsing modes can make storage unavailable entirely.
 */
export const STORAGE_KEY = 'chromaflow.save.v1'

export interface LevelRecord {
  stars: 1 | 2 | 3
  bestScore: number
  bestTurnsLeft: number
  /** Completed at least once without using undo. */
  flawless: boolean
}

export interface Settings {
  /** Draw the per-colour glyphs on every tile. */
  showSymbols: boolean
  /** 'system' follows prefers-reduced-motion. */
  motion: 'system' | 'full' | 'reduced'
}

export interface SaveData {
  version: 1
  records: Record<string, LevelRecord>
  settings: Settings
  lastLevel: number
  seenHowTo: boolean
}

export const DEFAULT_SETTINGS: Settings = { showSymbols: true, motion: 'system' }

export function emptySave(): SaveData {
  return { version: 1, records: {}, settings: { ...DEFAULT_SETTINGS }, lastLevel: 1, seenHowTo: false }
}

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return emptySave()
    const parsed = JSON.parse(raw) as Partial<SaveData>
    if (!parsed || parsed.version !== 1) return emptySave()
    return {
      version: 1,
      records: sanitiseRecords(parsed.records),
      settings: { ...DEFAULT_SETTINGS, ...(parsed.settings ?? {}) },
      lastLevel: typeof parsed.lastLevel === 'number' ? parsed.lastLevel : 1,
      seenHowTo: parsed.seenHowTo === true,
    }
  } catch {
    return emptySave()
  }
}

function sanitiseRecords(records: SaveData['records'] | undefined): SaveData['records'] {
  const out: SaveData['records'] = {}
  if (!records || typeof records !== 'object') return out
  for (const [id, record] of Object.entries(records)) {
    if (!record || typeof record !== 'object') continue
    const stars = Math.min(3, Math.max(1, Math.round(Number(record.stars) || 1)))
    out[id] = {
      stars: stars as 1 | 2 | 3,
      bestScore: Number(record.bestScore) || 0,
      bestTurnsLeft: Number(record.bestTurnsLeft) || 0,
      flawless: record.flawless === true,
    }
  }
  return out
}

export function saveSave(data: SaveData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    // Storage is full or blocked — the session simply won't persist.
  }
}

export function clearSave(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Nothing to do.
  }
}

/** Folds a finished attempt into the profile, keeping the player's best run. */
export function recordWin(
  save: SaveData,
  levelId: number,
  result: { stars: 1 | 2 | 3; score: number; turnsLeft: number; flawless: boolean },
): SaveData {
  const key = String(levelId)
  const previous = save.records[key]
  const merged: LevelRecord = {
    stars: Math.max(previous?.stars ?? 0, result.stars) as 1 | 2 | 3,
    bestScore: Math.max(previous?.bestScore ?? 0, result.score),
    bestTurnsLeft: Math.max(previous?.bestTurnsLeft ?? 0, result.turnsLeft),
    flawless: (previous?.flawless ?? false) || result.flawless,
  }
  return { ...save, records: { ...save.records, [key]: merged } }
}

/** Level 1 is always open; every other level needs the previous one cleared. */
export function isUnlocked(save: SaveData, levelId: number): boolean {
  return levelId <= 1 || save.records[String(levelId - 1)] !== undefined
}

export function highestUnlocked(save: SaveData, total: number): number {
  let highest = 1
  for (let id = 1; id <= total; id++) if (isUnlocked(save, id)) highest = id
  return highest
}

/**
 * Best-effort request that the browser exempt our save from routine eviction.
 *
 * iOS clears script-writable storage for sites left unopened for about a week,
 * which would quietly wipe a player's stars. Chrome grants persistence to
 * installed PWAs without prompting; Safari ignores the request today. Nothing
 * here can fail loudly — an unpersisted save is the status quo.
 */
export function requestPersistentStorage(): void {
  try {
    void navigator.storage?.persist?.()?.catch(() => {})
  } catch {
    // Not available in this browser.
  }
}
