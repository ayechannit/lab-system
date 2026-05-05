const express = require('express');
const router = express.Router();
const discountController = require('../controllers/discountController');
const validate = require('../middlewares/validate');
const { discountSchema } = require('../utils/validators');

/**
 * @swagger
 * components:
 *   schemas:
 *     Discount:
 *       type: object
 *       required:
 *         - test_id
 *         - role
 *         - discount_percent
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         test_id:
 *           type: string
 *           format: uuid
 *         role:
 *           type: string
 *           enum: [clinic, doctor, patient, all]
 *         discount_percent:
 *           type: number
 *         is_active:
 *           type: boolean
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
 *   description: Test-specific role-based discount management
 */

/**
 * @swagger
 * /api/discounts:
 *   get:
 *     summary: Get all test-specific discounts
 *     tags: [Discounts]
 *     parameters:
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [clinic, doctor, patient]
 *         description: Filter discounts by role
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
 *     responses:
 *       200:
 *         description: List of all discounts
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
 *     summary: Get all discounts for a specific test
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
 *         description: List of discounts for the test
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Discount'
 */

/**
 * @swagger
 * /api/discounts/{test_id}/{role}:
 *   get:
 *     summary: Get a discount for a specific test and role
 *     tags: [Discounts]
 *     parameters:
 *       - in: path
 *         name: test_id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: role
 *         required: true
 *         schema:
 *           type: string
 *           enum: [clinic, doctor, patient]
 *     responses:
 *       200:
 *         description: Discount detail including pricing
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Discount'
 *       404:
 *         description: Discount not found
 */

/**
 * @swagger
 * /api/discounts:
 *   post:
 *     summary: Create or update a discount
 *     description: Supports 'all' role to bulk update clinic, doctor, and patient roles.
 *     tags: [Discounts]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Discount'
 *     responses:
 *       200:
 *         description: The created/updated discount(s)
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
 *         description: Discount not found
 */

router.get('/', discountController.getAllDiscounts);
router.get('/:test_id', discountController.getDiscountsByTestId);
router.get('/:test_id/:role', discountController.getDiscountByTestIdAndRole);
router.post('/', validate(discountSchema), discountController.upsertDiscount);
router.delete('/:id', discountController.deleteDiscount);

module.exports = router;
