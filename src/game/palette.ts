import type { ColorId } from './types.ts'

/** Shape mark for a colour slot; drawn by `components/Glyph.tsx`. */
export type GlyphShape =
  | 'circle'
  | 'triangle'
  | 'square'
  | 'diamond'
  | 'star'
  | 'plus'
  | 'hexagon'

/**
 * Transparent surface pattern laid over a tile. Like the glyph it is keyed to
 * the colour *slot*, not the hue, so a slot reads the same across themes even
 * where two hues in one theme sit close together.
 */
export type Texture = 'stripes' | 'dots' | 'grid' | 'lines' | 'checks' | 'columns' | 'rings'

export interface PaletteEntry {
  id: ColorId
  /** Accessible name, also used as the button label. */
  name: string
  /** Shape mark so the tiles never rely on colour alone. */
  shape: GlyphShape
  texture: Texture
  hex: string
  /** Slightly darker shade used for the tile's inner bevel. */
  shade: string
  /** Text colour that stays readable on `hex`. */
  ink: string
}

/**
 * Every level picks a theme whose hues suit its name: the water levels play
 * in sea colours, the key-and-lock levels in metals, the shuffle levels in
 * neon. Each theme carries seven hues in slot order; a five-colour level uses
 * the first five.
 */
export type ThemeId =
  | 'spectrum'
  | 'tide'
  | 'reservoir'
  | 'canyon'
  | 'atoll'
  | 'dunes'
  | 'forge'
  | 'signal'

export interface Theme {
  id: ThemeId
  name: string
  colors: readonly PaletteEntry[]
  /** The two background glows behind the play screen. */
  glow: [string, string]
}

/** Slot marks — shared by every theme so a slot is recognisable anywhere. */
const SHAPES: readonly GlyphShape[] = [
  'circle',
  'triangle',
  'square',
  'diamond',
  'star',
  'plus',
  'hexagon',
]
const TEXTURES: readonly Texture[] = [
  'stripes',
  'dots',
  'grid',
  'lines',
  'checks',
  'columns',
  'rings',
]

type Swatch = [name: string, hex: string]

function theme(id: ThemeId, name: string, glow: [string, string], swatches: Swatch[]): Theme {
  return {
    id,
    name,
    glow,
    colors: swatches.map(([label, hex], slot) => {
      const color = slot as ColorId
      return {
        id: color,
        name: label,
        shape: SHAPES[slot],
        texture: TEXTURES[slot],
        hex,
        shade: shift(hex, -0.15, -0.1),
        ink: ink(hex),
      }
    }),
  }
}

export const THEMES: Record<ThemeId, Theme> = {
  // The original seven, chosen to stay distinguishable for the common forms
  // of colour-vision deficiency. Reserved for the finale.
  spectrum: theme('spectrum', 'Spectrum', ['#1b2c63', '#3a1a5a'], [
    ['Ruby', '#f2506e'],
    ['Amber', '#ffb02e'],
    ['Lime', '#7ede4b'],
    ['Teal', '#2fd5c8'],
    ['Indigo', '#7c8cff'],
    ['Orchid', '#d778ff'],
    ['Sand', '#f2e3a3'],
  ]),
  // Open sea: bright, sunlit.
  tide: theme('tide', 'Tide', ['#123f6e', '#0f4a52'], [
    ['Coral', '#ff7b6e'],
    ['Sunlight', '#ffd25f'],
    ['Seafoam', '#6fe6b0'],
    ['Aqua', '#38c6ec'],
    ['Deep', '#4a6de8'],
    ['Kelp', '#a3bd4e'],
    ['Foam', '#e8f3ff'],
  ]),
  // Still water held behind stone: the same family, dustier.
  reservoir: theme('reservoir', 'Reservoir', ['#1c3550', '#2b2550'], [
    ['Brick', '#d96a5c'],
    ['Straw', '#e6c25a'],
    ['Reed', '#8fbe62'],
    ['Pool', '#45b8c9'],
    ['Slate', '#5f7ad9'],
    ['Lilac', '#b48ad9'],
    ['Mist', '#dfe6ee'],
  ]),
  // A river cutting through rock.
  canyon: theme('canyon', 'Canyon', ['#5a2a1e', '#1f3a4a'], [
    ['Terracotta', '#e2704f'],
    ['Sandstone', '#efc46a'],
    ['Sage', '#9ccf7a'],
    ['River', '#3ec4d4'],
    ['Twilight', '#6a6fdc'],
    ['Bloom', '#e07ad1'],
    ['Limestone', '#f0e6c8'],
  ]),
  // Tropical shallows.
  atoll: theme('atoll', 'Atoll', ['#0f4f5c', '#5a1f4a'], [
    ['Hibiscus', '#ff5f8a'],
    ['Mango', '#ffb54a'],
    ['Palm', '#6cdc6a'],
    ['Lagoon', '#2fe0d8'],
    ['Reef', '#4d8bff'],
    ['Orchid', '#cf7dff'],
    ['Shell', '#fbe8d0'],
  ]),
  // Sand running out at dusk.
  dunes: theme('dunes', 'Dunes', ['#5c3320', '#2c1f52'], [
    ['Sunset', '#f0655a'],
    ['Sand', '#f2c86b'],
    ['Scrub', '#a9c85c'],
    ['Oasis', '#3fc9b8'],
    ['Dusk', '#7a6fe0'],
    ['Rose', '#e58ad0'],
    ['Bone', '#f3ead6'],
  ]),
  // Metals, for the keys and locks.
  forge: theme('forge', 'Forge', ['#4a2418', '#1c2a40'], [
    ['Rust', '#e26b4b'],
    ['Brass', '#e6b93f'],
    ['Verdigris', '#5fc99a'],
    ['Steel', '#6fb5e6'],
    ['Cobalt', '#6f74ea'],
    ['Rose gold', '#e88fb0'],
    ['Silver', '#dfe4ec'],
  ]),
  // Neon and noise, for the shuffle levels.
  signal: theme('signal', 'Signal', ['#3b0f4f', '#0c3a45'], [
    ['Hot pink', '#ff4fa8'],
    ['Volt', '#f2ec3f'],
    ['Acid', '#7cf65a'],
    ['Cyan', '#3ff0ff'],
    ['Ultraviolet', '#8f6bff'],
    ['Tangerine', '#ff8b3d'],
    ['Static', '#e7ebf5'],
  ]),
}

export const DEFAULT_THEME: ThemeId = 'spectrum'

/** The finale palette — also what screens outside any level show. */
export const PALETTE: readonly PaletteEntry[] = THEMES[DEFAULT_THEME].colors

export function getTheme(id: ThemeId = DEFAULT_THEME): Theme {
  return THEMES[id]
}

export function paletteEntry(id: ColorId, themeId: ThemeId = DEFAULT_THEME): PaletteEntry {
  return THEMES[themeId].colors[id]
}

export function colorName(id: ColorId, themeId: ThemeId = DEFAULT_THEME): string {
  return paletteEntry(id, themeId).name
}

// ---------------------------------------------------------------- colour ---

/** A darker, slightly duller version of `hex` for the tile bevel. */
function shift(hex: string, lightness: number, saturation: number): string {
  const [h, s, l] = toHsl(hex)
  return toHex(h, clamp(s + saturation), clamp(l + lightness))
}

/** Near-black in the same hue, so glyph and label stay readable on the tile. */
function ink(hex: string): string {
  const [h, s] = toHsl(hex)
  return toHex(h, clamp(Math.min(s, 0.8)), 0.11)
}

function clamp(v: number): number {
  return Math.min(1, Math.max(0, v))
}

function toHsl(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16)
  const r = ((n >> 16) & 255) / 255
  const g = ((n >> 8) & 255) / 255
  const b = (n & 255) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return [0, 0, l]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h: number
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0)
  else if (max === g) h = (b - r) / d + 2
  else h = (r - g) / d + 4
  return [h / 6, s, l]
}

function toHex(h: number, s: number, l: number): string {
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  const channel = (t: number) => {
    if (t < 0) t += 1
    if (t > 1) t -= 1
    if (t < 1 / 6) return p + (q - p) * 6 * t
    if (t < 1 / 2) return q
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
    return p
  }
  const to2 = (v: number) =>
    Math.round(v * 255)
      .toString(16)
      .padStart(2, '0')
  return `#${to2(channel(h + 1 / 3))}${to2(channel(h))}${to2(channel(h - 1 / 3))}`
}
