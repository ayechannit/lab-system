const { sql, poolPromise } = require('../config/db');

class PointTransaction {
  /**
   * Create a new point transaction log.
   * @param {object} data - The transaction data (user_id, points, transaction_type, description, reference_id, created_user)
   * @returns {Promise<object>} The created transaction record
   */
  static async create(data) {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('user_id', sql.UniqueIdentifier, data.user_id)
      .input('points', sql.Int, data.points)
      .input('transaction_type', sql.NVarChar(50), data.transaction_type)
      .input('description', sql.NVarChar(255), data.description || null)
      .input('reference_id', sql.UniqueIdentifier, data.reference_id || null)
      .input('created_user', sql.UniqueIdentifier, data.created_user || null)
      .query(`
        INSERT INTO point_transactions (id, user_id, points, transaction_type, description, reference_id, created_user, created_at)
        OUTPUT INSERTED.*
        VALUES (NEWID(), @user_id, @points, @transaction_type, @description, @reference_id, @created_user, GETDATE())
      `);
    return result.recordset[0];
  }

  /**
   * Get point transactions for a specific user.
   * @param {string} userId - The user ID to get transactions for
   * @returns {Promise<Array>} List of transactions sorted by newest first
   */
  static async getByUserId(userId) {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('user_id', sql.UniqueIdentifier, userId)
      .query(`
        SELECT pt.*, u.name as user_name, u.email as user_email 
        FROM point_transactions pt
        LEFT JOIN users u ON pt.user_id = u.id
        WHERE pt.user_id = @user_id
        ORDER BY pt.created_at DESC
      `);
    return result.recordset;
  }

  /**
   * Get all point transactions across all users (Admin/Manager view).
   * @returns {Promise<Array>} List of all transactions sorted by newest first
   */
  static async getAll() {
    const pool = await poolPromise;
    const result = await pool.request()
      .query(`
        SELECT pt.*, u.name as user_name, u.email as user_email 
        FROM point_transactions pt
        LEFT JOIN users u ON pt.user_id = u.id
        ORDER BY pt.created_at DESC
      `);
    return result.recordset;
  }
}

module.exports = PointTransaction;
