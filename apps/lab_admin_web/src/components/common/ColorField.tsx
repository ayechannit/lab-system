import { normalizeHexColor } from '../../services/systemSettingService'

type ColorFieldProps = {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  fallback?: string
}

export function ColorField({
  id,
  label,
  value,
  onChange,
  disabled = false,
  fallback = '#000000',
}: ColorFieldProps) {
  const swatchColor = normalizeHexColor(value, fallback)

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="color-field">
        <label className="color-field__swatch-wrap" htmlFor={`${id}-picker`}>
          <span className="color-field__swatch" style={{ backgroundColor: swatchColor }} aria-hidden />
          <input
            id={`${id}-picker`}
            type="color"
            className="color-field__picker"
            value={swatchColor}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            tabIndex={-1}
            aria-label={`${label} picker`}
          />
        </label>
        <input
          id={id}
          type="text"
          className="color-field__hex"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => onChange(normalizeHexColor(value, fallback))}
          disabled={disabled}
          spellCheck={false}
          autoComplete="off"
          placeholder={fallback}
        />
      </div>
    </div>
  )
}
