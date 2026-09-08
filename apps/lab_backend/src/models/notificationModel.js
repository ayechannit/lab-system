const { poolPromise } = require('../config/db');

class Notification {
  /**
   * Save a notification to the database.
   * @param {object} data - Notification details (user_id, user_type, title, body, data_payload)
   * @returns {Promise<object>} The created notification record
   */
  static async create(data) {
    const pool = await poolPromise;
    const result = await pool.query(
      `INSERT INTO notifications (id, user_id, user_type, title, body, data_payload, is_read, is_deleted)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, false, false)
       RETURNING *`,
      [
        data.user_id,
        data.user_type || 'user',
        data.title,
        data.body,
        data.data_payload ? JSON.stringify(data.data_payload) : null,
      ]
    );
    return result.rows[0];
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
    const result = await pool.query(
      `SELECT *
       FROM notifications
       WHERE user_id = $1 AND user_type = $2 AND is_deleted = false
       ORDER BY created_at DESC
       LIMIT $3`,
      [userId, userType, limit]
    );
    return result.rows;
  }

  /**
   * Mark a specific notification as read.
   * @param {string} id - The notification ID
   * @param {string} userId - The unique identifier of the user to ensure ownership
   * @returns {Promise<boolean>} True if marked successfully, false otherwise
   */
  static async markAsRead(id, userId) {
    const pool = await poolPromise;
    const result = await pool.query(
      `UPDATE notifications
       SET is_read = true
       WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    return result.rowCount > 0;
  }

  /**
   * Mark all notifications as read for a user.
   * @param {string} userId - The unique identifier of the user
   * @param {string} userType - The type of user ('user' or 'staff')
   * @returns {Promise<boolean>} True if any were updated, false otherwise
   */
  static async markAllAsRead(userId, userType = 'user') {
    const pool = await poolPromise;
    const result = await pool.query(
      `UPDATE notifications
       SET is_read = true
       WHERE user_id = $1 AND user_type = $2 AND is_read = false`,
      [userId, userType]
    );
    return result.rowCount > 0;
  }
}

module.exports = Notification;
