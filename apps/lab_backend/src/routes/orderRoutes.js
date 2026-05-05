const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const validate = require('../middlewares/validate');
const { orderSchema, orderStatusUpdateSchema } = require('../utils/validators');

/**
 * @swagger
 * components:
 *   schemas:
 *     OrderItem:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         order_id:
 *           type: string
 *           format: uuid
 *         test_id:
 *           type: string
 *           format: uuid
 *         quantity:
 *           type: integer
 *         unit_price_mmk:
 *           type: number
 *         subtotal_mmk:
 *           type: number
 *     Order:
 *       type: object
 *       required:
 *         - user_id
 *         - priority
 *         - patient_name
 *         - patient_age
 *         - patient_phone
 *         - address
 *         - original_price_mmk
 *         - final_price_mmk
 *         - items
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         user_id:
 *           type: string
 *           format: uuid
 *         description:
 *           type: string
 *         priority:
 *           type: string
 *           enum: [urgent, elective]
 *         patient_name:
 *           type: string
 *         patient_age:
 *           type: integer
 *         patient_phone:
 *           type: string
 *         address:
 *           type: string
 *         latitude:
 *           type: number
 *         longitude:
 *           type: number
 *         status:
 *           type: string
 *           enum: [pending, scheduled, collecting, running, completed, delivered]
 *         original_price_mmk:
 *           type: number
 *         discount_percent:
 *           type: number
 *         final_price_mmk:
 *           type: number
 *         is_deleted:
 *           type: boolean
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *         total_paid_mmk:
 *           type: number
 *           description: Sum of all received/verified payments
 *         balance_mmk:
 *           type: number
 *           description: Remaining amount to pay
 *         items:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/OrderItem'
 *         schedule:
 *           $ref: '#/components/schemas/Schedule'
 *         payments:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Payment'
 */

/**
 * @swagger
 * tags:
 *   name: Orders
 *   description: Lab order management
 */

/**
 * @swagger
 * /api/orders:
 *   get:
 *     summary: Get all orders
 *     tags: [Orders]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, scheduled, collecting, running, completed, delivered]
 *         description: Filter orders by status
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *           enum: [urgent, elective]
 *         description: Filter orders by priority
 *       - in: query
 *         name: patient_name
 *         schema:
 *           type: string
 *         description: Search by partial patient name
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Number of items per page for pagination
 *     responses:
 *       200:
 *         description: List of all orders
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Order'
 */

/**
 * @swagger
 * /api/orders/{id}:
 *   get:
 *     summary: Get order details including items, schedule and payment
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Full order details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Order'
 *       404:
 *         description: Order not found
 */

/**
 * @swagger
 * /api/orders:
 *   post:
 *     summary: Create a new order with items
 *     tags: [Orders]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Order'
 *     responses:
 *       201:
 *         description: Order created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Order'
 */

/**
 * @swagger
 * /api/orders/{id}/status:
 *   put:
 *     summary: Update order status and log the change
 *     tags: [Orders]
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
 *               status:
 *                 type: string
 *                 enum: [pending, scheduled, collecting, running, completed, delivered]
 *               staff_id:
 *                 type: string
 *                 format: uuid
 *               note:
 *                 type: string
 *     responses:
 *       200:
 *         description: Status updated
 */

/**
 * @swagger
 * /api/orders/{id}:
 *   delete:
 *     summary: Soft delete an order
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Order deleted
 *       404:
 *         description: Order not found
 */

router.get('/', orderController.getAllOrders);
router.get('/:id', orderController.getOrderById);
router.post('/', validate(orderSchema), orderController.createOrder);
router.put('/:id/status', validate(orderStatusUpdateSchema), orderController.updateOrderStatus);
router.delete('/:id', orderController.deleteOrder);

module.exports = router;
