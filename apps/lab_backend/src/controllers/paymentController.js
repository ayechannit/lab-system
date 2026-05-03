const Payment = require('../models/paymentModel');

const getPaymentByOrderId = async (req, res) => {
  const payments = await Payment.getByOrderId(req.params.order_id);
  const summary = await Payment.getSummaryByOrderId(req.params.order_id);
  
  res.json({
    summary: summary || { total_price: 0, total_paid: 0, balance: 0 },
    history: payments
  });
};

const createPayment = async (req, res) => {
  const payment = await Payment.create(req.body);
  res.status(201).json(payment);
};

const verifyPayment = async (req, res) => {
  const { staff_id } = req.body;
  const payment = await Payment.verify(req.params.id, staff_id);
  if (!payment) return res.status(404).json({ message: 'Payment not found' });
  res.json(payment);
};

module.exports = {
  getPaymentByOrderId,
  createPayment,
  verifyPayment,
};
