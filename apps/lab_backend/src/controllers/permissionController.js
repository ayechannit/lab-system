const Permission = require('../models/permissionModel');

const getPermissionMatrix = async (req, res) => {
  try {
    const matrix = await Permission.getMatrix();
    res.json({ modules: Permission.MODULES, roles: Permission.CONFIGURABLE_ROLES, matrix });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updatePermissionMatrix = async (req, res) => {
  try {
    const { entries } = req.body;
    if (!Array.isArray(entries)) {
      return res.status(400).json({ message: 'entries must be an array of { role, module_key, is_allowed }' });
    }
    const matrix = await Permission.setMatrix(entries, req.user?.id);
    res.json({ modules: Permission.MODULES, roles: Permission.CONFIGURABLE_ROLES, matrix });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getMyPermissions = async (req, res) => {
  try {
    if (req.user?.type !== 'staff') {
      return res.json({ modules: [] });
    }
    const modules = await Permission.getAllowedModulesForRole(req.user.role);
    res.json({ modules });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getPermissionMatrix,
  updatePermissionMatrix,
  getMyPermissions,
};
