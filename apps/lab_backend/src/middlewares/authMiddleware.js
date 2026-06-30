const jwt = require('jsonwebtoken');
const { t } = require('../utils/i18n');

const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  const locale = req.locale || 'en';
  if (!token) return res.status(401).json({ message: t('errors.authRequired', locale) });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_default_secret');
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: t('errors.invalidToken', locale) });
  }
};

const roleMiddleware = (allowedRoles) => {
  return (req, res, next) => {
    const locale = req.locale || 'en';
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: t('errors.forbidden', locale) });
    }
    next();
  };
};

module.exports = { authMiddleware, roleMiddleware };
