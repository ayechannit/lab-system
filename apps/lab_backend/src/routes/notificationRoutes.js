const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middlewares/authMiddleware');
const notificationController = require('../controllers/notificationController');

// Ensure all routes require authentication
router.use(authMiddleware);

/**
 * @swagger
 * tags:
 *   name: Notifications
 *   description: Push notification management via Firebase Cloud Messaging (FCM)
 */

/**
 * @swagger
 * /api/notifications/send:
 *   post:
 *     summary: Send a push notification
 *     description: Sends a push notification to a specific device token or a topic. You must provide either 'token' OR 'topic'.
 *     tags: [Notifications]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - body
 *             properties:
 *               token:
 *                 type: string
 *                 description: The target device FCM token
 *               topic:
 *                 type: string
 *                 description: The target FCM topic name (e.g., 'all_users')
 *               title:
 *                 type: string
 *                 description: The notification title
 *               body:
 *                 type: string
 *                 description: The notification body/message
 *               data:
 *                 type: object
 *                 description: Optional key-value pairs for background data payload
 *                 additionalProperties:
 *                   type: string
 *     responses:
 *       200:
 *         description: Notification sent successfully
 *       400:
 *         description: Validation error (missing required fields or conflicting targets)
 *       500:
 *         description: Firebase Cloud Messaging error
 */
router.post('/send', notificationController.sendNotification);

module.exports = router;
