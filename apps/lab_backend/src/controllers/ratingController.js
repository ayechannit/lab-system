const Rating = require('../models/ratingModel');
const Order = require('../models/orderModel');
const NotificationService = require('../services/notificationService');

const createRating = async (req, res) => {
  try {
    const { order_id, user_id, rating: ratingScore, remark } = req.body;
    if (!order_id || !user_id || !ratingScore) {
       return res.status(400).json({ message: 'order_id, user_id, and rating are required' });
    }

    // Ensure the order exists and belongs to the user
    const order = await Order.getById(order_id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    // In a real app, you would verify req.user.id == order.user_id
    if (order.user_id.toLowerCase() !== user_id.toLowerCase()) {
      return res.status(403).json({ message: 'You can only rate your own orders' });
    }

    const ratingData = { order_id, user_id, rating: ratingScore, remark };
    const rating = await Rating.create(ratingData, req.user?.id);

    // Notify staff of new rating in background
    NotificationService.sendToTopic(
      'staff_notifications',
      'New Order Rating',
      `User left a ${ratingScore}-star rating for order with remark: "${remark || 'No remark'}".`,
      { order_id, rating: String(ratingScore), event: 'new_rating_alert' }
    ).catch(err => console.error('Error sending rating notification to staff:', err.message));

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