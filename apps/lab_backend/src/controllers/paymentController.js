const Payment = require('../models/paymentModel');
const Order = require('../models/orderModel');
const PointSetting = require('../models/pointSettingModel');
const PointRedemptionSetting = require('../models/pointRedemptionSettingModel');
const User = require('../models/userModel');
const NotificationService = require('../services/notificationService');

const getPaymentByOrderId = async (req, res) => {
  const payments = await Payment.getByOrderId(req.params.order_id);
  const summary = await Payment.getSummaryByOrderId(req.params.order_id);

  res.json({
    summary: summary || { total_price: 0, total_paid: 0, balance: 0 },
    history: payments
  });
};

const createPayment = async (req, res) => {
  const { order_id, amount_mmk, method, status, reference_no, points_redeemed } = req.body;
  if (!order_id || !amount_mmk || !method) {
    return res.status(400).json({ message: 'order_id, amount_mmk, and method are required' });
  }

  let pointsRedeemed = 0;
  if (points_redeemed !== undefined && points_redeemed !== null) {
    const parsedPoints = Number(points_redeemed);
    if (!Number.isInteger(parsedPoints) || parsedPoints < 0) {
      return res.status(400).json({ message: 'points_redeemed must be a non-negative integer' });
    }
    pointsRedeemed = parsedPoints;
  }

  try {
    // Fetch the order up front - needed both for points redemption (order.user_id)
    // and for the payment-submission notification below.
    const order = await Order.getById(order_id);

    let pointsValueMmk = 0;
    if (pointsRedeemed > 0) {
      if (!order || !order.user_id) {
        return res.status(404).json({ message: 'Order not found' });
      }

      const user = await User.getById(order.user_id);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Prevent redeeming more points than the customer currently has
      if (pointsRedeemed > (user.total_points || 0)) {
        return res.status(400).json({
          message: `Insufficient points: user has ${user.total_points || 0} points, cannot redeem ${pointsRedeemed}`
        });
      }

      const setting = await PointRedemptionSetting.get();
      pointsValueMmk = Math.round(pointsRedeemed * (setting.mmk_per_point || 0) * 100) / 100;
    }

    const paymentData = {
      order_id,
      amount_mmk,
      method,
      status,
      reference_no,
      points_redeemed: pointsRedeemed,
      points_value_mmk: pointsValueMmk,
    };
    const payment = await Payment.create(paymentData, req.user?.id);

    if (pointsRedeemed > 0 && order?.user_id) {
      await User.addPoints(
        order.user_id,
        -pointsRedeemed,
        req.user?.id,
        'redeem',
        `Redeemed ${pointsRedeemed} points (${pointsValueMmk} MMK) toward payment for Order #${order.id}`,
        payment.id
      );
    }

    // Notify user of payment submission
    if (order && order.user_id) {
      NotificationService.sendToUser(
        order.user_id,
        'user',
        'Payment Submitted',
        `Your payment submission of ${amount_mmk} MMK was received and is pending review.`,
        { order_id, payment_id: payment.id, event: 'payment_submitted' }
      ).catch(err => console.error('Error sending payment creation notification:', err.message));
    }

    res.status(201).json(payment);
  } catch(error) {
     res.status(500).json({ error: error.message });
  }
};

async function awardPointsForVerifiedPayment(payment, updatedBy) {
  if (payment.status !== 'verified') return;

  const order = await Order.getById(payment.order_id);
  if (order?.user_id) {
    await User.addSpend(order.user_id, payment.amount_mmk, updatedBy);
  }

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
    if (order?.user_id) {
      await User.addPoints(
        order.user_id,
        pointsEarned,
        updatedBy,
        'earn',
        `Points earned from payment of ${payment.amount_mmk} MMK for Order #${order.id}`,
        payment.id
      );
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

    // Fetch the payment's current row first, so we know its status/points_redeemed
    // before this transition (needed for the failed-payment points refund below).
    const existingPayment = await Payment.getById(req.params.id);
    if (!existingPayment) return res.status(404).json({ message: 'Payment not found' });
    const previousStatus = existingPayment.status;

    const payment = await Payment.updateStatus(req.params.id, status, staff_id, req.user?.id);
    if (!payment) return res.status(404).json({ message: 'Payment not found' });

    await awardPointsForVerifiedPayment(payment, req.user?.id);

    // Notify user of payment status update
    const order = await Order.getById(payment.order_id);

    // Refund redeemed points if a points-inclusive payment just transitioned to 'failed'
    // (and wasn't already 'failed'), so a failed payment doesn't leave the customer
    // permanently short the points they "spent" on it.
    if (
      status === 'failed' &&
      previousStatus !== 'failed' &&
      (existingPayment.points_redeemed || 0) > 0 &&
      order?.user_id
    ) {
      await User.addPoints(
        order.user_id,
        existingPayment.points_redeemed,
        req.user?.id,
        'adjustment',
        `Refund of ${existingPayment.points_redeemed} points for failed payment #${payment.id}`,
        payment.id
      );
    }

    if (order && order.user_id) {
      let title = 'Payment Status Updated';
      let body = `Your payment status for order has been updated to "${status}".`;
      
      if (status === 'verified') {
        title = 'Payment Verified Successfully';
        body = `Your payment of ${payment.amount_mmk} MMK was verified successfully. Thank you!`;
      } else if (status === 'failed') {
        title = 'Payment Verification Failed';
        body = `Your payment of ${payment.amount_mmk} MMK was marked as failed/rejected. Please verify details or contact support.`;
      }

      NotificationService.sendToUser(
        order.user_id,
        'user',
        title,
        body,
        { order_id: payment.order_id, payment_id: payment.id, status, event: 'payment_status_updated' }
      ).catch(err => console.error('Error sending payment status update notification:', err.message));
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
  updatePaymentStatus,
};
