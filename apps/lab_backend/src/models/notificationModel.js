const { sql, poolPromise } = require('../config/db');

class Notification {
  /**
   * Save a notification to the database.
   * @param {object} data - Notification details (user_id, user_type, title, body, data_payload)
   * @returns {Promise<object>} The created notification record
   */
  static async create(data) {
    const pool = await poolPromise;
    const request = pool.request();
    request.input('user_id', sql.UniqueIdentifier, data.user_id);
    request.input('user_type', sql.NVarChar(50), data.user_type || 'user');
    request.input('title', sql.NVarChar(255), data.title);
    request.input('body', sql.NVarChar(sql.MAX), data.body);
    request.input('data_payload', sql.NVarChar(sql.MAX), data.data_payload ? JSON.stringify(data.data_payload) : null);

    const result = await request.query(`
      INSERT INTO notifications (id, user_id, user_type, title, body, data_payload, is_read, is_deleted)
      OUTPUT INSERTED.*
      VALUES (NEWID(), @user_id, @user_type, @title, @body, @data_payload, 0, 0)
    `);
    return result.recordset[0];
  }

  /**
   * Get notification history for a user or staff member.
   * @param {string} userId - The unique identifier of the user or staff
   * @param {string} userType - The type of user ('user' or 'staff')
   * @param {number} limit - Maximum number of notifications to retrieve
   * @returns {Promise<Array>} List of notifications
   */
  static async getByUserId(userId, userType = 'user', limit = 50) {
    const pool = await poolPromise;
    const request = pool.request();
    request.input('user_id', sql.UniqueIdentifier, userId);
    request.input('user_type', sql.NVarChar(50), userType);
    request.input('limit', sql.Int, limit);

    const result = await request.query(`
      SELECT TOP (@limit) *
      FROM notifications
      WHERE user_id = @user_id AND user_type = @user_type AND is_deleted = 0
      ORDER BY created_at DESC
    `);
    return result.recordset;
  }

  /**
   * Mark a specific notification as read.
   * @param {string} id - The notification ID
   * @param {string} userId - The unique identifier of the user to ensure ownership
   * @returns {Promise<boolean>} True if marked successfully, false otherwise
   */
  static async markAsRead(id, userId) {
    const pool = await poolPromise;
    const request = pool.request();
    request.input('id', sql.UniqueIdentifier, id);
    request.input('user_id', sql.UniqueIdentifier, userId);

    const result = await request.query(`
      UPDATE notifications
      SET is_read = 1
      WHERE id = @id AND user_id = @user_id
    `);
    return result.rowsAffected[0] > 0;
  }

  /**
   * Mark all notifications as read for a user.
   * @param {string} userId - The unique identifier of the user
   * @param {string} userType - The type of user ('user' or 'staff')
   * @returns {Promise<boolean>} True if any were updated, false otherwise
   */
  static async markAllAsRead(userId, userType = 'user') {
    const pool = await poolPromise;
    const request = pool.request();
    request.input('user_id', sql.UniqueIdentifier, userId);
    request.input('user_type', sql.NVarChar(50), userType);

    const result = await request.query(`
      UPDATE notifications
      SET is_read = 1
      WHERE user_id = @user_id AND user_type = @user_type AND is_read = 0
    `);
    return result.rowsAffected[0] > 0;
  }
}

module.exports = Notification;
