const { poolPromise } = require('../config/db');

class PointSetting {
  static async getAll() {
    const pool = await poolPromise;
    const result = await pool.query(
      'SELECT * FROM point_settings WHERE is_deleted = false ORDER BY spend_amount_mmk DESC'
    );
    return result.rows;
  }

  static async getActiveRules() {
    const pool = await poolPromise;
    const result = await pool.query(`
      SELECT * FROM point_settings
      WHERE is_active = true
      AND is_deleted = false
      AND (start_date IS NULL OR start_date <= now())
      AND (end_date IS NULL OR end_date >= now())
      ORDER BY spend_amount_mmk DESC
    `);
    return result.rows;
  }

  static async getById(id) {
    const pool = await poolPromise;
    const result = await pool.query(
      'SELECT * FROM point_settings WHERE id = $1 AND is_deleted = false',
      [id]
    );
    return result.rows[0];
  }

  static async create(data, createdBy = null) {
    const pool = await poolPromise;
    const result = await pool.query(
      `INSERT INTO point_settings (id, name, spend_amount_mmk, points_reward, start_date, end_date, is_active, is_deleted, created_user, updated_user)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, false, $7, $7)
       RETURNING *`,
      [
        data.name,
        data.spend_amount_mmk,
        data.points_reward,
        data.start_date || null,
        data.end_date || null,
        data.is_active !== undefined ? data.is_active : true,
        createdBy,
      ]
    );
    return result.rows[0];
  }

  static async update(id, data, updatedBy = null) {
    const pool = await poolPromise;
    const result = await pool.query(
      `UPDATE point_settings
       SET name = $2,
           spend_amount_mmk = $3,
           points_reward = $4,
           start_date = $5,
           end_date = $6,
           is_active = $7,
           updated_user = $8,
           updated_at = now()
       WHERE id = $1 AND is_deleted = false
       RETURNING *`,
      [
        id,
        data.name,
        data.spend_amount_mmk,
        data.points_reward,
        data.start_date || null,
        data.end_date || null,
        data.is_active !== undefined ? data.is_active : true,
        updatedBy,
      ]
    );
    return result.rows[0];
  }

  static async delete(id, updatedBy = null) {
    const pool = await poolPromise;
    const result = await pool.query(
      'UPDATE point_settings SET is_deleted = true, updated_user = $2, updated_at = now() WHERE id = $1',
      [id, updatedBy]
    );
    return result.rowCount > 0;
  }
}

module.exports = PointSetting;
