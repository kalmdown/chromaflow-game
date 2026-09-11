import type { CSSProperties } from 'react'
import type { PaletteEntry } from '../game/palette.ts'
import type { TileMarks } from '../game/progress.ts'

/** The custom properties every tile-like surface (tile, swatch, legend) paints with. */
export function tileStyle(entry: PaletteEntry): CSSProperties {
  return {
    '--tile-color': entry.hex,
    '--tile-shade': entry.shade,
    '--tile-ink': entry.ink,
  } as CSSProperties
}

/** Value for `data-texture`, which the stylesheet turns into the overlay. */
export function textureOf(entry: PaletteEntry, marks: TileMarks): string | undefined {
  return marks === 'both' || marks === 'textures' ? entry.texture : undefined
}
