import type { ColorId } from '../game/types.ts'
import { paletteEntry } from '../game/palette.ts'

export type GlyphShape =
  | 'circle'
  | 'triangle'
  | 'square'
  | 'diamond'
  | 'star'
  | 'plus'
  | 'hexagon'

/**
 * Colour-blind-safe shape marks, drawn rather than typed.
 *
 * Unicode glyphs (● ▲ ■ ◆ ★ …) render at very different optical weights at the
 * same font-size — and depend on whatever font happens to have them. These are
 * hand-sized inside a shared 24×24 box so every shape covers roughly the same
 * ink area, with the usual optical corrections: solid shapes (circle, square)
 * pulled in slightly, spiky ones (triangle, star) pushed out.
 */
const PATHS: Record<GlyphShape, string> = {
  // r = 7.6
  circle: 'M12 4.4a7.6 7.6 0 1 0 0 15.2 7.6 7.6 0 0 0 0-15.2z',
  // equilateral, side 21.5, slightly rounded tips
  triangle: 'M12 3.4 22.6 18.6H1.4z',
  // side 13.2
  square: 'M5.4 5.4h13.2v13.2H5.4z',
  // diagonal 20
  diamond: 'M12 2 22 12 12 22 2 12z',
  // outer r 11, inner r 4.4
  star: 'M12 1 14.59 8.44 22.46 8.6 16.18 13.36 18.47 20.9 12 16.4 5.53 20.9 7.82 13.36 1.54 8.6 9.41 8.44z',
  // arm span 20, thickness 5.6
  plus: 'M9.2 2h5.6v7.2H22v5.6h-7.2V22H9.2v-7.2H2V9.2h7.2z',
  // regular hexagon, r 8.4
  hexagon: 'M12 3.6 19.27 7.8v8.4L12 20.4 4.73 16.2V7.8z',
}

interface GlyphProps {
  shape: GlyphShape
  /** CSS length for the box; the shape scales with it. */
  size?: string | number
  className?: string
}

export function Glyph({ shape, size = '1em', className }: GlyphProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path d={PATHS[shape]} fill="currentColor" />
    </svg>
  )
}

/** Convenience wrapper: the mark for a palette colour. */
export function ColorGlyph({
  color,
  size,
  className,
}: {
  color: ColorId
  size?: string | number
  className?: string
}) {
  return <Glyph shape={paletteEntry(color).shape} size={size} className={className} />
}
