const admin = require('../config/firebase');

class NotificationService {
  /**
   * Send a push notification to a specific device token.
   * @param {string} token - The FCM device token.
   * @param {string} title - Notification title.
   * @param {string} body - Notification body/message.
   * @param {object} data - Optional custom data payload.
   */
  static async sendToToken(token, title, body, data = {}) {
    const message = {
      notification: { title, body },
      data,
      token,
    };
    return admin.messaging().send(message);
  }

  /**
   * Send a push notification to a specific topic.
   * @param {string} topic - The FCM topic name (e.g., 'all_users', 'promotions').
   * @param {string} title - Notification title.
   * @param {string} body - Notification body/message.
   * @param {object} data - Optional custom data payload.
   */
  static async sendToTopic(topic, title, body, data = {}) {
    const message = {
      notification: { title, body },
      data,
      topic,
    };
    return admin.messaging().send(message);
  }
}

module.exports = NotificationService;
