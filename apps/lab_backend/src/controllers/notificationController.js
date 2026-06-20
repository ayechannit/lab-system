const NotificationService = require('../services/notificationService');
const Notification = require('../models/notificationModel');

/**
 * Manually send a push notification to a device token or topic.
 */
const sendNotification = async (req, res) => {
  try {
    const { token, topic, title, body, data } = req.body;

    if (!title || !body) {
      return res.status(400).json({ message: 'title and body are required' });
    }

    if (!token && !topic) {
      return res.status(400).json({ message: 'Either token or topic is required to target the notification' });
    }

    if (token && topic) {
      return res.status(400).json({ message: 'Provide either a token OR a topic, not both' });
    }

    let result;
    if (token) {
      result = await NotificationService.sendToToken(token, title, body, data ?? {});
    } else if (topic) {
      result = await NotificationService.sendToTopic(topic, title, body, data ?? {});
    }

    res.status(200).json({
      message: 'Notification sent successfully',
      delivery: result,
    });
  } catch (error) {
    console.error('Push Notification Error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get in-app notification history for the currently logged-in user or staff.
 */
const getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const userType = req.user.type || 'user'; // 'user' or 'staff'
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 50;

    const notifications = await Notification.getByUserId(userId, userType, limit);
    res.json(
      notifications.map((row) => ({
        ...row,
        is_read: Boolean(row.is_read),
      })),
    );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Mark a single notification as read.
 */
const markRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const success = await Notification.markAsRead(id, userId);
    if (!success) {
      return res.status(404).json({ message: 'Notification not found or access denied' });
    }

    res.json({ message: 'Notification marked as read successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Mark all notifications as read for the logged-in user or staff.
 */
const markAllRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const userType = req.user.type || 'user';

    await Notification.markAllAsRead(userId, userType);
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  sendNotification,
  getNotifications,
  markRead,
  markAllRead,
};
