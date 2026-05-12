const Payment = require('../models/paymentModel');
const Order = require('../models/orderModel');
const PointSetting = require('../models/pointSettingModel');
const User = require('../models/userModel');

const getPaymentByOrderId = async (req, res) => {
  const payments = await Payment.getByOrderId(req.params.order_id);
  const summary = await Payment.getSummaryByOrderId(req.params.order_id);
  
  res.json({
    summary: summary || { total_price: 0, total_paid: 0, balance: 0 },
    history: payments
  });
};

const createPayment = async (req, res) => {
  const { order_id, amount_mmk, method, status, reference_no } = req.body;
  if (!order_id || !amount_mmk || !method) {
    return res.status(400).json({ message: 'order_id, amount_mmk, and method are required' });
  }
  const paymentData = { order_id, amount_mmk, method, status, reference_no };
  try {
    const payment = await Payment.create(paymentData, req.user?.id);
    res.status(201).json(payment);
  } catch(error) {
     res.status(500).json({ error: error.message });
  }
};

const verifyPayment = async (req, res) => {
  try {
    const { staff_id } = req.body;
    const payment = await Payment.verify(req.params.id, staff_id, req.user?.id);
    if (!payment) return res.status(404).json({ message: 'Payment not found' });

    // Handle Points Calculation when verified
    if (payment.status === 'verified') {
      const activeRules = await PointSetting.getActiveRules();
      
      if (activeRules && activeRules.length > 0) {
        let remainingAmount = payment.amount_mmk;
        let pointsEarned = 0;

        // Apply cascading tiers (highest spend rules first as returned by getActiveRules)
        for (const rule of activeRules) {
          if (remainingAmount >= rule.spend_amount_mmk) {
            const multiple = Math.floor(remainingAmount / rule.spend_amount_mmk);
            pointsEarned += multiple * rule.points_reward;
            remainingAmount -= multiple * rule.spend_amount_mmk;
          }
        }

        if (pointsEarned > 0) {
          const order = await Order.getById(payment.order_id);
          if (order && order.user_id) {
            await User.addPoints(order.user_id, pointsEarned, req.user?.id);
          }
        }
      }
    }

    res.json(payment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getPaymentByOrderId,
  createPayment,
  verifyPayment,
};
