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

async function awardPointsForVerifiedPayment(payment, updatedBy) {
  if (payment.status !== 'verified') return;
  const activeRules = await PointSetting.getActiveRules();
  if (!activeRules?.length) return;

  let remainingAmount = payment.amount_mmk;
  let pointsEarned = 0;
  for (const rule of activeRules) {
    if (remainingAmount >= rule.spend_amount_mmk) {
      const multiple = Math.floor(remainingAmount / rule.spend_amount_mmk);
      pointsEarned += multiple * rule.points_reward;
      remainingAmount -= multiple * rule.spend_amount_mmk;
    }
  }
  if (pointsEarned > 0) {
    const order = await Order.getById(payment.order_id);
    if (order?.user_id) {
      await User.addPoints(order.user_id, pointsEarned, updatedBy);
    }
  }
}

const verifyPayment = async (req, res) => {
  req.body = { ...req.body, status: 'verified' };
  return updatePaymentStatus(req, res);
};

const updatePaymentStatus = async (req, res) => {
  try {
    const { status, staff_id } = req.body;
    const allowed = ['pending', 'received', 'verified', 'failed'];
    if (!status || !allowed.includes(status)) {
      return res.status(400).json({ message: 'status must be one of: pending, received, verified, failed' });
    }
    if (status === 'verified' && !staff_id) {
      return res.status(400).json({ message: 'staff_id is required when status is verified' });
    }

    const payment = await Payment.updateStatus(req.params.id, status, staff_id, req.user?.id);
    if (!payment) return res.status(404).json({ message: 'Payment not found' });

    await awardPointsForVerifiedPayment(payment, req.user?.id);
    res.json(payment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getPaymentByOrderId,
  createPayment,
  verifyPayment,
  updatePaymentStatus,
};
