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
 *   description: Push notification management and in-app notification inbox history
 */

/**
 * @swagger
 * /api/notifications:
 *   get:
 *     summary: Get in-app notification inbox history
 *     description: Returns the list of persistent notifications for the currently logged-in user or staff.
 *     tags: [Notifications]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Maximum number of notifications to retrieve
 *     responses:
 *       200:
 *         description: List of notifications
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                     format: uuid
 *                   user_id:
 *                     type: string
 *                     format: uuid
 *                   user_type:
 *                     type: string
 *                   title:
 *                     type: string
 *                   body:
 *                     type: string
 *                   data_payload:
 *                     type: string
 *                     description: JSON string of custom payload
 *                   is_read:
 *                     type: boolean
 *                   created_at:
 *                     type: string
 *                     format: date-time
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Server error
 */
router.get('/', notificationController.getNotifications);

/**
 * @swagger
 * /api/notifications/read-all:
 *   put:
 *     summary: Mark all notifications as read
 *     description: Marks all unread notifications for the currently logged-in user or staff as read.
 *     tags: [Notifications]
 *     responses:
 *       200:
 *         description: All notifications marked as read
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Server error
 */
router.put('/read-all', notificationController.markAllRead);

/**
 * @swagger
 * /api/notifications/{id}/read:
 *   put:
 *     summary: Mark a single notification as read
 *     description: Marks a specific notification in the user's inbox as read.
 *     tags: [Notifications]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The unique identifier of the notification
 *     responses:
 *       200:
 *         description: Notification marked as read successfully
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Notification not found
 *       500:
 *         description: Server error
 */
router.put('/:id/read', notificationController.markRead);

/**
 * @swagger
 * /api/notifications/send:
 *   post:
 *     summary: Send a manual push notification (admin/staff use)
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
 *     responses:
 *       200:
 *         description: Notification sent successfully
 *       400:
 *         description: Validation error
 *       500:
 *         description: Firebase Cloud Messaging error
 */
router.post('/send', notificationController.sendNotification);

module.exports = router;
