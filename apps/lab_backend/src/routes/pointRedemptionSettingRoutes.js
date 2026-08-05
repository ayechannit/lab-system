const express = require('express');
const router = express.Router();
const { authMiddleware, modulePermission } = require('../middlewares/authMiddleware');
const pointRedemptionSettingController = require('../controllers/pointRedemptionSettingController');

router.use(authMiddleware, modulePermission('loyalty'));

/**
 * @swagger
 * components:
 *   schemas:
 *     PointRedemptionSetting:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         mmk_per_point:
 *           type: number
 *           description: MMK value of a single loyalty point when redeemed against a payment
 *         updated_user:
 *           type: string
 *           format: uuid
 *         updated_at:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * tags:
 *   name: PointRedemptionSetting
 *   description: Global loyalty point redemption rate (1 point = X MMK), used when redeeming points against an order payment
 */

/**
 * @swagger
 * /api/point-redemption-setting:
 *   get:
 *     summary: Get the current global point redemption rate
 *     tags: [PointRedemptionSetting]
 *     responses:
 *       200:
 *         description: The current point redemption setting
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PointRedemptionSetting'
 */
router.get('/', pointRedemptionSettingController.getSetting);

/**
 * @swagger
 * /api/point-redemption-setting:
 *   put:
 *     summary: Update the global point redemption rate
 *     tags: [PointRedemptionSetting]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - mmk_per_point
 *             properties:
 *               mmk_per_point:
 *                 type: number
 *                 description: MMK value of a single loyalty point
 *     responses:
 *       200:
 *         description: Updated point redemption setting
 *       400:
 *         description: Validation error
 */
router.put('/', pointRedemptionSettingController.updateSetting);

module.exports = router;
