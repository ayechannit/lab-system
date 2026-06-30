const { resolveLocale } = require('../utils/i18n')

function localeMiddleware(req, res, next) {
  req.locale = resolveLocale(req.headers['accept-language'])
  next()
}

module.exports = localeMiddleware
