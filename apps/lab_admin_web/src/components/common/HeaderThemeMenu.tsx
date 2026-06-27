import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../../hooks/AuthContext'
import { useToast } from '../../hooks/ToastContext'
import { isApiMode } from '../../services/apiBase'
import { saveThemeMode } from '../../services/systemSettingService'
import {
  THEME_OPTIONS,
  THEME_PRESETS,
  applyAppTheme,
  getAppliedAppTheme,
  type AppThemeId,
} from '../../theme/appThemes'
import './header-theme-menu.css'

const THEME_ICONS: Record<AppThemeId, string> = {
  light: 'light_mode',
  dark: 'dark_mode',
  idhc: 'palette',
}

export function HeaderThemeMenu() {
  const { signedIn } = useAuth()
  const hasApi = isApiMode()
  const { showError } = useToast()
  const [open, setOpen] = useState(false)
  const [theme, setTheme] = useState<AppThemeId>(() => getAppliedAppTheme())
  const [saving, setSaving] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const current = THEME_OPTIONS.find((opt) => opt.id === theme) ?? THEME_OPTIONS[0]

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    if (open) setTheme(getAppliedAppTheme())
  }, [open])

  const selectTheme = (next: AppThemeId) => {
    if (next === theme) {
      setOpen(false)
      return
    }

    const previous = theme
    setTheme(next)
    applyAppTheme(next)
    setOpen(false)

    if (!hasApi || !signedIn) return

    setSaving(true)
    void (async () => {
      try {
        await saveThemeMode(next)
      } catch {
        applyAppTheme(previous)
        setTheme(previous)
        showError('Could not save theme.')
      } finally {
        setSaving(false)
      }
    })()
  }

  return (
    <div className="header-theme-menu" ref={containerRef}>
      <button
        type="button"
        className={`header-theme-menu__trigger${open ? ' header-theme-menu__trigger--open' : ''}`}
        aria-label={`Theme: ${current.label}. Change appearance.`}
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={saving}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="material-symbols-outlined header-theme-menu__icon" aria-hidden>
          {THEME_ICONS[theme]}
        </span>
        <span className="header-theme-menu__label">{current.label}</span>
        <span className="material-symbols-outlined header-theme-menu__chevron" aria-hidden>
          expand_more
        </span>
      </button>

      {open ? (
        <div className="header-theme-menu__dropdown" role="menu" aria-label="Choose theme">
          <ul className="header-theme-menu__list">
            {THEME_OPTIONS.map((opt) => {
              const active = opt.id === theme
              const preset = THEME_PRESETS[opt.id]
              return (
                <li key={opt.id}>
                  <button
                    type="button"
                    role="menuitemradio"
                    aria-checked={active}
                    className={`header-theme-menu__option${active ? ' header-theme-menu__option--active' : ''}`}
                    onClick={() => selectTheme(opt.id)}
                  >
                    <span className="header-theme-menu__swatch" aria-hidden>
                      <span
                        className="header-theme-menu__swatch-bar"
                        style={{ background: preset.css['--primary'] }}
                      />
                      <span
                        className="header-theme-menu__swatch-body"
                        style={{
                          background: preset.css['--surface'],
                          borderColor: preset.css['--border'],
                        }}
                      />
                    </span>
                    <span className="header-theme-menu__option-label">{opt.label}</span>
                    {active ? (
                      <span className="material-symbols-outlined header-theme-menu__check" aria-hidden>
                        check
                      </span>
                    ) : null}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
