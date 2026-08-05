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
   * @param {object} filters - Optional filters ({ transaction_type })
   * @returns {Promise<Array>} List of transactions sorted by newest first
   */
  static async getByUserId(userId, filters = {}) {
    const pool = await poolPromise;
    const request = pool.request().input('user_id', sql.UniqueIdentifier, userId);
    let query = `
      SELECT pt.*, u.name as user_name, u.phone as user_phone
      FROM point_transactions pt
      LEFT JOIN users u ON pt.user_id = u.id
      WHERE pt.user_id = @user_id
    `;
    if (filters.transaction_type) {
      request.input('transaction_type', sql.NVarChar(50), filters.transaction_type);
      query += ' AND pt.transaction_type = @transaction_type';
    }
    query += ' ORDER BY pt.created_at DESC';
    const result = await request.query(query);
    return result.recordset;
  }

  /**
   * Get all point transactions across all users (Admin/Manager view).
   * @param {object} filters - Optional filters ({ transaction_type })
   * @returns {Promise<Array>} List of all transactions sorted by newest first
   */
  static async getAll(filters = {}) {
    const pool = await poolPromise;
    const request = pool.request();
    let query = `
      SELECT pt.*, u.name as user_name, u.phone as user_phone
      FROM point_transactions pt
      LEFT JOIN users u ON pt.user_id = u.id
    `;
    if (filters.transaction_type) {
      request.input('transaction_type', sql.NVarChar(50), filters.transaction_type);
      query += ' WHERE pt.transaction_type = @transaction_type';
    }
    query += ' ORDER BY pt.created_at DESC';
    const result = await request.query(query);
    return result.recordset;
  }
}

module.exports = PointTransaction;
