const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middlewares/authMiddleware');
const scheduleController = require('../controllers/scheduleController');

router.use(authMiddleware);

/**
 * @swagger
 * components:
 *   schemas:
 *     Schedule:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         order_id:
 *           type: string
 *           format: uuid
 *         collecting_person:
 *           type: string
 *         collection_time:
 *           type: string
 *           format: date-time
 *         running_time:
 *           type: string
 *           format: date-time
 *         report_out_time:
 *           type: string
 *           format: date-time
 *         accepted_by_user:
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
 *   name: Schedules
 *   description: Order scheduling and collection tracking
 */

/**
 * @swagger
 * /api/schedules/{order_id}:
 *   get:
 *     summary: Get schedule for a specific order
 *     tags: [Schedules]
 *     parameters:
 *       - in: path
 *         name: order_id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Schedule details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Schedule'
 *       404:
 *         description: Schedule not found
 */

/**
 * @swagger
 * /api/schedules:
 *   post:
 *     summary: Create or update a schedule
 *     tags: [Schedules]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - order_id
 *             properties:
 *               order_id:
 *                 type: string
 *                 format: uuid
 *               collecting_person:
 *                 type: string
 *               collection_time:
 *                 type: string
 *                 format: date-time
 *               running_time:
 *                 type: string
 *                 format: date-time
 *               report_out_time:
 *                 type: string
 *                 format: date-time
 *               accepted_by_user:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Schedule updated/created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Schedule'
 */

/**
 * @swagger
 * /api/schedules/bulk:
 *   post:
 *     summary: Bulk create or update multiple schedules
 *     tags: [Schedules]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - schedules
 *             properties:
 *               schedules:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - order_id
 *                   properties:
 *                     order_id:
 *                       type: string
 *                       format: uuid
 *                     collecting_person:
 *                       type: string
 *                     collection_time:
 *                       type: string
 *                       format: date-time
 *                     running_time:
 *                       type: string
 *                       format: date-time
 *                     report_out_time:
 *                       type: string
 *                       format: date-time
 *                     accepted_by_user:
 *                       type: boolean
 *     responses:
 *       200:
 *         description: Schedules updated/created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 schedules:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Schedule'
 */

router.post('/bulk', scheduleController.bulkUpsertSchedules);
router.get('/:order_id', scheduleController.getScheduleByOrderId);
router.post('/', scheduleController.upsertSchedule);

module.exports = router;
