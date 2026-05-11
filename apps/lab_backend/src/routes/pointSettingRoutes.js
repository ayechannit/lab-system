const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middlewares/authMiddleware');
const pointSettingController = require('../controllers/pointSettingController');
const validate = require('../middlewares/validate');
const { pointSettingSchema } = require('../utils/validators');

router.use(authMiddleware);

/**
 * @swagger
 * components:
 *   schemas:
 *     PointSetting:
 *       type: object
 *       required:
 *         - name
 *         - spend_amount_mmk
 *         - points_reward
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         name:
 *           type: string
 *           description: Name of the tier or campaign (e.g. Base Tier, Summer Promo)
 *         spend_amount_mmk:
 *           type: number
 *           description: The amount of money required to earn the points reward
 *         points_reward:
 *           type: integer
 *           description: The number of points awarded per the spend amount
 *         start_date:
 *           type: string
 *           format: date-time
 *           description: Optional start date for the rule/campaign
 *         end_date:
 *           type: string
 *           format: date-time
 *           description: Optional end date for the rule/campaign
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
 *   name: PointSettings
 *   description: Management of point reward rules for user purchases
 */

/**
 * @swagger
 * /api/point-settings:
 *   get:
 *     summary: Get all point reward rules
 *     tags: [PointSettings]
 *     responses:
 *       200:
 *         description: List of point settings
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/PointSetting'
 */

/**
 * @swagger
 * /api/point-settings:
 *   post:
 *     summary: Create a new point reward rule
 *     tags: [PointSettings]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PointSetting'
 *     responses:
 *       201:
 *         description: Point setting created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PointSetting'
 *       400:
 *         description: Validation error
 */

/**
 * @swagger
 * /api/point-settings/{id}:
 *   put:
 *     summary: Update a point reward rule
 *     tags: [PointSettings]
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
 *             $ref: '#/components/schemas/PointSetting'
 *     responses:
 *       200:
 *         description: Point setting updated successfully
 *       404:
 *         description: Rule not found
 */

/**
 * @swagger
 * /api/point-settings/{id}:
 *   delete:
 *     summary: Delete a point reward rule
 *     tags: [PointSettings]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Rule deleted successfully
 *       404:
 *         description: Rule not found
 */

router.get('/', pointSettingController.getAllSettings);
router.post('/', validate(pointSettingSchema), pointSettingController.createSetting);
router.put('/:id', validate(pointSettingSchema), pointSettingController.updateSetting);
router.delete('/:id', pointSettingController.deleteSetting);

module.exports = router;