import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { applyMove, createGame } from '../game/engine.ts'
import type { ColorId, GameState, LevelDefinition } from '../game/types.ts'

/** Transient feedback shown next to the board after a move. */
export interface MoveFlash {
  /** Bumped on every move so React restarts the animation. */
  key: number
  gained: number
  cells: number
  multiplier: number
  combo: number
  unlocked: number[]
  shuffled: boolean
}

export interface LevelSession {
  state: GameState
  /** Indices absorbed by the most recent move, for the pop animation. */
  justAbsorbed: number[]
  flash: MoveFlash | null
  /** True while a move is resolving — the UI must ignore input. */
  busy: boolean
  canUndo: boolean
  choose: (color: ColorId) => void
  undo: () => void
  restart: () => void
}

const MOVE_ANIMATION_MS = 260

export function useLevelSession(
  level: LevelDefinition,
  reducedMotion: boolean,
): LevelSession {
  const [state, setState] = useState<GameState>(() => createGame(level))
  const [history, setHistory] = useState<GameState[]>([])
  const [justAbsorbed, setJustAbsorbed] = useState<number[]>([])
  const [flash, setFlash] = useState<MoveFlash | null>(null)
  const [busy, setBusy] = useState(false)
  const moveCounter = useRef(0)
  const timer = useRef<number | undefined>(undefined)

  const reset = useCallback(() => {
    if (timer.current !== undefined) window.clearTimeout(timer.current)
    setState(createGame(level))
    setHistory([])
    setJustAbsorbed([])
    setFlash(null)
    setBusy(false)
  }, [level])

  // Note: switching levels is handled by remounting (App keys <GameScreen> on
  // the level id), so there is no reset-on-prop-change effect to go stale.

  useEffect(() => () => {
    if (timer.current !== undefined) window.clearTimeout(timer.current)
  }, [])

  const choose = useCallback(
    (color: ColorId) => {
      if (busy) return
      setState((current) => {
        if (current.status !== 'playing') return current
        const result = applyMove(current, color)
        if (!result.ok) return current

        setHistory((h) => [...h, current])
        setJustAbsorbed(result.absorbed)
        moveCounter.current += 1
        setFlash({
          key: moveCounter.current,
          gained: result.gained,
          cells: result.absorbed.length,
          multiplier: result.multiplier,
          combo: result.state.comboStreak,
          unlocked: result.unlocked,
          shuffled: result.shuffled,
        })

        if (!reducedMotion) {
          setBusy(true)
          if (timer.current !== undefined) window.clearTimeout(timer.current)
          timer.current = window.setTimeout(() => setBusy(false), MOVE_ANIMATION_MS)
        }
        return result.state
      })
    },
    [busy, reducedMotion],
  )

  const undo = useCallback(() => {
    if (busy) return
    setHistory((h) => {
      if (h.length === 0) return h
      const previous = h[h.length - 1]
      // Restoring the snapshot brings back the board, turns, score, combo,
      // unlocked groups, RNG cursor and status in one step.
      setState({ ...previous, usedUndo: true })
      setJustAbsorbed([])
      setFlash(null)
      return h.slice(0, -1)
    })
  }, [busy])

  const canUndo = history.length > 0 && !busy

  return useMemo(
    () => ({ state, justAbsorbed, flash, busy, canUndo, choose, undo, restart: reset }),
    [state, justAbsorbed, flash, busy, canUndo, choose, undo, reset],
  )
}
