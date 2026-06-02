const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/userModel');
const Staff = require('../models/staffModel');

const loginUser = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.getByEmail(email);
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    if (['doctor', 'clinic'].includes(user.role) && !user.is_approved) {
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

module.exports = {
  loginUser,
  loginStaff,
  getMe
};
