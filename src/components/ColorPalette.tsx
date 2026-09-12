import { paletteEntry } from '../game/palette.ts'
import type { ThemeId } from '../game/palette.ts'
import { ColorGlyph } from './Glyph.tsx'
import { textureOf, tileStyle } from './tileStyle.ts'
import type { BoardState, ColorId } from '../game/types.ts'
import type { TileMarks } from '../game/progress.ts'
import { countAvailableColor } from '../game/board.ts'

interface ColorPaletteProps {
  colors: ColorId[]
  theme: ThemeId
  marks: TileMarks
  board: BoardState
  targetColor: ColorId
  disabled: boolean
  onPick: (color: ColorId) => void
}

export function ColorPalette({
  colors,
  theme,
  marks,
  board,
  targetColor,
  disabled,
  onPick,
}: ColorPaletteProps) {
  return (
    <div className="palette" role="group" aria-label="Choose a colour">
      {colors.map((color, index) => {
        const entry = paletteEntry(color, theme)
        const isCurrent = color === board.ownedColor
        const remaining = countAvailableColor(board, color)
        const isTarget = color === targetColor

        return (
          <button
            key={color}
            type="button"
            className={`swatch${isCurrent ? ' is-current' : ''}${isTarget ? ' is-target' : ''}`}
            style={tileStyle(entry)}
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
            {/* Both states ride the top border rather than the row, so a long
                colour name keeps the full width of the pill to itself. */}
            {(isCurrent || isTarget) && (
              <span className="swatch__tags" aria-hidden="true">
                {isCurrent && <span className="swatch__tag swatch__tag--current">current</span>}
                {isTarget && <span className="swatch__tag swatch__tag--target">target</span>}
              </span>
            )}
            {/* The texture rides the glyph chip, the one part still painted in the
                raw hue — over the pill it would sit behind the label. */}
            <span className="swatch__glyph" data-texture={textureOf(entry, marks)}>
              <ColorGlyph color={color} />
            </span>
            <span className="swatch__name">{entry.name}</span>
            {/* The current colour has nothing to pick, so its count would only
                name tiles this turn cannot reach. */}
            {!isCurrent && (
              <span className="swatch__count" aria-hidden="true">
                {remaining}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
