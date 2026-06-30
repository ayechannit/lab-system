import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getAppLocale, LOCALE_OPTIONS, setAppLocale, type AppLocale } from '../../i18n'
import './header-theme-menu.css'

const LOCALE_ICONS: Record<AppLocale, string> = {
  en: 'language',
  my: 'translate',
}

export function HeaderLanguageMenu() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [locale, setLocale] = useState<AppLocale>(() => getAppLocale())
  const containerRef = useRef<HTMLDivElement>(null)

  const current = LOCALE_OPTIONS.find((opt) => opt.id === locale) ?? LOCALE_OPTIONS[0]

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
    if (open) setLocale(getAppLocale())
  }, [open])

  const selectLocale = (next: AppLocale) => {
    if (next === locale) {
      setOpen(false)
      return
    }
    setLocale(next)
    setOpen(false)
    void setAppLocale(next)
  }

  return (
    <div className="header-theme-menu" ref={containerRef}>
      <button
        type="button"
        className={`header-theme-menu__trigger${open ? ' header-theme-menu__trigger--open' : ''}`}
        aria-label={`${t('common.language')}: ${t(current.labelKey)}. ${t('theme.changeAppearance')}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="material-symbols-outlined header-theme-menu__icon" aria-hidden>
          {LOCALE_ICONS[locale]}
        </span>
        <span className="header-theme-menu__label">{t(current.labelKey)}</span>
        <span className="material-symbols-outlined header-theme-menu__chevron" aria-hidden>
          expand_more
        </span>
      </button>

      {open ? (
        <div className="header-theme-menu__dropdown" role="menu" aria-label={t('common.chooseLanguage')}>
          <ul className="header-theme-menu__list">
            {LOCALE_OPTIONS.map((opt) => {
              const active = opt.id === locale
              return (
                <li key={opt.id}>
                  <button
                    type="button"
                    role="menuitemradio"
                    aria-checked={active}
                    className={`header-theme-menu__option${active ? ' header-theme-menu__option--active' : ''}`}
                    onClick={() => selectLocale(opt.id)}
                  >
                    <span className="material-symbols-outlined header-theme-menu__icon" aria-hidden>
                      {LOCALE_ICONS[opt.id]}
                    </span>
                    <span className="header-theme-menu__option-label">{t(opt.labelKey)}</span>
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
