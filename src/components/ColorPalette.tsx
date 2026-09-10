import type { CSSProperties } from 'react'
import { paletteEntry } from '../game/palette.ts'
import { ColorGlyph } from './Glyph.tsx'
import type { BoardState, ColorId } from '../game/types.ts'
import { countAvailableColor } from '../game/board.ts'

interface ColorPaletteProps {
  colors: ColorId[]
  board: BoardState
  targetColor: ColorId
  disabled: boolean
  onPick: (color: ColorId) => void
}

export function ColorPalette({
  colors,
  board,
  targetColor,
  disabled,
  onPick,
}: ColorPaletteProps) {
  return (
    <div className="palette" role="group" aria-label="Choose a colour">
      {colors.map((color, index) => {
        const entry = paletteEntry(color)
        const isCurrent = color === board.ownedColor
        const remaining = countAvailableColor(board, color)
        const isTarget = color === targetColor
        const style = {
          '--tile-color': entry.hex,
          '--tile-shade': entry.shade,
          '--tile-ink': entry.ink,
        } as CSSProperties

        return (
          <button
            key={color}
            type="button"
            className={`swatch${isCurrent ? ' is-current' : ''}${isTarget ? ' is-target' : ''}`}
            style={style}
            disabled={disabled || isCurrent}
            onClick={() => onPick(color)}
            aria-keyshortcuts={String(index + 1)}
            aria-label={
              `${entry.name}${isTarget ? ', target colour' : ''}. ` +
              (isCurrent
                ? 'Your flow is already this colour.'
                : `${remaining} tile${remaining === 1 ? '' : 's'} reachable. Press ${index + 1}.`)
            }
          >
            <span className="swatch__key" aria-hidden="true">
              {index + 1}
            </span>
            <span className="swatch__glyph">
              <ColorGlyph color={color} />
            </span>
            <span className="swatch__name">{entry.name}</span>
            <span className="swatch__count" aria-hidden="true">
              {isCurrent ? 'current' : remaining}
            </span>
          </button>
        )
      })}
    </div>
  )
}
