const { poolPromise } = require('../config/db');

class AiConfig {
  static async getAll() {
    const pool = await poolPromise;
    const result = await pool.query(
      'SELECT * FROM ai_configs WHERE is_deleted = false ORDER BY created_at DESC'
    );
    return result.rows;
  }

  static async getById(id) {
    const pool = await poolPromise;
    const result = await pool.query(
      'SELECT * FROM ai_configs WHERE id = $1 AND is_deleted = false',
      [id]
    );
    return result.rows[0];
  }

  static async create(data, createdBy = null) {
    const pool = await poolPromise;
    const result = await pool.query(
      `INSERT INTO ai_configs (model_name, api_key, type, created_user, updated_user)
       VALUES ($1, $2, $3, $4, $4)
       RETURNING *`,
      [data.model_name, data.api_key, data.type, createdBy]
    );
    return result.rows[0];
  }

  static async update(id, data, updatedBy = null) {
    const pool = await poolPromise;
    const result = await pool.query(
      `UPDATE ai_configs
       SET model_name = $2, api_key = $3, type = $4,
           updated_user = $5, updated_at = now()
       WHERE id = $1 AND is_deleted = false
       RETURNING *`,
      [id, data.model_name, data.api_key, data.type, updatedBy]
    );
    return result.rows[0];
  }

  static async delete(id, updatedBy = null) {
    const pool = await poolPromise;
    const result = await pool.query(
      `UPDATE ai_configs
       SET is_deleted = true, updated_user = $2, updated_at = now()
       WHERE id = $1`,
      [id, updatedBy]
    );
    return result.rowCount > 0;
  }
}

module.exports = AiConfig;
