import { describe, expect, it } from 'vitest'
import { THEMES } from '../palette.ts'

/** WCAG relative luminance of a `#rrggbb` string. */
function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16)
  const channel = (v: number) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  }
  return (
    0.2126 * channel((n >> 16) & 255) +
    0.7152 * channel((n >> 8) & 255) +
    0.0722 * channel(n & 255)
  )
}

function contrast(a: string, b: string): number {
  const la = luminance(a)
  const lb = luminance(b)
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

const ENTRIES = Object.values(THEMES).flatMap((theme) =>
  theme.colors.map((entry) => [theme.id, entry.name, entry] as const),
)

describe('palette contrast', () => {
  // A tile is a gradient from `hex` to `shade` and the glyph is drawn in `ink`
  // over it, so the mark has to clear the 3:1 floor for non-text contrast at
  // both ends — not just the lighter one.
  it.each(ENTRIES)('%s / %s draws its glyph at 3:1 or better', (_theme, _name, entry) => {
    expect(contrast(entry.ink, entry.hex)).toBeGreaterThanOrEqual(3)
    expect(contrast(entry.ink, entry.shade)).toBeGreaterThanOrEqual(3)
  })

  it('keeps every swatch name distinct within its theme', () => {
    for (const theme of Object.values(THEMES)) {
      const names = theme.colors.map((c) => c.name)
      expect(new Set(names).size).toBe(names.length)
    }
  })
})
