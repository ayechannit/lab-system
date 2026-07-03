import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from '../locales/en.json'
import my from '../locales/my.json'

export type AppLocale = 'en' | 'my'

const LOCALE_KEY = 'admin-locale'

export const LOCALE_OPTIONS: { id: AppLocale; labelKey: string }[] = [
  { id: 'en', labelKey: 'common.english' },
  { id: 'my', labelKey: 'common.myanmar' },
]

function readInitialLocale(): AppLocale {
  try {
    const saved = window.localStorage.getItem(LOCALE_KEY)
    if (saved === 'en' || saved === 'my') return saved
  } catch {
    /* ignore */
  }
  if (typeof navigator !== 'undefined' && navigator.language.toLowerCase().startsWith('my')) {
    return 'my'
  }
  return 'my'
}

function applyDocumentLang(locale: AppLocale) {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = locale
  }
}

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    my: { translation: my },
  },
  lng: readInitialLocale(),
  fallbackLng: 'en',
  supportedLngs: ['en', 'my'],
  nonExplicitSupportedLngs: true,
  load: 'languageOnly',
  interpolation: { escapeValue: false },
})

applyDocumentLang(getAppLocale())

export function getAppLocale(): AppLocale {
  return i18n.language.toLowerCase().startsWith('my') ? 'my' : 'en'
}

/** BCP 47 tag for Intl date/time formatting */
export function getIntlLocale(): string {
  return getAppLocale() === 'my' ? 'my-MM' : 'en'
}

export async function setAppLocale(locale: AppLocale): Promise<void> {
  try {
    window.localStorage.setItem(LOCALE_KEY, locale)
  } catch {
    /* ignore */
  }
  applyDocumentLang(locale)
  await i18n.changeLanguage(locale)
}

export default i18n
