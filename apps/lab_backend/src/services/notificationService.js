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

      // 3. Send push notification via FCM (inbox already saved above)
      return await this.sendToToken(fcmToken, title, body, data, { persistInbox: false });
    } catch (err) {
      console.error(`Failed to send notification to ${userType} ID: ${userId}:`, err.message);
      // We catch and log to ensure calling APIs never crash if notification delivery fails
      return null;
    }
  }

  /**
   * Send a push notification to a specific topic and mirror it into in-app inboxes.
   * @param {string} topic - The FCM topic name (e.g., 'all_users', 'staff_notifications').
   * @param {string} title - Notification title.
   * @param {string} body - Notification body/message.
   * @param {object} data - Optional custom data payload.
   */
  static async sendToTopic(topic, title, body, data = {}) {
    try {
      const inboxCount = await this._saveInboxForTopic(topic, title, body, data);

      if (!admin || !admin.apps.length) {
        console.warn('Firebase Admin not initialized. Skipping FCM topic notification.');
        return { inbox_count: inboxCount, fcm: null };
      }

      const formattedData = this._formatFcmData(data);
      const message = {
        notification: { title, body },
        data: formattedData,
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            clickAction: 'FLUTTER_NOTIFICATION_CLICK',
          },
        },
        apns: {
          headers: {
            'apns-priority': '10',
          },
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
        },
        topic,
      };
      const fcmResult = await admin.messaging().send(message);
      return { inbox_count: inboxCount, fcm: fcmResult };
    } catch (err) {
      console.error('FCM Send to Topic Error:', err.message);
      throw err;
    }
  }

  /**
   * Send a push notification to a device token and save to the matching inbox when found.
   */
  static async sendToToken(token, title, body, data = {}, options = {}) {
    const persistInbox = options.persistInbox !== false;
    try {
      const inboxSaved = persistInbox ? await this._saveInboxForToken(token, title, body, data) : false;

      if (!admin || !admin.apps.length) {
        console.warn('Firebase Admin not initialized. Skipping FCM push notification.');
        return { inbox_saved: inboxSaved, fcm: null };
      }

      const formattedData = this._formatFcmData(data);
      const message = {
        notification: { title, body },
        data: formattedData,
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            clickAction: 'FLUTTER_NOTIFICATION_CLICK',
          },
        },
        apns: {
          headers: {
            'apns-priority': '10',
          },
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
        },
        token,
      };
      const fcmResult = await admin.messaging().send(message);
      return { inbox_saved: inboxSaved, fcm: fcmResult };
    } catch (err) {
      console.error('FCM Send to Token Error:', err.message);
      throw err;
    }
  }

  static _formatFcmData(data = {}) {
    const formattedData = {};
    if (data && typeof data === 'object') {
      for (const [key, value] of Object.entries(data)) {
        formattedData[key] = String(value);
      }
    }
    return formattedData;
  }

  static async _saveInboxForTopic(topic, title, body, data = {}) {
    const recipients = await this._resolveTopicRecipients(topic);
    let saved = 0;
    for (const recipient of recipients) {
      try {
        await Notification.create({
          user_id: recipient.id,
          user_type: recipient.type,
          title,
          body,
          data_payload: data,
        });
        saved += 1;
      } catch (err) {
        console.error(
          `Failed to save topic notification for ${recipient.type} ID ${recipient.id}:`,
          err.message,
        );
      }
    }
    return saved;
  }

  static async _saveInboxForToken(token, title, body, data = {}) {
    const recipient = await this._findRecipientByFcmToken(token);
    if (!recipient) return false;
    await Notification.create({
      user_id: recipient.id,
      user_type: recipient.type,
      title,
      body,
      data_payload: data,
    });
    return true;
  }

  static async _resolveTopicRecipients(topic) {
    const pool = await poolPromise;

    if (topic === 'staff_notifications') {
      const result = await pool.request().query(`
        SELECT id
        FROM lab_staff
        WHERE is_deleted = 0 AND is_active = 1
      `);
      return result.recordset.map((row) => ({ id: row.id, type: 'staff' }));
    }

    if (topic === 'all_users') {
      const result = await pool.request().query(`
        SELECT id
        FROM users
        WHERE is_deleted = 0 AND is_active = 1
      `);
      return result.recordset.map((row) => ({ id: row.id, type: 'user' }));
    }

    return [];
  }

  static async _findRecipientByFcmToken(token) {
    const pool = await poolPromise;
    const request = pool.request();
    request.input('token', sql.NVarChar(500), token);

    const staffResult = await request.query(`
      SELECT TOP 1 id
      FROM lab_staff
      WHERE is_deleted = 0 AND fcm_token = @token
    `);
    if (staffResult.recordset[0]?.id) {
      return { id: staffResult.recordset[0].id, type: 'staff' };
    }

    const userResult = await pool.request()
      .input('token', sql.NVarChar(500), token)
      .query(`
        SELECT TOP 1 id
        FROM users
        WHERE is_deleted = 0 AND fcm_token = @token
      `);
    if (userResult.recordset[0]?.id) {
      return { id: userResult.recordset[0].id, type: 'user' };
    }

    return null;
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
