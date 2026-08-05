const express = require('express');
const router = express.Router();
const { authMiddleware, modulePermission } = require('../middlewares/authMiddleware');
const discountController = require('../controllers/discountController');

router.use(authMiddleware, modulePermission('discounts'));

/**
 * @swagger
 * components:
 *   schemas:
 *     Discount:
 *       type: object
 *       required:
 *         - test_id
 *         - discount_percent
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         test_id:
 *           type: string
 *           format: uuid
 *         discount_percent:
 *           type: number
 *         is_active:
 *           type: boolean
 *         start_date:
 *           type: string
 *           format: date-time
 *         end_date:
 *           type: string
 *           format: date-time
 *         is_deleted:
 *           type: boolean
 *         test_name:
 *           type: string
 *         test_code:
 *           type: string
 *         original_price:
 *           type: number
 *         after_discount_price:
 *           type: number
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
 *   name: Discounts
 *   description: Test-specific discount management
 */

/**
 * @swagger
 * /api/discounts:
 *   get:
 *     summary: Get all test-specific discounts
 *     tags: [Discounts]
 *     parameters:
 *       - in: query
 *         name: is_active
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *       - in: query
 *         name: test_name
 *         schema:
 *           type: string
 *         description: Search by partial test name
 *       - in: query
 *         name: test_code
 *         schema:
 *           type: string
 *         description: Search by partial test code
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
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *         description: Field to sort by (created_at, updated_at, discount_percent, test_name)
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *         description: Sort order
 *     responses:
 *       200:
 *         description: List of test-specific discounts
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Discount'
 */

/**
 * @swagger
 * /api/discounts/{test_id}:
 *   get:
 *     summary: Get all discount configurations for a specific test
 *     tags: [Discounts]
 *     parameters:
 *       - in: path
 *         name: test_id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Discount configurations for the test
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Discount'
 */

/**
 * @swagger
 * /api/discounts:
 *   post:
 *     summary: Create or update a discount
 *     tags: [Discounts]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - test_id
 *               - discount_percent
 *             properties:
 *               test_id:
 *                 type: string
 *                 format: uuid
 *               discount_percent:
 *                 type: number
 *               is_active:
 *                 type: boolean
 *               start_date:
 *                 type: string
 *                 format: date-time
 *               end_date:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: The created/updated discount config
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Discount'
 */

/**
 * @swagger
 * /api/discounts/bulk:
 *   post:
 *     summary: Bulk create or update multiple discount configurations
 *     tags: [Discounts]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - discounts
 *             properties:
 *               discounts:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - test_id
 *                     - discount_percent
 *                   properties:
 *                     test_id:
 *                       type: string
 *                       format: uuid
 *                     discount_percent:
 *                       type: number
 *                     is_active:
 *                       type: boolean
 *                     start_date:
 *                       type: string
 *                       format: date-time
 *                     end_date:
 *                       type: string
 *                       format: date-time
 *     responses:
 *       200:
 *         description: The created/updated discount configs
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Discount'
 */

/**
 * @swagger
 * /api/discounts/{id}:
 *   delete:
 *     summary: Soft delete a specific discount entry
 *     tags: [Discounts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Discount deleted
 *       404:
 *         description: Discount entry not found
 */

router.get('/', discountController.getAllDiscounts);
router.get('/:test_id', discountController.getDiscountsByTestId);
router.post('/bulk', discountController.bulkUpsertDiscounts);
router.post('/', discountController.upsertDiscount);
router.delete('/:id', discountController.deleteDiscount);

module.exports = router;
