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

/** Which colour-blind-safe marks the tiles carry on top of their hue. */
export type TileMarks = 'both' | 'symbols' | 'textures' | 'none'

export interface Settings {
  tileMarks: TileMarks
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

export const DEFAULT_SETTINGS: Settings = { tileMarks: 'both', motion: 'system' }

export function emptySave(): SaveData {
  return { version: 1, records: {}, settings: { ...DEFAULT_SETTINGS }, lastLevel: 1, seenHowTo: false }
}

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return emptySave()
    return coerceSave(JSON.parse(raw)) ?? emptySave()
  } catch {
    return emptySave()
  }
}

/**
 * Validates an untrusted blob into a save, or null if it is not one.
 *
 * Both stored data and pasted transfer text come through here, so an import
 * can never introduce a shape the rest of the app would not survive.
 */
function coerceSave(parsed: unknown): SaveData | null {
  if (!parsed || typeof parsed !== 'object') return null
  const raw = parsed as Partial<SaveData>
  if (raw.version !== 1) return null
  return {
    version: 1,
    records: sanitiseRecords(raw.records),
    settings: migrateSettings(raw.settings),
    lastLevel: typeof raw.lastLevel === 'number' ? raw.lastLevel : 1,
    seenHowTo: raw.seenHowTo === true,
  }
}

function migrateSettings(stored: Partial<Settings> | undefined): Settings {
  // Saves from before textures existed carried a single `showSymbols` switch.
  const legacy = stored as (Partial<Settings> & { showSymbols?: boolean }) | undefined
  return {
    tileMarks:
      legacy?.tileMarks ?? (legacy?.showSymbols === false ? 'none' : DEFAULT_SETTINGS.tileMarks),
    motion: legacy?.motion ?? DEFAULT_SETTINGS.motion,
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

/* ------------------------------------------------------- transfer + merge -- */

/** The text a player copies off one device. */
export function exportSave(save: SaveData): string {
  return JSON.stringify(save, null, 2)
}

/** Parses transfer text, or null when it is not a Chromaflow save. */
export function parseSave(text: string): SaveData | null {
  try {
    return coerceSave(JSON.parse(text))
  } catch {
    return null
  }
}

/** Keeps whichever attempt went better on each axis. */
function mergeRecord(a: LevelRecord, b: LevelRecord): LevelRecord {
  return {
    stars: Math.max(a.stars, b.stars) as 1 | 2 | 3,
    bestScore: Math.max(a.bestScore, b.bestScore),
    bestTurnsLeft: Math.max(a.bestTurnsLeft, b.bestTurnsLeft),
    flawless: a.flawless || b.flawless,
  }
}

/**
 * Folds an imported profile into the local one, keeping the better result per
 * level rather than letting one device overwrite the other.
 *
 * Every field of a record is a maximum and `flawless` is a disjunction, so the
 * merge is order-independent: importing A into B gives the same profile as
 * importing B into A. That is what makes an import safe on a device that has
 * its own progress — and what a cross-device sync would be built on.
 *
 * Settings stay local: motion and symbol preferences describe this device, not
 * the profile.
 */
export function mergeSaves(local: SaveData, incoming: SaveData): SaveData {
  const records: SaveData['records'] = { ...local.records }
  for (const [id, record] of Object.entries(incoming.records)) {
    const mine = records[id]
    records[id] = mine ? mergeRecord(mine, record) : record
  }
  return {
    version: 1,
    records,
    settings: local.settings,
    lastLevel: Math.max(local.lastLevel, incoming.lastLevel),
    seenHowTo: local.seenHowTo || incoming.seenHowTo,
  }
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
