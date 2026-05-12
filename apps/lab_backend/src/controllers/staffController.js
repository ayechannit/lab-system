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
    const { name, is_active, password, password_hash } = req.body;
    const updateData = { name, is_active, password, password_hash };

    const staff = await Staff.update(req.params.id, updateData, req.user?.id);
    if (!staff) return res.status(404).json({ message: 'Staff not found' });
    res.json(staff);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteStaff = async (req, res) => {
  try {
    const success = await Staff.delete(req.params.id, req.user?.id);
    if (!success) return res.status(404).json({ message: 'Staff not found' });
    res.json({ message: 'Staff deleted successfully' });
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
};
