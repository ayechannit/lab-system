const User = require('../models/userModel');
const Order = require('../models/orderModel');

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
    const { name, email, phone, role, password, password_hash, address, latitude, longitude } = req.body;
    
    // Basic validation
    if (!name || !email || !phone || !role || (!password && !password_hash)) {
      return res.status(400).json({ message: 'name, email, phone, role, and password are required' });
    }

    const userData = { name, email, phone, role, password, password_hash, address, latitude, longitude };
    const user = await User.create(userData, req.user?.id);
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
    // Only allow specific fields to be updated
    const { name, phone, address, latitude, longitude, password, password_hash } = req.body;
    const updateData = { name, phone, address, latitude, longitude, password, password_hash };
    
    const user = await User.update(req.params.id, updateData, req.user?.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteUser = async (req, res) => {
  try {
    const success = await User.delete(req.params.id, req.user?.id);
    if (!success) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'User deleted successfully' });
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
  deleteUser,
};
