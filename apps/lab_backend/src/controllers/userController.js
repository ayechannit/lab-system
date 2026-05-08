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
    const user = await User.create(req.body);
    res.status(201).json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateUser = async (req, res) => {
  try {
    const user = await User.update(req.params.id, req.body);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteUser = async (req, res) => {
  try {
    const success = await User.delete(req.params.id);
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
