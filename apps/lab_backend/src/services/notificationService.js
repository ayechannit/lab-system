const admin = require('../config/firebase');
const Notification = require('../models/notificationModel');
const { sql, poolPromise } = require('../config/db');

class NotificationService {
  /**
   * Send a notification to a specific user (or staff) by saving it to their DB inbox 
   * and optionally sending a push notification if they have an FCM token registered.
   * @param {string} userId - Target user's unique identifier.
   * @param {string} userType - 'user' or 'staff'.
   * @param {string} title - Notification title.
   * @param {string} body - Notification body/message.
   * @param {object} data - Optional key-value pairs.
   */
  static async sendToUser(userId, userType, title, body, data = {}) {
    try {
      // 1. Save to the database for the user's persistent in-app inbox
      await Notification.create({
        user_id: userId,
        user_type: userType,
        title,
        body,
        data_payload: data,
      });

      // 2. Fetch user's FCM token from the database
      const fcmToken = await this._getFcmToken(userId, userType);
      
      if (!fcmToken) {
        console.log(`Notification saved to DB, but no FCM token found for ${userType} ID: ${userId}`);
        return null;
      }

      // Convert data payload values to strings for FCM compatibility
      const formattedData = {};
      if (data && typeof data === 'object') {
        for (const [key, value] of Object.entries(data)) {
          formattedData[key] = String(value);
        }
      }

      // 3. Send push notification via FCM
      return await this.sendToToken(fcmToken, title, body, formattedData);
    } catch (err) {
      console.error(`Failed to send notification to ${userType} ID: ${userId}:`, err.message);
      // We catch and log to ensure calling APIs never crash if notification delivery fails
      return null;
    }
  }

  /**
   * Send a push notification to a specific device token.
   * @param {string} token - The FCM device token.
   * @param {string} title - Notification title.
   * @param {string} body - Notification body/message.
   * @param {object} data - Optional custom data payload.
   */
  static async sendToToken(token, title, body, data = {}) {
    try {
      if (!admin || !admin.apps.length) {
        console.warn('Firebase Admin not initialized. Skipping FCM push notification.');
        return null;
      }
      const message = {
        notification: { title, body },
        data,
        token,
      };
      return await admin.messaging().send(message);
    } catch (err) {
      console.error('FCM Send to Token Error:', err.message);
      return null;
    }
  }

  /**
   * Send a push notification to a specific topic.
   * @param {string} topic - The FCM topic name (e.g., 'all_users', 'promotions').
   * @param {string} title - Notification title.
   * @param {string} body - Notification body/message.
   * @param {object} data - Optional custom data payload.
   */
  static async sendToTopic(topic, title, body, data = {}) {
    try {
      if (!admin || !admin.apps.length) {
        console.warn('Firebase Admin not initialized. Skipping FCM topic notification.');
        return null;
      }
      const message = {
        notification: { title, body },
        data,
        topic,
      };
      return await admin.messaging().send(message);
    } catch (err) {
      console.error('FCM Send to Topic Error:', err.message);
      return null;
    }
  }

  /**
   * Helper to retrieve FCM token from database.
   */
  static async _getFcmToken(userId, userType) {
    try {
      const pool = await poolPromise;
      const request = pool.request();
      request.input('id', sql.UniqueIdentifier, userId);

      const table = userType === 'staff' ? 'lab_staff' : 'users';
      const result = await request.query(`SELECT fcm_token FROM ${table} WHERE id = @id`);
      return result.recordset[0]?.fcm_token || null;
    } catch (err) {
      console.error(`Error fetching FCM token for ${userType} ID ${userId}:`, err.message);
      return null;
    }
  }
}

module.exports = NotificationService;
