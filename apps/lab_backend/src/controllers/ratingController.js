const Rating = require('../models/ratingModel');
const Order = require('../models/orderModel');

const createRating = async (req, res) => {
  try {
    // Ensure the order exists and belongs to the user
    const order = await Order.getById(req.body.order_id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    // In a real app, you would verify req.user.id == order.user_id
    if (order.user_id.toLowerCase() !== req.body.user_id.toLowerCase()) {
      return res.status(403).json({ message: 'You can only rate your own orders' });
    }

    const rating = await Rating.create(req.body);
    res.status(201).json(rating);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const getAllRatings = async (req, res) => {
  try {
    const ratings = await Rating.getAll(req.query);
    res.json(ratings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getRatingByOrderId = async (req, res) => {
  try {
    const rating = await Rating.getByOrderId(req.params.orderId);
    if (!rating) return res.status(404).json({ message: 'No rating found for this order' });
    res.json(rating);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createRating,
  getAllRatings,
  getRatingByOrderId
};