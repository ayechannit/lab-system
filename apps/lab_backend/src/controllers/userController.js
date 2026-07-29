const User = require('../models/userModel');
const Order = require('../models/orderModel');
const Permission = require('../models/permissionModel');

function isSameAccount(targetId, selfId) {
  return (
    String(targetId).replace(/[{}]/g, '').toLowerCase() ===
    String(selfId ?? '').replace(/[{}]/g, '').toLowerCase()
  );
}

/** Staff roles allowed to view/manage other end-users' accounts are governed by the 'users' module in role_permissions. */
async function canManageOtherUsers(reqUser) {
  if (!reqUser || reqUser.type !== 'staff') return false;
  return Permission.isRoleAllowed(reqUser.role, 'users');
}

const getAllUsers = async (req, res) => {
  try {
    const users = await User.getAll(req.query);
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getUserById = async (req, res) => {
  try {
    const user = await User.getById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getOrdersByUser = async (req, res) => {
  try {
    if (!isSameAccount(req.params.id, req.user?.id) && !(await canManageOtherUsers(req.user))) {
      return res.status(403).json({ message: 'You can only view your own orders' });
    }

    // Check if user exists
    const user = await User.getById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Fetch orders using the user_id filter
    const filters = { ...req.query, user_id: req.params.id };
    const orders = await Order.getAll(filters);
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const createUser = async (req, res) => {
  try {
    const { name, email, phone, role, password, password_hash, address, latitude, longitude, license_number } = req.body;
    
    // Basic validation
    if (!name || !email || !phone || !role || (!password && !password_hash)) {
      return res.status(400).json({ message: 'name, email, phone, role, and password are required' });
    }

    if ((role === 'doctor' || role === 'clinic' || role === 'phlebotomist') && !license_number) {
      return res.status(400).json({ message: 'license_number is required for doctor, clinic, and phlebotomist roles' });
    }

    const userData = {
      name,
      email,
      phone,
      role,
      password,
      password_hash,
      address,
      latitude: latitude != null && latitude !== '' ? Number(latitude) : latitude,
      longitude: longitude != null && longitude !== '' ? Number(longitude) : longitude,
      license_number,
    };
    let user = await User.create(userData, req.user?.id);

    // Optional profile photo on signup (multipart field `image`).
    if (user && req.file) {
      try {
        const StorageService = require('../utils/storageService');
        const fileKey = await StorageService.uploadFile(req.file, 'profiles');
        const fileUrl = (await StorageService.getFileUrl(fileKey)) || fileKey;
        user = await User.updateProfileImage(user.id, fileUrl, user.id) || user;
      } catch (imgErr) {
        console.error('Profile image upload during registration failed:', imgErr.message);
      }
    }

    // Notify staff of new registration if role requires approval
    if (user && ['doctor', 'clinic', 'phlebotomist'].includes(user.role)) {
      const NotificationService = require('../services/notificationService');
      NotificationService.sendToTopic(
        'staff_notifications',
        'New Registration Pending Approval',
        `A new ${user.role} account ("${user.name}") has registered and is pending approval.`,
        { user_id: user.id, event: 'new_registration' }
      ).catch(err => console.error('Error sending registration alert to staff:', err.message));
    }

    res.status(201).json(user);
  } catch (error) {
    if (error.message.includes('UNIQUE KEY')) {
      return res.status(400).json({ message: 'Email already exists' });
    }
    res.status(500).json({ error: error.message });
  }
};

const updateUser = async (req, res) => {
  try {
    if (!isSameAccount(req.params.id, req.user?.id) && !(await canManageOtherUsers(req.user))) {
      return res.status(403).json({ message: 'You can only update your own account' });
    }

    const existing = await User.getById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'User not found' });

    const {
      name,
      phone,
      email,
      address,
      latitude,
      longitude,
      password,
      password_hash,
      license_number,
    } = req.body;

    const merge = (next, prev) => (next !== undefined ? next : prev);

    const updateData = {
      name: merge(name, existing.name),
      phone: merge(phone, existing.phone),
      email: merge(email, existing.email),
      address: merge(address, existing.address),
      latitude: merge(latitude, existing.latitude),
      longitude: merge(longitude, existing.longitude),
      license_number: merge(license_number, existing.license_number),
      password,
      password_hash,
    };

    const user = await User.update(req.params.id, updateData, req.user?.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const approveUser = async (req, res) => {
  try {
    const user = await User.getById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const updatedUser = await User.approve(req.params.id, req.user?.id);

    // Notify the user of their account approval
    if (updatedUser) {
      const NotificationService = require('../services/notificationService');
      NotificationService.sendToUser(
        updatedUser.id,
        'user',
        'Account Approved',
        `Your lab account has been approved by the administrators. You can now log in.`,
        { user_id: updatedUser.id, event: 'account_approved' }
      ).catch(err => console.error('Error sending account approval notification:', err.message));
    }

    res.json({ message: 'User approved successfully', user: updatedUser });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteUser = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const targetId = req.params.id;
    const selfId = req.user.id;
    const same = isSameAccount(targetId, selfId);

    // End users may delete only their own account; staff need the 'users' module permission to delete any user.
    if (!same && !(await canManageOtherUsers(req.user))) {
      return res.status(403).json({ message: 'You can only delete your own account' });
    }

    const existing = await User.getById(targetId);
    if (!existing) return res.status(404).json({ message: 'User not found' });

    const success = await User.delete(targetId, selfId);
    if (!success) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const registerFcmToken = async (req, res) => {
  try {
    const { fcm_token } = req.body;
    if (!fcm_token) {
      return res.status(400).json({ message: 'fcm_token is required' });
    }

    const userId = req.user.id;
    const userType = req.user.type; // 'user' or 'staff'
    
    let success;
    if (userType === 'staff') {
      const Staff = require('../models/staffModel');
      success = await Staff.updateFcmToken(userId, fcm_token, userId);
    } else {
      success = await User.updateFcmToken(userId, fcm_token, userId);
    }

    if (!success) {
      return res.status(404).json({ message: 'Account not found' });
    }

    res.json({ message: 'FCM token registered successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const uploadProfileImage = async (req, res) => {
  try {
    const targetId = req.params.id;
    const selfId = req.user?.id;
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const existing = await User.getById(targetId);
    if (!existing) return res.status(404).json({ message: 'User not found' });

    const same = isSameAccount(targetId, selfId);

    if (!same && !(await canManageOtherUsers(req.user))) {
      return res.status(403).json({ message: 'You can only upload a profile image for your own account' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No image file uploaded' });
    }

    const StorageService = require('../utils/storageService');
    const fileKey = await StorageService.uploadFile(req.file, 'profiles');
    const fileUrl = (await StorageService.getFileUrl(fileKey)) || fileKey;

    const updatedUser = await User.updateProfileImage(targetId, fileUrl, selfId);

    res.json({
      message: 'Profile image uploaded successfully',
      user: updatedUser,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  getOrdersByUser,
  createUser,
  updateUser,
  approveUser,
  deleteUser,
  registerFcmToken,
  uploadProfileImage,
};
