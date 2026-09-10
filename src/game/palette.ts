import type { GlyphShape } from '../components/Glyph.tsx'
import type { ColorId } from './types.ts'

export interface PaletteEntry {
  id: ColorId
  /** Accessible name, also used as the button label. */
  name: string
  /** Shape mark so the tiles never rely on colour alone. */
  shape: GlyphShape
  hex: string
  /** Slightly darker shade used for the tile's inner bevel. */
  shade: string
  /** Text colour that stays readable on `hex`. */
  ink: string
}

/**
 * Seven vivid hues, chosen to stay distinguishable for the common forms of
 * colour-vision deficiency; each one also carries a distinct glyph.
 */
export const PALETTE: readonly PaletteEntry[] = [
  { id: 0, name: 'Ruby', shape: 'circle', hex: '#f2506e', shade: '#c62f4c', ink: '#2a0710' },
  { id: 1, name: 'Amber', shape: 'triangle', hex: '#ffb02e', shade: '#d98a11', ink: '#3a2400' },
  { id: 2, name: 'Lime', shape: 'square', hex: '#7ede4b', shade: '#4fb420', ink: '#0e2c04' },
  { id: 3, name: 'Teal', shape: 'diamond', hex: '#2fd5c8', shade: '#12a89c', ink: '#032a27' },
  { id: 4, name: 'Indigo', shape: 'star', hex: '#7c8cff', shade: '#4f5fdb', ink: '#0a0f3a' },
  { id: 5, name: 'Orchid', shape: 'plus', hex: '#d778ff', shade: '#a94ad1', ink: '#2b0838' },
  { id: 6, name: 'Sand', shape: 'hexagon', hex: '#f2e3a3', shade: '#c8b76a', ink: '#332c0d' },
]

export function paletteEntry(id: ColorId): PaletteEntry {
  return PALETTE[id]
}

export function colorName(id: ColorId): string {
  return PALETTE[id].name
}
