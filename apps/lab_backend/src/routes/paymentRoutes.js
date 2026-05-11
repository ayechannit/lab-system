const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middlewares/authMiddleware');
const paymentController = require('../controllers/paymentController');
const validate = require('../middlewares/validate');
const { paymentSchema } = require('../utils/validators');

router.use(authMiddleware);

/**
 * @swagger
 * components:
 *   schemas:
 *     Payment:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         order_id:
 *           type: string
 *           format: uuid
 *         amount_mmk:
 *           type: number
 *         status:
 *           type: string
 *           enum: [pending, received, verified, failed]
 *         method:
 *           type: string
 *           enum: [cash, bank_transfer, mobile_pay]
 *         reference_no:
 *           type: string
 *         verified_by:
 *           type: string
 *           format: uuid
 *         paid_at:
 *           type: string
 *           format: date-time
 *         verified_at:
 *           type: string
 *           format: date-time
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * tags:
 *   name: Payments
 *   description: Payment processing and verification (Supports partial/reserve payments)
 */

/**
 * @swagger
 * /api/payments/{order_id}:
 *   get:
 *     summary: Get payment summary and history for a specific order
 *     tags: [Payments]
 *     parameters:
 *       - in: path
 *         name: order_id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Payment summary (balance) and history
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 summary:
 *                   type: object
 *                   properties:
 *                     total_price:
 *                       type: number
 *                     total_paid:
 *                       type: number
 *                     balance:
 *                       type: number
 *                 history:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Payment'
 *       404:
 *         description: Payment not found
 */

/**
 * @swagger
 * /api/payments:
 *   post:
 *     summary: Record a new payment (Full or Partial/Reserve)
 *     tags: [Payments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Payment'
 *     responses:
 *       201:
 *         description: Payment recorded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Payment'
 */

/**
 * @swagger
 * /api/payments/{id}/verify:
 *   put:
 *     summary: Verify a payment (Staff action)
 *     tags: [Payments]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               staff_id:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: Payment verified
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Payment'
 */

router.get('/:order_id', paymentController.getPaymentByOrderId);
router.post('/', validate(paymentSchema), paymentController.createPayment);
router.put('/:id/verify', paymentController.verifyPayment);

module.exports = router;
