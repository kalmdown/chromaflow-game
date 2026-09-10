import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { Board } from './Board.tsx'
import { ColorPalette } from './ColorPalette.tsx'
import { HowToPlay } from './HowToPlay.tsx'
import { Modal } from './Modal.tsx'
import { Stars } from './Stars.tsx'
import { SettingsPanel } from './SettingsPanel.tsx'
import { useLevelSession } from '../hooks/useLevelSession.ts'
import { LOSS_MESSAGES, computeStars } from '../game/engine.ts'
import { countUnowned } from '../game/board.ts'
import { paletteEntry } from '../game/palette.ts'
import { ColorGlyph } from './Glyph.tsx'
import type { LevelDefinition } from '../game/types.ts'
import type { LevelRecord, Settings } from '../game/progress.ts'

export interface WinPayload {
  levelId: number
  stars: 1 | 2 | 3
  score: number
  turnsLeft: number
  flawless: boolean
}

interface GameScreenProps {
  level: LevelDefinition
  settings: Settings
  reducedMotion: boolean
  record?: LevelRecord
  hasNext: boolean
  onWin: (payload: WinPayload) => void
  onNext: () => void
  onExit: () => void
  onSettingsChange: (settings: Settings) => void
}

type Dialog = 'none' | 'howto' | 'pause' | 'restart'

/** Mounted with `key={level.id}`, so a level change resets every local state. */
export function GameScreen({
  level,
  settings,
  reducedMotion,
  record,
  hasNext,
  onWin,
  onNext,
  onExit,
  onSettingsChange,
}: GameScreenProps) {
  const session = useLevelSession(level, reducedMotion)
  const { state, flash, busy, canUndo, choose, undo, restart } = session
  const [dialog, setDialog] = useState<Dialog>('none')
  const [hintOpen, setHintOpen] = useState(true)
  const reportedRef = useRef<string>('')

  const target = paletteEntry(level.targetColor)
  const remaining = countUnowned(state.board)
  const stars = computeStars(state)
  const over = state.status !== 'playing'

  // Report a win exactly once per attempt.
  useEffect(() => {
    if (state.status !== 'won') return
    const stamp = `${level.id}:${state.turnsUsed}:${state.score}`
    if (reportedRef.current === stamp) return
    reportedRef.current = stamp
    onWin({
      levelId: level.id,
      stars: computeStars(state),
      score: state.score,
      turnsLeft: state.turnsLeft,
      flawless: !state.usedUndo,
    })
  }, [state, level.id, onWin])

  // Keyboard controls. Dialogs swallow everything except their own Escape.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (dialog !== 'none') return
      const tag = (event.target as HTMLElement | null)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return

      const key = event.key.toLowerCase()
      if (key === 'z') {
        event.preventDefault()
        undo()
        return
      }
      if (event.ctrlKey || event.metaKey || event.altKey) return
      if (key === 'r') {
        event.preventDefault()
        if (state.turnsUsed > 0 || state.status !== 'playing') setDialog('restart')
        return
      }
      if (key === 'escape') {
        event.preventDefault()
        setDialog('pause')
        return
      }
      const slot = Number(event.key)
      if (Number.isInteger(slot) && slot >= 1 && slot <= level.colors.length) {
        event.preventDefault()
        if (state.status === 'playing') choose(level.colors[slot - 1])
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [dialog, choose, undo, level.colors, state.turnsUsed, state.status])

  const headStyle = { '--target-color': target.hex } as CSSProperties

  return (
    <main className="screen screen--game" style={headStyle}>
      <header className="hud card">
        <div className="hud__top">
          <button type="button" className="icon-button" onClick={onExit} aria-label="Back to level select">
            ←
          </button>
          <div className="hud__title">
            <span className="hud__level">Level {level.id}</span>
            <span className="hud__name">{level.name}</span>
          </div>
          <button
            type="button"
            className="icon-button"
            onClick={() => setDialog('pause')}
            aria-label="Pause and open settings"
          >
            ⚙
          </button>
        </div>

        <div className="hud__stats">
          <Stat label="Score" value={state.score.toLocaleString()} />
          <Stat
            label="Turns left"
            value={String(state.turnsLeft)}
            tone={state.turnsLeft <= 2 ? 'warn' : 'default'}
          />
          <Stat label="Tiles left" value={String(remaining)} />
          <div className="stat stat--target">
            <span className="stat__label">Finish on</span>
            <span className="stat__value">
              <span className="target-chip" aria-hidden="true">
                <span className="target-chip__dot" />
                <ColorGlyph color={level.targetColor} />
              </span>
              {target.name}
            </span>
          </div>
        </div>

        {state.comboStreak >= 2 && (
          <p className="hud__combo" aria-live="polite">
            Combo ×{state.comboStreak} · {comboLabel(state.comboStreak)} multiplier
          </p>
        )}
      </header>

      {level.hint && hintOpen && (
        <div className="hint card">
          <p>{level.hint}</p>
          <button
            type="button"
            className="button button--ghost button--small"
            onClick={() => setHintOpen(false)}
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="board-wrap">
        <Board
          board={state.board}
          showSymbols={settings.showSymbols}
          justAbsorbed={session.justAbsorbed}
          shuffling={flash?.shuffled === true && !reducedMotion}
          disabled={busy || over}
          onPick={choose}
        />
        {flash && flash.gained > 0 && (
          <span key={flash.key} className="flash" aria-hidden="true">
            +{flash.gained}
            {flash.multiplier > 1 && <em> ×{flash.multiplier}</em>}
          </span>
        )}
      </div>

      <p className="live" aria-live="polite">
        {flash
          ? `Absorbed ${flash.cells} tile${flash.cells === 1 ? '' : 's'} for ${flash.gained} points.` +
            (flash.unlocked.length > 0 ? ` Unlocked group ${flash.unlocked.join(', ')}.` : '') +
            (flash.shuffled ? ' The board reshuffled.' : '')
          : ''}
      </p>

      {flash?.shuffled && <Toast key={`s${flash.key}`} text="Shuffle! The board re-dealt." />}
      {flash && flash.unlocked.length > 0 && (
        <Toast key={`u${flash.key}`} text={`Key collected — group ${flash.unlocked.join(', ')} unlocked.`} />
      )}

      <ColorPalette
        colors={level.colors}
        board={state.board}
        targetColor={level.targetColor}
        disabled={busy || over}
        onPick={choose}
      />

      <div className="controls">
        <button type="button" className="button" onClick={undo} disabled={!canUndo}>
          ↶ Undo
        </button>
        <button
          type="button"
          className="button"
          onClick={() => (state.turnsUsed > 0 ? setDialog('restart') : restart())}
        >
          ↻ Restart
        </button>
        <button
          type="button"
          className="button"
          onClick={() => setDialog('howto')}
          aria-label="How to play"
        >
          ? Help
        </button>
      </div>

      {dialog === 'howto' && <HowToPlay onClose={() => setDialog('none')} />}

      {dialog === 'pause' && (
        <Modal
          title="Paused"
          onClose={() => setDialog('none')}
          footer={
            <>
              <button type="button" className="button" onClick={onExit}>
                Level select
              </button>
              <button
                type="button"
                className="button button--primary"
                onClick={() => setDialog('none')}
              >
                Resume
              </button>
            </>
          }
        >
          <SettingsPanel settings={settings} onChange={onSettingsChange} />
          <button type="button" className="button button--ghost" onClick={() => setDialog('howto')}>
            How to play
          </button>
        </Modal>
      )}

      {dialog === 'restart' && (
        <Modal
          title="Restart level?"
          onClose={() => setDialog('none')}
          footer={
            <>
              <button type="button" className="button" onClick={() => setDialog('none')}>
                Keep playing
              </button>
              <button
                type="button"
                className="button button--primary"
                onClick={() => {
                  restart()
                  setDialog('none')
                }}
              >
                Restart
              </button>
            </>
          }
        >
          <p>Your progress on this attempt will be discarded and the board reset.</p>
        </Modal>
      )}

      {state.status === 'won' && dialog === 'none' && (
        <Modal
          title="Level complete"
          tone="win"
          footer={
            <>
              <button type="button" className="button" onClick={onExit}>
                Levels
              </button>
              <button type="button" className="button" onClick={restart}>
                Replay
              </button>
              {hasNext && (
                <button type="button" className="button button--primary" onClick={onNext}>
                  Next level →
                </button>
              )}
            </>
          }
        >
          <div className="result">
            <Stars earned={stars} size="lg" />
            <dl className="result__grid">
              <div>
                <dt>Score</dt>
                <dd>{state.score.toLocaleString()}</dd>
              </div>
              <div>
                <dt>Moves used</dt>
                <dd>
                  {state.turnsUsed} / {level.turnLimit}
                </dd>
              </div>
              <div>
                <dt>Turns spare</dt>
                <dd>{state.turnsLeft}</dd>
              </div>
              <div>
                <dt>Best score</dt>
                <dd>{Math.max(record?.bestScore ?? 0, state.score).toLocaleString()}</dd>
              </div>
            </dl>
            <p className="result__note">
              {state.usedUndo
                ? 'Undo was used, so no flawless badge this run.'
                : 'Flawless — cleared without a single undo.'}
            </p>
            {stars < 3 && (
              <p className="result__note result__note--dim">
                Three stars need {level.starScore[1].toLocaleString()} points with{' '}
                {level.starTurns[1]} turn{level.starTurns[1] === 1 ? '' : 's'} to spare.
              </p>
            )}
          </div>
        </Modal>
      )}

      {state.status === 'lost' && dialog === 'none' && (
        <Modal
          title="Level failed"
          tone="loss"
          footer={
            <>
              <button type="button" className="button" onClick={onExit}>
                Level select
              </button>
              {canUndo && (
                <button type="button" className="button" onClick={undo}>
                  ↶ Undo last move
                </button>
              )}
              <button type="button" className="button button--primary" onClick={restart}>
                Restart
              </button>
            </>
          }
        >
          <p className="result__reason">
            {state.lossReason ? LOSS_MESSAGES[state.lossReason] : 'The level ended.'}
          </p>
          <p className="result__note result__note--dim">
            {remaining > 0
              ? `${remaining} tile${remaining === 1 ? '' : 's'} were still unclaimed.`
              : 'The board was full, but not on the target colour.'}
          </p>
        </Modal>
      )}
    </main>
  )
}

function Stat({
  label,
  value,
  tone = 'default',
}: {
  label: string
  value: string
  tone?: 'default' | 'warn'
}) {
  return (
    <div className={`stat${tone === 'warn' ? ' stat--warn' : ''}`}>
      <span className="stat__label">{label}</span>
      <span className="stat__value">{value}</span>
    </div>
  )
}

function Toast({ text }: { text: string }) {
  return <div className="toast">{text}</div>
}

function comboLabel(streak: number): string {
  if (streak >= 4) return '2×'
  if (streak === 3) return '1.5×'
  return '1.25×'
}
