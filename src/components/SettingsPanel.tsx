import type { Settings } from '../game/progress.ts'

interface SettingsPanelProps {
  settings: Settings
  onChange: (settings: Settings) => void
}

export function SettingsPanel({ settings, onChange }: SettingsPanelProps) {
  return (
    <div className="settings">
      <label className="settings__row">
        <input
          type="checkbox"
          checked={settings.showSymbols}
          onChange={(event) => onChange({ ...settings, showSymbols: event.target.checked })}
        />
        <span>
          <strong>Colour symbols on tiles</strong>
          <small>Each colour carries its own glyph, so the board never relies on hue alone.</small>
        </span>
      </label>

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
