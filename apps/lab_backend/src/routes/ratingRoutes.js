const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middlewares/authMiddleware');
const ratingController = require('../controllers/ratingController');

router.use(authMiddleware);

/**
 * @swagger
 * components:
 *   schemas:
 *     Rating:
 *       type: object
 *       required:
 *         - order_id
 *         - user_id
 *         - rating
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         order_id:
 *           type: string
 *           format: uuid
 *         user_id:
 *           type: string
 *           format: uuid
 *         rating:
 *           type: integer
 *           minimum: 1
 *           maximum: 5
 *         remark:
 *           type: string
 *         created_at:
 *           type: string
 *           format: date-time
 *     RatingWithDetails:
 *       allOf:
 *         - $ref: '#/components/schemas/Rating'
 *         - type: object
 *           properties:
 *             user_name:
 *               type: string
 *             user_email:
 *               type: string
 *             user_phone:
 *               type: string
 *             patient_name:
 *               type: string
 *             patient_age:
 *               type: integer
 *             order_status:
 *               type: string
 *             priority:
 *               type: string
 *             final_price_mmk:
 *               type: number
 *             order_created_at:
 *               type: string
 *               format: date-time
 *             order_tests:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   test_name:
 *                     type: string
 *                   test_code:
 *                     type: string
 */

/**
 * @swagger
 * tags:
 *   name: Ratings
 *   description: Lab order rating management
 */

/**
 * @swagger
 * /api/ratings:
 *   post:
 *     summary: Submit a rating for an order
 *     tags: [Ratings]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - order_id
 *               - user_id
 *               - rating
 *             properties:
 *               order_id:
 *                 type: string
 *                 format: uuid
 *               user_id:
 *                 type: string
 *                 format: uuid
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *               remark:
 *                 type: string
 *     responses:
 *       201:
 *         description: Rating submitted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Rating'
 *       400:
 *         description: Validation error or order already rated
 *       403:
 *         description: Unauthorized to rate this order
 *       404:
 *         description: Order not found
 */

/**
 * @swagger
 * /api/ratings:
 *   get:
 *     summary: Get all ratings (For Lab Staff)
 *     tags: [Ratings]
 *     parameters:
 *       - in: query
 *         name: rating
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 5
 *         description: Filter by specific rating score
 *       - in: query
 *         name: user_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by specific user
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
 *         description: List of all ratings
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/RatingWithDetails'
 */

/**
 * @swagger
 * /api/ratings/order/{orderId}:
 *   get:
 *     summary: Get rating for a specific order
 *     tags: [Ratings]
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The unique identifier of the order
 *     responses:
 *       200:
 *         description: Rating details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RatingWithDetails'
 *       404:
 *         description: No rating found for this order
 */

router.post('/', ratingController.createRating);
router.get('/', ratingController.getAllRatings);
router.get('/order/:orderId', ratingController.getRatingByOrderId);

module.exports = router;