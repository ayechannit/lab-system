const Staff = require('../models/staffModel');

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
    const { name, email, role, password, password_hash, is_active } = req.body;
    
    if (!name || !email || !role || (!password && !password_hash)) {
      return res.status(400).json({ message: 'name, email, role, and password are required' });
    }

    const staffData = { name, email, role, password, password_hash, is_active };
    const staff = await Staff.create(staffData, req.user?.id);
    res.status(201).json(staff);
  } catch (error) {
    if (error.message.includes('UNIQUE KEY')) {
      return res.status(400).json({ message: 'Email already exists' });
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
    const isAdmin = req.user.role === 'admin';
    const same =
      String(targetId).replace(/[{}]/g, '').toLowerCase() ===
      String(selfId).replace(/[{}]/g, '').toLowerCase();
    if (!same && !isAdmin) {
      return res.status(403).json({ message: 'You can only update your own profile' });
    }

    const existing = await Staff.getById(targetId);
    if (!existing) return res.status(404).json({ message: 'Staff not found' });

    let { name, is_active, password, password_hash, email } = req.body;

    if (name == null || String(name).trim() === '') {
      return res.status(400).json({ message: 'name is required' });
    }

    if (is_active === undefined || is_active === null) {
      is_active = existing.is_active;
    }

    if (same && !isAdmin) {
      is_active = existing.is_active;
    }

    if (email !== undefined && email !== null && String(email).trim() !== '') {
      const em = String(email).trim().toLowerCase();
      const prev = String(existing.email || '').toLowerCase();
      if (em !== prev) {
        const collision = await Staff.getByEmail(em);
        if (collision) {
          const cid = String(collision.id).replace(/[{}]/g, '').toLowerCase();
          const tid = String(targetId).replace(/[{}]/g, '').toLowerCase();
          if (cid !== tid) {
            return res.status(400).json({ message: 'Email already exists' });
          }
        }
      }
    }

    const updateData = { name, is_active, password, password_hash, email };
    const staff = await Staff.update(targetId, updateData, req.user?.id);
    if (!staff) return res.status(404).json({ message: 'Staff not found' });
    res.json(staff);
  } catch (error) {
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
    const isAdmin = req.user?.role === 'admin';
    const isManager = req.user?.role === 'manager';

    const staff = await Staff.getById(targetId);
    if (!staff) {
      return res.status(404).json({ message: 'Staff member not found' });
    }

    const same =
      String(targetId).replace(/[{}]/g, '').toLowerCase() ===
      String(selfId).replace(/[{}]/g, '').toLowerCase();

    if (!same && !isAdmin && !isManager) {
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
