import { memo } from 'react'
import type { CSSProperties, MouseEvent } from 'react'
import { paletteEntry } from '../game/palette.ts'
import { ColorGlyph } from './Glyph.tsx'
import { isAbsorbable } from '../game/board.ts'
import type { BoardState, ColorId, Tile } from '../game/types.ts'

interface BoardProps {
  board: BoardState
  showSymbols: boolean
  /** Indices absorbed by the latest move — they get the pop animation. */
  justAbsorbed: number[]
  shuffling: boolean
  disabled: boolean
  /** Tapping a tile plays that tile's colour. */
  onPick: (color: ColorId) => void
}

export const Board = memo(function Board({
  board,
  showSymbols,
  justAbsorbed,
  shuffling,
  disabled,
  onPick,
}: BoardProps) {
  const fresh = new Set(justAbsorbed)

  // Click handling is delegated to the grid rather than put on 64–121 buttons:
  // the palette is the keyboard/screen-reader path, so the tiles stay out of
  // the tab order and out of the accessibility tree entirely.
  const handleClick = (event: MouseEvent<HTMLDivElement>) => {
    if (disabled) return
    const hit = (event.target as HTMLElement).closest<HTMLElement>('[data-pick]')
    if (!hit) return
    onPick(Number(hit.dataset.pick) as ColorId)
  }

  return (
    <div
      className={`board${shuffling ? ' board--shuffling' : ''}`}
      style={{
        gridTemplateColumns: `repeat(${board.width}, 1fr)`,
        aspectRatio: `${board.width} / ${board.height}`,
      }}
      role="img"
      aria-label={describeBoard(board)}
      onClick={handleClick}
    >
      {board.tiles.map((tile, index) => (
        <TileView
          key={index}
          tile={tile}
          isOrigin={index === 0}
          fresh={fresh.has(index)}
          showSymbols={showSymbols}
          // A tile is a shortcut to its own colour, unless picking it would be
          // a no-op (already the owned colour) or it is unreachable.
          pickable={!disabled && !tile.owned && isAbsorbable(tile) && tile.color !== board.ownedColor}
        />
      ))}
    </div>
  )
})

interface TileProps {
  tile: Tile
  isOrigin: boolean
  fresh: boolean
  showSymbols: boolean
  pickable: boolean
}

function TileView({ tile, isOrigin, fresh, showSymbols, pickable }: TileProps) {
  if (tile.kind === 'void') return <div className="tile tile--void" aria-hidden="true" />

  const locked = tile.kind === 'lock' && tile.locked === true
  const entry = paletteEntry(tile.color)
  const classes = ['tile', `tile--${tile.kind}`]
  if (tile.owned) classes.push('is-owned')
  if (locked) classes.push('is-locked')
  // A tile is only ever absorbed once, so adding the class is enough to run
  // the pop animation exactly once — no re-keying needed.
  if (fresh) classes.push('is-fresh')
  if (isOrigin) classes.push('is-origin')
  if (pickable) classes.push('is-pickable')

  const style: CSSProperties | undefined = locked
    ? undefined
    : ({
        '--tile-color': entry.hex,
        '--tile-shade': entry.shade,
        '--tile-ink': entry.ink,
      } as CSSProperties)

  return (
    <div className={classes.join(' ')} style={style} data-pick={pickable ? tile.color : undefined}>
      <span className="tile__face">
        {locked ? (
          <span className="tile__glyph tile__glyph--lock">
            <LockMark />
            {groupBadge(tile.group)}
          </span>
        ) : (
          <>
            {showSymbols && (
              <span className="tile__glyph">
                <ColorGlyph color={tile.color} />
              </span>
            )}
            {tile.kind === 'key' && !tile.triggered && (
              <span className="tile__badge">
                <KeyMark />
                {groupBadge(tile.group)}
              </span>
            )}
            {tile.kind === 'lock' && !tile.owned && (
              <span className="tile__badge">
                <OpenLockMark />
                {groupBadge(tile.group)}
              </span>
            )}
            {tile.kind === 'shuffle' && !tile.triggered && (
              <span className="tile__badge tile__badge--shuffle">
                <ShuffleMark />
              </span>
            )}
          </>
        )}
      </span>
    </div>
  )
}

function groupBadge(group: number | undefined) {
  return group === undefined ? null : <span className="tile__group">{group}</span>
}

/* Tile marks are drawn inline so the game ships with no image assets. */

export function KeyMark({ size = 14 }: { size?: number }) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} aria-hidden="true" focusable="false">
      <circle cx="5.5" cy="5.5" r="3.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M7.8 7.8 L13.5 13.5 M11.4 11.4 L12.9 9.9 M12.9 12.9 L14.2 11.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function LockMark({ size = 14 }: { size?: number }) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} aria-hidden="true" focusable="false">
      <rect x="3" y="7" width="10" height="7" rx="1.6" fill="currentColor" />
      <path
        d="M5.4 7V5.2a2.6 2.6 0 0 1 5.2 0V7"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
      />
    </svg>
  )
}

export function OpenLockMark({ size = 14 }: { size?: number }) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} aria-hidden="true" focusable="false">
      <rect x="3" y="7" width="10" height="7" rx="1.6" fill="currentColor" opacity="0.85" />
      <path
        d="M5.4 7V5.2a2.6 2.6 0 0 1 5.2 -0.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function ShuffleMark({ size = 15 }: { size?: number }) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} aria-hidden="true" focusable="false">
      <path
        d="M1.5 4.5h3.2l5.6 7h3.2M1.5 11.5h3.2l5.6-7h3.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path d="M12 2.6 14.6 4.5 12 6.4z M12 9.6 14.6 11.5 12 13.4z" fill="currentColor" />
    </svg>
  )
}

/**
 * Screen-reader summary of the position. The tile mosaic is decorative detail;
 * what matters non-visually is how much is left and what it is made of.
 */
function describeBoard(board: BoardState): string {
  let owned = 0
  let left = 0
  let locked = 0
  const counts = new Map<ColorId, number>()
  for (const tile of board.tiles) {
    if (tile.kind === 'void') continue
    if (tile.owned) {
      owned++
      continue
    }
    left++
    if (tile.kind === 'lock' && tile.locked) locked++
    else counts.set(tile.color, (counts.get(tile.color) ?? 0) + 1)
  }
  const breakdown = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([color, count]) => `${count} ${paletteEntry(color).name}`)
    .join(', ')
  const lockNote = locked > 0 ? `, ${locked} still locked` : ''
  return `Board: ${owned} tiles in your flow, ${left} remaining${breakdown ? ` (${breakdown})` : ''}${lockNote}.`
}
