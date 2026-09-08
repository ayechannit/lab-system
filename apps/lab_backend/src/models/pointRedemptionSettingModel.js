const { poolPromise } = require('../config/db');

class PointRedemptionSetting {
  static async get() {
    const pool = await poolPromise;
    const result = await pool.query('SELECT * FROM point_redemption_settings LIMIT 1');
    if (result.rows[0]) {
      return result.rows[0];
    }

    const inserted = await pool.query(`
      INSERT INTO point_redemption_settings (mmk_per_point)
      VALUES (0)
      RETURNING *
    `);
    return inserted.rows[0];
  }

  static async update(mmkPerPoint, updatedBy = null) {
    const existing = await this.get();
    const pool = await poolPromise;
    const result = await pool.query(
      `UPDATE point_redemption_settings
       SET mmk_per_point = $2, updated_user = $3, updated_at = now()
       WHERE id = $1
       RETURNING *`,
      [existing.id, mmkPerPoint, updatedBy]
    );
    return result.rows[0];
  }
}

module.exports = PointRedemptionSetting;
