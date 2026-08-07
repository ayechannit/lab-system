const express = require('express');
const router = express.Router();
const { authMiddleware, modulePermission } = require('../middlewares/authMiddleware');
const membershipTierController = require('../controllers/membershipTierController');

// Patients need the active ladder for home membership progress (not staff CRUD).
router.get('/active', authMiddleware, membershipTierController.getActiveTiers);

router.use(authMiddleware, modulePermission('membership-tiers'));

/**
 * @swagger
 * components:
 *   schemas:
 *     MembershipTier:
 *       type: object
 *       required:
 *         - name
 *         - min_points
 *         - discount_percent
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         name:
 *           type: string
 *           description: Name of the membership tier (e.g. Normal, Silver, Gold)
 *         min_points:
 *           type: integer
 *           description: Loyalty points balance required to qualify for this tier
 *         discount_percent:
 *           type: number
 *           description: Discount percentage granted to customers in this tier (0-100), added on top of a test's own discount
 *         is_active:
 *           type: boolean
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
 *   name: MembershipTiers
 *   description: Management of customer membership tiers based on loyalty points
 */

/**
 * @swagger
 * /api/membership-tiers:
 *   get:
 *     summary: Get all membership tiers
 *     tags: [MembershipTiers]
 *     responses:
 *       200:
 *         description: List of membership tiers
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/MembershipTier'
 */

/**
 * @swagger
 * /api/membership-tiers:
 *   post:
 *     summary: Create a new membership tier
 *     tags: [MembershipTiers]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - min_points
 *               - discount_percent
 *             properties:
 *               name:
 *                 type: string
 *               min_points:
 *                 type: integer
 *               discount_percent:
 *                 type: number
 *               is_active:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Membership tier created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MembershipTier'
 *       400:
 *         description: Validation error
 */

/**
 * @swagger
 * /api/membership-tiers/{id}:
 *   put:
 *     summary: Update a membership tier
 *     tags: [MembershipTiers]
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
 *               name:
 *                 type: string
 *               min_points:
 *                 type: integer
 *               discount_percent:
 *                 type: number
 *               is_active:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Membership tier updated successfully
 *       404:
 *         description: Tier not found
 */

/**
 * @swagger
 * /api/membership-tiers/{id}:
 *   delete:
 *     summary: Delete a membership tier
 *     tags: [MembershipTiers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Tier deleted successfully
 *       404:
 *         description: Tier not found
 */

router.get('/', membershipTierController.getAllTiers);
router.post('/', membershipTierController.createTier);
router.put('/:id', membershipTierController.updateTier);
router.delete('/:id', membershipTierController.deleteTier);

module.exports = router;
