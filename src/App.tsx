import { useCallback, useEffect, useMemo, useState } from 'react'
import { TitleScreen } from './components/TitleScreen.tsx'
import { LevelSelect } from './components/LevelSelect.tsx'
import { GameScreen } from './components/GameScreen.tsx'
import type { WinPayload } from './components/GameScreen.tsx'
import { HowToPlay } from './components/HowToPlay.tsx'
import { Modal } from './components/Modal.tsx'
import { UpdatePrompt } from './components/UpdatePrompt.tsx'
import { LEVELS, TOTAL_LEVELS, getLevel } from './game/levels.ts'
import {
  clearSave,
  emptySave,
  highestUnlocked,
  loadSave,
  recordWin,
  requestPersistentStorage,
  saveSave,
} from './game/progress.ts'
import type { SaveData, Settings } from './game/progress.ts'
import { useReducedMotion } from './hooks/useReducedMotion.ts'

type Screen = 'title' | 'levels' | 'play'

export default function App() {
  const [save, setSave] = useState<SaveData>(() => loadSave())
  const [screen, setScreen] = useState<Screen>('title')
  const [levelId, setLevelId] = useState<number>(() => 1)
  const [howToOpen, setHowToOpen] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)

  const reducedMotion = useReducedMotion(save.settings.motion)

  // Persist on every change; the save blob is tiny so this stays cheap.
  useEffect(() => saveSave(save), [save])

  // Ask once per load that the browser keep the save through storage pressure.
  useEffect(() => requestPersistentStorage(), [])

  useEffect(() => {
    document.documentElement.dataset.motion = reducedMotion ? 'reduced' : 'full'
  }, [reducedMotion])

  const level = getLevel(levelId) ?? LEVELS[0]
  const clearedCount = Object.keys(save.records).length
  const totalStars = useMemo(
    () => Object.values(save.records).reduce((sum, record) => sum + record.stars, 0),
    [save.records],
  )

  const startLevel = useCallback((id: number) => {
    setLevelId(id)
    setScreen('play')
    setSave((current) => ({ ...current, lastLevel: id, seenHowTo: true }))
  }, [])

  const handleWin = useCallback((payload: WinPayload) => {
    setSave((current) =>
      recordWin(current, payload.levelId, {
        stars: payload.stars,
        score: payload.score,
        turnsLeft: payload.turnsLeft,
        flawless: payload.flawless,
      }),
    )
  }, [])

  const handleSettings = useCallback((settings: Settings) => {
    setSave((current) => ({ ...current, settings }))
  }, [])

  const resume = highestUnlocked(save, TOTAL_LEVELS)
  const nextId = levelId + 1
  const hasNext = nextId <= TOTAL_LEVELS

  return (
    <div className="app">
      {screen === 'title' && (
        <TitleScreen
          clearedCount={clearedCount}
          totalLevels={TOTAL_LEVELS}
          totalStars={totalStars}
          hasProgress={clearedCount > 0}
          continueLabel={clearedCount > 0 ? `Continue · Level ${resume}` : 'Play'}
          onPlay={() => startLevel(save.seenHowTo ? resume : 1)}
          onLevels={() => setScreen('levels')}
          onHowToPlay={() => setHowToOpen(true)}
          onResetProgress={() => setConfirmReset(true)}
        />
      )}

      {screen === 'levels' && (
        <LevelSelect save={save} onPlay={startLevel} onBack={() => setScreen('title')} />
      )}

      {screen === 'play' && (
        <GameScreen
          key={level.id}
          level={level}
          settings={save.settings}
          reducedMotion={reducedMotion}
          record={save.records[String(level.id)]}
          hasNext={hasNext}
          onWin={handleWin}
          onNext={() => startLevel(nextId)}
          onExit={() => setScreen('levels')}
          onSettingsChange={handleSettings}
        />
      )}

      {howToOpen && <HowToPlay onClose={() => setHowToOpen(false)} />}

      <UpdatePrompt />

      {confirmReset && (
        <Modal
          title="Reset all progress?"
          onClose={() => setConfirmReset(false)}
          footer={
            <>
              <button type="button" className="button" onClick={() => setConfirmReset(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="button button--danger"
                onClick={() => {
                  clearSave()
                  setSave(emptySave())
                  setConfirmReset(false)
                }}
              >
                Erase everything
              </button>
            </>
          }
        >
          <p>
            Every cleared level, star and best score will be deleted from this browser. Settings
            return to their defaults. This cannot be undone.
          </p>
        </Modal>
      )}
    </div>
  )
}
