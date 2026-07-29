const jwt = require('jsonwebtoken');
const { t } = require('../utils/i18n');
const Permission = require('../models/permissionModel');

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

/**
 * Gates a staff-management route behind the admin-configurable `role_permissions` matrix
 * (see permissionModel.js). `admin` always passes. Only ever apply this to routes that are
 * exclusively staff-facing management actions — never to endpoints the mobile app's end-users
 * (type 'user') also rely on for self-service, since they have no role in this matrix.
 */
const modulePermission = (moduleKey) => {
  return async (req, res, next) => {
    const locale = req.locale || 'en';
    if (!req.user || req.user.type !== 'staff') {
      return res.status(403).json({ message: t('errors.forbidden', locale) });
    }
    try {
      const allowed = await Permission.isRoleAllowed(req.user.role, moduleKey);
      if (!allowed) {
        return res.status(403).json({ message: t('errors.forbidden', locale) });
      }
      next();
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };
};

module.exports = { authMiddleware, roleMiddleware, modulePermission };
