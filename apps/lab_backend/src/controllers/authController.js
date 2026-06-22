const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/userModel');
const Staff = require('../models/staffModel');
const PasswordReset = require('../models/passwordResetModel');
const EmailService = require('../services/emailService');

const loginUser = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.getByEmail(email);
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    if (['doctor', 'clinic', 'phlebotomist'].includes(user.role) && !user.is_approved) {
      return res.status(403).json({ message: 'Account is pending approval from lab staff.' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, type: 'user' },
      process.env.JWT_SECRET || 'your_default_secret',
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        is_approved: user.is_approved
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const loginStaff = async (req, res) => {
  const { email, password } = req.body;
  try {
    const staff = await Staff.getByEmail(email);
    if (!staff || !staff.is_active || !(await bcrypt.compare(password, staff.password_hash))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { id: staff.id, email: staff.email, role: staff.role, type: 'staff' },
      process.env.JWT_SECRET || 'your_default_secret',
      { expiresIn: '24h' }
    );

    res.json({
      token,
      staff: {
        id: staff.id,
        name: staff.name,
        email: staff.email,
        role: staff.role
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getMe = async (req, res) => {
  try {
    let account;
    if (req.user.type === 'staff') {
      account = await Staff.getById(req.user.id);
    } else {
      account = await User.getById(req.user.id);
    }
    
    if (!account) return res.status(404).json({ message: 'Account not found' });
    res.json(account);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const forgotPassword = async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ message: 'Email address is required' });
  }

  try {
    const em = String(email).trim().toLowerCase();
    let account = null;
    let userType = null;

    // 1. Search in users table first
    const user = await User.getByEmail(em);
    if (user) {
      account = user;
      userType = 'user';
    } else {
      // 2. Search in lab_staff table second
      const staff = await Staff.getByEmail(em);
      if (staff) {
        account = staff;
        userType = 'staff';
      }
    }

    if (!account) {
      return res.status(404).json({ message: 'No account registered with this email address' });
    }

    // 3. Generate secure, user-friendly 6-digit PIN code
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // 4. Save code to password_resets table (expiring in 15 mins)
    await PasswordReset.create(em, code, userType);

    // 5. Dispatch email containing the code (non-blocking)
    EmailService.sendPasswordResetEmail(em, code, account.name)
      .catch(err => console.error('Background forgot password email failed:', err.message));

    res.json({ message: 'A 6-digit verification code has been sent to your email.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const resetPassword = async (req, res) => {
  const { email, code, new_password } = req.body;
  if (!email || !code || !new_password) {
    return res.status(400).json({ message: 'Email, code, and new_password are required' });
  }

  try {
    const em = String(email).trim().toLowerCase();
    const pin = String(code).trim();

    // 1. Verify reset code
    const resetRecord = await PasswordReset.verify(em, pin);
    if (!resetRecord) {
      return res.status(400).json({ message: 'Invalid or expired verification code' });
    }

    // 2. Update password based on target user type
    let success = false;
    if (resetRecord.user_type === 'staff') {
      success = await Staff.updatePasswordByEmail(em, new_password);
    } else {
      success = await User.updatePasswordByEmail(em, new_password);
    }

    if (!success) {
      return res.status(404).json({ message: 'Failed to reset password. Account not found or deleted.' });
    }

    // 3. Delete used code
    await PasswordReset.deleteByEmail(em);

    res.json({ message: 'Password has been reset successfully.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  loginUser,
  loginStaff,
  getMe,
  forgotPassword,
  resetPassword
};
