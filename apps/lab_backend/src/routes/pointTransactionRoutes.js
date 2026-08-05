const express = require('express');
const router = express.Router();
const { authMiddleware, modulePermission } = require('../middlewares/authMiddleware');
const pointTransactionController = require('../controllers/pointTransactionController');

router.use(authMiddleware);

/**
 * @swagger
 * components:
 *   schemas:
 *     PointTransaction:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         user_id:
 *           type: string
 *           format: uuid
 *         points:
 *           type: integer
 *           description: Number of points added (positive) or deducted (negative)
 *         transaction_type:
 *           type: string
 *           enum: [earn, redeem, adjustment]
 *           description: The category/type of the point transaction
 *         description:
 *           type: string
 *           description: A detailed description explaining the transaction
 *         reference_id:
 *           type: string
 *           format: uuid
 *           description: Optional identifier referencing an order, payment, or other entity
 *         created_at:
 *           type: string
 *           format: date-time
 *         created_user:
 *           type: string
 *           format: uuid
 *         user_name:
 *           type: string
 *           description: The name of the user (joined from users table)
 *         user_phone:
 *           type: string
 *           description: The phone number of the user (joined from users table)
 *     PointAdjustment:
 *       type: object
 *       required:
 *         - user_id
 *         - points
 *         - transaction_type
 *       properties:
 *         user_id:
 *           type: string
 *           format: uuid
 *         points:
 *           type: integer
 *           description: Number of points to add or deduct
 *         transaction_type:
 *           type: string
 *           enum: [earn, redeem, adjustment]
 *         description:
 *           type: string
 *           description: Explanation for the adjustment
 */

/**
 * @swagger
 * tags:
 *   name: PointTransactions
 *   description: Loyalty point transaction tracking and administration
 */

/**
 * @swagger
 * /api/point-transactions:
 *   get:
 *     summary: Retrieve point transactions history
 *     description: |
 *       Retrieves point transactions.
 *       - End users (customers) will get only their own transactions.
 *       - Admin/Manager staff can get all transactions or filter by user_id.
 *     tags: [PointTransactions]
 *     parameters:
 *       - in: query
 *         name: user_id
 *         required: false
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by user ID (Admin/Manager only, or matches logged-in user)
 *       - in: query
 *         name: transaction_type
 *         required: false
 *         schema:
 *           type: string
 *           enum: [earn, redeem, adjustment]
 *         description: Filter by transaction type
 *     responses:
 *       200:
 *         description: A list of point transactions
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/PointTransaction'
 *       403:
 *         description: Access denied
 *       500:
 *         description: Server error
 */
router.get('/', pointTransactionController.getAllTransactions);

/**
 * @swagger
 * /api/point-transactions/adjust:
 *   post:
 *     summary: Manually adjust/reward/deduct user points (Admin/Manager only)
 *     description: Allows administrators or managers to manually credit or debit points for any user, creating a point transaction log.
 *     tags: [PointTransactions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PointAdjustment'
 *     responses:
 *       201:
 *         description: Point adjustment applied successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     name:
 *                       type: string
 *                     email:
 *                       type: string
 *                     total_points:
 *                       type: integer
 *       400:
 *         description: Bad request (validation failed or insufficient points balance)
 *       403:
 *         description: Access denied
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
router.post('/adjust', modulePermission('loyalty'), pointTransactionController.createManualAdjustment);

module.exports = router;
