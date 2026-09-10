import { PALETTE } from '../game/palette.ts'

interface TitleScreenProps {
  onPlay: () => void
  onLevels: () => void
  onHowToPlay: () => void
  onResetProgress: () => void
  clearedCount: number
  totalLevels: number
  totalStars: number
  hasProgress: boolean
  continueLabel: string
}

export function TitleScreen({
  onPlay,
  onLevels,
  onHowToPlay,
  onResetProgress,
  clearedCount,
  totalLevels,
  totalStars,
  hasProgress,
  continueLabel,
}: TitleScreenProps) {
  return (
    <main className="screen screen--title">
      <div className="title-card card">
        <div className="title-drops" aria-hidden="true">
          {PALETTE.map((entry, i) => (
            <span
              key={entry.id}
              className="title-drops__drop"
              style={{ background: entry.hex, animationDelay: `${i * 90}ms` }}
            />
          ))}
        </div>

        <h1 className="title">
          Chroma<span className="title__accent">flow</span>
        </h1>
        <p className="title__tag">
          A turn-limited flood puzzle. Spread your colour across the board — and land on the right
          hue at the very end.
        </p>

        <div className="title__actions">
          <button type="button" className="button button--primary button--big" onClick={onPlay}>
            {continueLabel}
          </button>
          <button type="button" className="button" onClick={onLevels}>
            Level select
          </button>
          <button type="button" className="button" onClick={onHowToPlay}>
            How to play
          </button>
        </div>

        <p className="title__stats">
          {clearedCount} / {totalLevels} levels cleared · {totalStars} / {totalLevels * 3} stars
        </p>

        <button
          type="button"
          className="button button--ghost button--small"
          onClick={onResetProgress}
          disabled={!hasProgress}
        >
          Reset progress
        </button>
      </div>
    </main>
  )
}
