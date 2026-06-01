import { THEME_OPTIONS, type AppThemeId, THEME_PRESETS } from '../../theme/appThemes'

type ThemePickerProps = {
  value: AppThemeId
  onChange: (value: AppThemeId) => void
  disabled?: boolean
}

export function ThemePicker({ value, onChange, disabled }: ThemePickerProps) {
  return (
    <fieldset className="theme-picker" disabled={disabled}>
      <legend className="theme-picker__legend">Appearance</legend>
      <div className="theme-picker__grid">
        {THEME_OPTIONS.map((opt) => {
          const preset = THEME_PRESETS[opt.id]
          const active = value === opt.id
          return (
            <label
              key={opt.id}
              className={`theme-picker__option${active ? ' theme-picker__option--active' : ''}`}
            >
              <input
                type="radio"
                name="app-theme"
                value={opt.id}
                checked={active}
                onChange={() => onChange(opt.id)}
                disabled={disabled}
              />
              <span className="theme-picker__preview" aria-hidden>
                <span
                  className="theme-picker__preview-bar"
                  style={{ background: preset.css['--primary'] }}
                />
                <span
                  className="theme-picker__preview-body"
                  style={{
                    background: preset.css['--surface'],
                    borderColor: preset.css['--border'],
                  }}
                >
                  <span
                    className="theme-picker__preview-card"
                    style={{ background: preset.css['--card-bg'] }}
                  />
                  <span
                    className="theme-picker__preview-accent"
                    style={{ background: preset.css['--accent-green'] }}
                  />
                </span>
              </span>
              <span className="theme-picker__copy">
                <span className="theme-picker__label">{opt.label}</span>
                <span className="theme-picker__desc">{opt.description}</span>
              </span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
