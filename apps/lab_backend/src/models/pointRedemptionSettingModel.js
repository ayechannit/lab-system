const { sql, poolPromise } = require('../config/db');

class PointRedemptionSetting {
  static async get() {
    const pool = await poolPromise;
    const result = await pool.request().query('SELECT TOP 1 * FROM point_redemption_settings');
    if (result.recordset[0]) {
      return result.recordset[0];
    }

    const inserted = await pool.request().query(`
      INSERT INTO point_redemption_settings (mmk_per_point)
      OUTPUT INSERTED.*
      VALUES (0)
    `);
    return inserted.recordset[0];
  }

  static async update(mmkPerPoint, updatedBy = null) {
    const existing = await this.get();
    const pool = await poolPromise;
    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, existing.id)
      .input('mmk_per_point', sql.Decimal(18, 2), mmkPerPoint)
      .input('updated_user', sql.UniqueIdentifier, updatedBy)
      .query(`
        UPDATE point_redemption_settings
        SET mmk_per_point = @mmk_per_point, updated_user = @updated_user, updated_at = GETDATE()
        OUTPUT INSERTED.*
        WHERE id = @id
      `);
    return result.recordset[0];
  }
}

module.exports = PointRedemptionSetting;
