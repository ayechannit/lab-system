const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middlewares/authMiddleware');
const orderController = require('../controllers/orderController');
const upload = require('../middlewares/upload');

router.use(authMiddleware);

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
 *         result_file_url:
 *           type: string
 *           description: URL or S3 key for the uploaded result PDF
 *         download_url:
 *           type: string
 *           description: Full URL to download the result PDF (added dynamically in responses)
 *     Order:
 *       type: object
 *       required:
 *         - user_id
 *         - priority
 *         - patient_name
 *         - patient_age
 *         - patient_phone
 *         - address
 *         - report_delivery_method
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
 *         report_delivery_method:
 *           type: string
 *           enum: [hard_copy, soft_copy, both]
 *         original_price_mmk:
 *           type: number
 *         discount_percent:
 *           type: number
 *         final_price_mmk:
 *           type: number
 *         prescription_url:
 *           type: string
 *         is_tests_assigned:
 *           type: boolean
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
 *         name: is_tests_assigned
 *         schema:
 *           type: boolean
 *         description: Filter by whether tests have been assigned (useful for triage)
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
 *     summary: Create a new order (with optional prescription upload and items)
 *     tags: [Orders]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               user_id:
 *                 type: string
 *                 format: uuid
 *               priority:
 *                 type: string
 *                 enum: [urgent, elective]
 *               patient_name:
 *                 type: string
 *               patient_age:
 *                 type: integer
 *               patient_phone:
 *                 type: string
 *               address:
 *                 type: string
 *               report_delivery_method:
 *                 type: string
 *                 enum: [hard_copy, soft_copy, both]
 *               prescription:
 *                 type: string
 *                 format: binary
 *                 description: Image or PDF of the prescription
 *               items:
 *                 type: string
 *                 description: JSON stringified array of OrderItem objects (optional if uploading prescription)
 *               original_price_mmk:
 *                 type: number
 *               discount_percent:
 *                 type: number
 *               final_price_mmk:
 *                 type: number
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
 * /api/orders/{id}/items:
 *   post:
 *     summary: Add items (tests) to an existing order and update totals
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
 *               items:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/OrderItem'
 *               original_price_mmk:
 *                 type: number
 *               discount_percent:
 *                 type: number
 *               final_price_mmk:
 *                 type: number
 *     responses:
 *       200:
 *         description: Order updated with new items
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

/**
 * @swagger
 * /api/orders/{id}/qrcode:
 *   get:
 *     summary: Generate a QR code for an order containing all tests
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The order ID
 *     responses:
 *       200:
 *         description: QR code generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 qrCodeImage:
 *                   type: string
 *                   description: Base64 data URL of the QR code image
 *                 details:
 *                   type: object
 *                   properties:
 *                     patient_name:
 *                       type: string
 *                     patient_age:
 *                       type: integer
 *                     patient_phone:
 *                       type: string
 *                     address:
 *                       type: string
 *                     tests:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           test_name:
 *                             type: string
 *                           test_code:
 *                             type: string
 *       404:
 *         description: Order not found
 */

/**
 * @swagger
 * /api/orders/{id}/tests/{testId}/upload-result:
 *   post:
 *     summary: Upload a PDF result for a specific test in an order
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The order ID
 *       - in: path
 *         name: testId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The test ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: The PDF file to upload (Max 5MB by default)
 *     responses:
 *       200:
 *         description: File uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 fileUrl:
 *                   type: string
 *                 downloadUrl:
 *                   type: string
 *       400:
 *         description: Invalid file format or missing file
 *       404:
 *         description: Order or test not found
 */

router.get('/', orderController.getAllOrders);
router.get('/:id', orderController.getOrderById);
router.post('/', upload.single('prescription'), orderController.createOrder);
router.post('/:id/items', orderController.addOrderItems);
router.put('/:id', orderController.updateOrder);
router.put('/:id/status', orderController.updateOrderStatus);
router.delete('/:id', orderController.deleteOrder);
router.get('/:id/qrcode', orderController.generateQrCode);
router.post('/:id/tests/:testId/upload-result', upload.single('file'), orderController.uploadTestResult);

module.exports = router;
