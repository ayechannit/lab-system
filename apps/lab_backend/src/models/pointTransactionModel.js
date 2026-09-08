const { poolPromise } = require('../config/db');

class PointTransaction {
  /**
   * Create a new point transaction log.
   * @param {object} data - The transaction data (user_id, points, transaction_type, description, reference_id, created_user)
   * @returns {Promise<object>} The created transaction record
   */
  static async create(data) {
    const pool = await poolPromise;
    const result = await pool.query(
      `INSERT INTO point_transactions (id, user_id, points, transaction_type, description, reference_id, created_user, created_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, now())
       RETURNING *`,
      [
        data.user_id,
        data.points,
        data.transaction_type,
        data.description || null,
        data.reference_id || null,
        data.created_user || null,
      ]
    );
    return result.rows[0];
  }

  /**
   * Get point transactions for a specific user.
   * @param {string} userId - The user ID to get transactions for
   * @param {object} filters - Optional filters ({ transaction_type })
   * @returns {Promise<Array>} List of transactions sorted by newest first
   */
  static async getByUserId(userId, filters = {}) {
    const pool = await poolPromise;
    const params = [userId];
    let query = `
      SELECT pt.*, u.name as user_name, u.phone as user_phone
      FROM point_transactions pt
      LEFT JOIN users u ON pt.user_id = u.id
      WHERE pt.user_id = $1
    `;
    if (filters.transaction_type) {
      params.push(filters.transaction_type);
      query += ` AND pt.transaction_type = $${params.length}`;
    }
    query += ' ORDER BY pt.created_at DESC';
    const result = await pool.query(query, params);
    return result.rows;
  }

  /**
   * Get all point transactions across all users (Admin/Manager view).
   * @param {object} filters - Optional filters ({ transaction_type })
   * @returns {Promise<Array>} List of all transactions sorted by newest first
   */
  static async getAll(filters = {}) {
    const pool = await poolPromise;
    const params = [];
    let query = `
      SELECT pt.*, u.name as user_name, u.phone as user_phone
      FROM point_transactions pt
      LEFT JOIN users u ON pt.user_id = u.id
    `;
    if (filters.transaction_type) {
      params.push(filters.transaction_type);
      query += ` WHERE pt.transaction_type = $${params.length}`;
    }
    query += ' ORDER BY pt.created_at DESC';
    const result = await pool.query(query, params);
    return result.rows;
  }
}

module.exports = PointTransaction;
