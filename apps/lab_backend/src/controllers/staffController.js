const bcrypt = require('bcryptjs');
const Staff = require('../models/staffModel');
const Permission = require('../models/permissionModel');

const STAFF_CODE_PATTERN = /^[A-Za-z0-9._-]{1,50}$/;

function sameId(a, b) {
  return String(a).replace(/[{}]/g, '').toLowerCase() === String(b).replace(/[{}]/g, '').toLowerCase();
}

/**
 * Staff sign in with an email or a staff code, so at least one is required.
 * Returns an error message, or null when valid. `excludeId` skips the row being edited.
 */
async function validateLoginIds(email, staffCode, excludeId = null) {
  if (!email && !staffCode) return 'Email or staff code is required';
  if (email && !email.includes('@')) return 'Enter a valid email';
  if (staffCode && !STAFF_CODE_PATTERN.test(staffCode)) {
    return 'Staff code may only contain letters, numbers, dots, dashes and underscores';
  }
  if (email) {
    const hit = await Staff.getByEmail(email);
    if (hit && !(excludeId && sameId(hit.id, excludeId))) return 'Email already exists';
  }
  if (staffCode) {
    const hit = await Staff.getByStaffCode(staffCode);
    if (hit && !(excludeId && sameId(hit.id, excludeId))) return 'Staff code already exists';
  }
  return null;
}

function isUniqueViolation(error) {
  return error.code === '23505' || String(error.message).includes('UNIQUE KEY');
}

const getAllStaff = async (req, res) => {
  try {
    const staff = await Staff.getAll(req.query);
    res.json(staff);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getStaffById = async (req, res) => {
  try {
    const staff = await Staff.getById(req.params.id);
    if (!staff) return res.status(404).json({ message: 'Staff not found' });
    res.json(staff);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const createStaff = async (req, res) => {
  try {
    const { name, role, password, password_hash, is_active } = req.body;
    const email = Staff.normalizeEmail(req.body.email);
    const staff_code = Staff.normalizeStaffCode(req.body.staff_code);

    if (!name || !role || (!password && !password_hash)) {
      return res.status(400).json({ message: 'name, role, and password are required' });
    }

    const idError = await validateLoginIds(email, staff_code);
    if (idError) return res.status(400).json({ message: idError });

    const staffData = { name, email, staff_code, role, password, password_hash, is_active };
    const staff = await Staff.create(staffData, req.user?.id);
    res.status(201).json(staff);
  } catch (error) {
    if (isUniqueViolation(error)) {
      return res.status(400).json({ message: 'Email or staff code already exists' });
    }
    res.status(500).json({ error: error.message });
  }
};

const updateStaff = async (req, res) => {
  try {
    if (req.user.type !== 'staff') {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const targetId = req.params.id;
    const selfId = req.user.id;
    const canManageStaff = await Permission.isRoleAllowed(req.user.role, 'staff');
    const same = sameId(targetId, selfId);
    if (!same && !canManageStaff) {
      return res.status(403).json({ message: 'You can only update your own profile' });
    }

    const existing = await Staff.getById(targetId);
    if (!existing) return res.status(404).json({ message: 'Staff not found' });

    let { name, is_active, password, password_hash, email, staff_code, current_password } = req.body;

    if (name == null || String(name).trim() === '') {
      return res.status(400).json({ message: 'name is required' });
    }

    if (is_active === undefined || is_active === null) {
      is_active = existing.is_active;
    }

    if (same && !canManageStaff) {
      is_active = existing.is_active;
    }

    const newPassword = password || password_hash;
    if (same && newPassword) {
      if (!current_password) {
        return res.status(400).json({ message: 'Current password is required to change your password.' });
      }
      const currentHash = await Staff.getPasswordHash(targetId);
      const matches = currentHash && (await bcrypt.compare(current_password, currentHash));
      if (!matches) {
        return res.status(400).json({ message: 'Current password is incorrect.' });
      }
    }

    // Staff codes are assigned by staff managers; self-service edits keep the current code.
    if (!canManageStaff) staff_code = undefined;

    // `undefined` keeps the stored value; validate the resulting email / staff code pair.
    const nextEmail = email !== undefined ? Staff.normalizeEmail(email) : Staff.normalizeEmail(existing.email);
    const nextStaffCode =
      staff_code !== undefined ? Staff.normalizeStaffCode(staff_code) : Staff.normalizeStaffCode(existing.staff_code);
    const idError = await validateLoginIds(nextEmail, nextStaffCode, targetId);
    if (idError) return res.status(400).json({ message: idError });

    const updateData = { name, is_active, password, password_hash, email, staff_code };
    const staff = await Staff.update(targetId, updateData, req.user?.id);
    if (!staff) return res.status(404).json({ message: 'Staff not found' });
    res.json(staff);
  } catch (error) {
    if (isUniqueViolation(error)) {
      return res.status(400).json({ message: 'Email or staff code already exists' });
    }
    res.status(500).json({ error: error.message });
  }
};

const deleteStaff = async (req, res) => {
  try {
    if (req.user?.id && req.params.id === req.user.id) {
      return res.status(403).json({ message: 'You cannot delete your own account' });
    }
    const success = await Staff.delete(req.params.id, req.user?.id);
    if (!success) return res.status(404).json({ message: 'Staff not found' });
    res.json({ message: 'Staff deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const uploadProfileImage = async (req, res) => {
  try {
    const targetId = req.params.id;
    const selfId = req.user?.id;
    const canManageStaff = req.user ? await Permission.isRoleAllowed(req.user.role, 'staff') : false;

    const staff = await Staff.getById(targetId);
    if (!staff) {
      return res.status(404).json({ message: 'Staff member not found' });
    }

    const same =
      String(targetId).replace(/[{}]/g, '').toLowerCase() ===
      String(selfId).replace(/[{}]/g, '').toLowerCase();

    if (!same && !canManageStaff) {
      return res.status(403).json({ message: 'You can only upload a profile image for your own account' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No image file uploaded' });
    }

    const StorageService = require('../utils/storageService');
    const fileKey = await StorageService.uploadFile(req.file, 'profiles');
    const fileUrl = (await StorageService.getFileUrl(fileKey)) || fileKey;

    const updatedStaff = await Staff.updateProfileImage(targetId, fileUrl, selfId);

    res.json({
      message: 'Profile image uploaded successfully',
      staff: updatedStaff
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getAllStaff,
  getStaffById,
  createStaff,
  updateStaff,
  deleteStaff,
  uploadProfileImage
};
