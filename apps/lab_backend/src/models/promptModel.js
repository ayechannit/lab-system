const { poolPromise } = require('../config/db');

class Prompt {
  static async getAll() {
    const pool = await poolPromise;
    const result = await pool.query(
      'SELECT * FROM ai_prompts WHERE is_deleted = false ORDER BY created_at DESC'
    );
    return result.rows;
  }

  static async getById(id) {
    const pool = await poolPromise;
    const result = await pool.query(
      'SELECT * FROM ai_prompts WHERE id = $1 AND is_deleted = false',
      [id]
    );
    return result.rows[0];
  }

  static async create(data, createdBy = null) {
    const pool = await poolPromise;
    const result = await pool.query(
      `INSERT INTO ai_prompts (name, prompt_text, created_user, updated_user)
       VALUES ($1, $2, $3, $3)
       RETURNING *`,
      [data.name, data.prompt_text, createdBy]
    );
    return result.rows[0];
  }

  static async update(id, data, updatedBy = null) {
    const pool = await poolPromise;
    const result = await pool.query(
      `UPDATE ai_prompts
       SET name = $2, prompt_text = $3,
           updated_user = $4, updated_at = now()
       WHERE id = $1 AND is_deleted = false
       RETURNING *`,
      [id, data.name, data.prompt_text, updatedBy]
    );
    return result.rows[0];
  }

  static async delete(id, updatedBy = null) {
    const pool = await poolPromise;
    const result = await pool.query(
      `UPDATE ai_prompts
       SET is_deleted = true, updated_user = $2, updated_at = now()
       WHERE id = $1`,
      [id, updatedBy]
    );
    return result.rowCount > 0;
  }
}

module.exports = Prompt;
