const en = require('../locales/en.json')
const my = require('../locales/my.json')

const catalogs = { en, my }

function resolveLocale(acceptLanguage) {
  if (!acceptLanguage || typeof acceptLanguage !== 'string') return 'en'
  const primary = acceptLanguage.split(',')[0].trim().toLowerCase()
  if (primary.startsWith('my')) return 'my'
  return 'en'
}

function lookup(catalog, key) {
  return key.split('.').reduce((value, part) => (value && value[part] != null ? value[part] : undefined), catalog)
}

function t(key, locale = 'en', params = {}) {
  const catalog = catalogs[locale] || catalogs.en
  let message = lookup(catalog, key) ?? lookup(catalogs.en, key) ?? key
  if (typeof message !== 'string') return key
  for (const [name, value] of Object.entries(params)) {
    message = message.replace(new RegExp(`{{${name}}}`, 'g'), String(value))
  }
  return message
}

module.exports = { resolveLocale, t, catalogs }
