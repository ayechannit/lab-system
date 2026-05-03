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
router.post('/', validate(discountSchema), discountController.upsertDiscount);
router.delete('/:id', discountController.deleteDiscount);

module.exports = router;
