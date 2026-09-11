import type { CSSProperties } from 'react'
import { LEVELS } from '../game/levels.ts'
import { paletteEntry } from '../game/palette.ts'
import { isUnlocked } from '../game/progress.ts'
import type { SaveData } from '../game/progress.ts'
import { Stars } from './Stars.tsx'
import { ColorGlyph } from './Glyph.tsx'
import { LockMark } from './Board.tsx'

interface LevelSelectProps {
  save: SaveData
  onPlay: (levelId: number) => void
  onBack: () => void
}

export function LevelSelect({ save, onPlay, onBack }: LevelSelectProps) {
  return (
    <main className="screen screen--levels">
      <header className="screen__head">
        <button type="button" className="button button--ghost" onClick={onBack}>
          ← Menu
        </button>
        <h1 className="screen__title">Levels</h1>
        <span className="screen__spacer" />
      </header>

      <ul className="level-grid">
        {LEVELS.map((level) => {
          const record = save.records[String(level.id)]
          const unlocked = isUnlocked(save, level.id)
          const target = paletteEntry(level.targetColor, level.theme)
          const style = { '--tile-color': target.hex, '--tile-shade': target.shade } as CSSProperties

          return (
            <li key={level.id}>
              <button
                type="button"
                className={`level-card${record ? ' is-done' : ''}${unlocked ? '' : ' is-locked'}`}
                style={style}
                disabled={!unlocked}
                onClick={() => onPlay(level.id)}
                aria-label={
                  unlocked
                    ? `Level ${level.id}, ${level.name}. Target colour ${target.name}. ` +
                      (record
                        ? `Cleared with ${record.stars} of 3 stars, best score ${record.bestScore}.`
                        : 'Not cleared yet.')
                    : `Level ${level.id} is locked. Clear level ${level.id - 1} first.`
                }
              >
                <span className="level-card__num">{level.id}</span>
                <span className="level-card__name">{unlocked ? level.name : 'Locked'}</span>
                {unlocked ? (
                  <>
                    <span className="level-card__palette" aria-hidden="true">
                      {level.colors.map((color) => (
                        <span
                          key={color}
                          className={`level-card__dot${color === level.targetColor ? ' is-target' : ''}`}
                          style={{ background: paletteEntry(color, level.theme).hex }}
                        />
                      ))}
                    </span>
                    <span className="level-card__meta">
                      <span className="level-card__target">
                        <ColorGlyph color={level.targetColor} />
                      </span>
                      {level.width}×{level.height} · {level.turnLimit} turns
                    </span>
                    <Stars earned={record?.stars ?? 0} />
                    {record?.flawless && (
                      <span className="level-card__badge" title="Cleared without undo">
                        flawless
                      </span>
                    )}
                  </>
                ) : (
                  <span className="level-card__lock" aria-hidden="true">
                    <LockMark size={20} />
                  </span>
                )}
              </button>
            </li>
          )
        })}
      </ul>
    </main>
  )
}
