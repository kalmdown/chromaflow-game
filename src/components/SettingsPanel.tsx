import type { Settings, TileMarks } from '../game/progress.ts'

const MARK_OPTIONS: readonly [TileMarks, string][] = [
  ['both', 'Symbols and textures'],
  ['symbols', 'Symbols only'],
  ['textures', 'Textures only'],
  ['none', 'Colour alone'],
]

interface SettingsPanelProps {
  settings: Settings
  onChange: (settings: Settings) => void
}

export function SettingsPanel({ settings, onChange }: SettingsPanelProps) {
  return (
    <div className="settings">
      <fieldset className="settings__row settings__row--group">
        <legend>
          <strong>Tile marks</strong>
          <small>Each colour carries its own glyph and surface pattern, so the board never relies on hue alone.</small>
        </legend>
        {MARK_OPTIONS.map(([value, label]) => (
          <label key={value} className="settings__radio">
            <input
              type="radio"
              name="tile-marks"
              value={value}
              checked={settings.tileMarks === value}
              onChange={() => onChange({ ...settings, tileMarks: value })}
            />
            <span>{label}</span>
          </label>
        ))}
      </fieldset>

      <fieldset className="settings__row settings__row--group">
        <legend>
          <strong>Motion</strong>
        </legend>
        {(
          [
            ['system', 'Match my system setting'],
            ['full', 'Full animation'],
            ['reduced', 'Reduced motion'],
          ] as const
        ).map(([value, label]) => (
          <label key={value} className="settings__radio">
            <input
              type="radio"
              name="motion"
              value={value}
              checked={settings.motion === value}
              onChange={() => onChange({ ...settings, motion: value })}
            />
            <span>{label}</span>
          </label>
        ))}
      </fieldset>
    </div>
  )
}
