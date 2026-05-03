const Order = require('../models/orderModel');

const getAllOrders = async (req, res) => {
  const orders = await Order.getAll();
  res.json(orders);
};

const getOrderById = async (req, res) => {
  const order = await Order.getById(req.params.id);
  if (!order) return res.status(404).json({ message: 'Order not found' });
  res.json(order);
};

const createOrder = async (req, res) => {
  const order = await Order.create(req.body);
  res.status(201).json(order);
};

const updateOrderStatus = async (req, res) => {
  const { status, staff_id, note } = req.body;
  const order = await Order.updateStatus(req.params.id, status, staff_id, note);
  if (!order) return res.status(404).json({ message: 'Order not found' });
  res.json(order);
};

const deleteOrder = async (req, res) => {
  const success = await Order.delete(req.params.id);
  if (!success) return res.status(404).json({ message: 'Order not found' });
  res.json({ message: 'Order deleted successfully' });
};

module.exports = {
  getAllOrders,
  getOrderById,
  createOrder,
  updateOrderStatus,
  deleteOrder,
};
