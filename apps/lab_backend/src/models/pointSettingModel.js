const { sql, poolPromise } = require('../config/db');

class PointSetting {
  static async getAll() {
    const pool = await poolPromise;
    const result = await pool.request()
      .query('SELECT * FROM point_settings WHERE is_deleted = 0 ORDER BY spend_amount_mmk DESC');
    return result.recordset;
  }

  static async getActiveRules() {
    const pool = await poolPromise;
    const result = await pool.request()
      .query(`
        SELECT * FROM point_settings 
        WHERE is_active = 1 
        AND is_deleted = 0 
        AND (start_date IS NULL OR start_date <= GETDATE())
        AND (end_date IS NULL OR end_date >= GETDATE())
        ORDER BY spend_amount_mmk DESC
      `);
    return result.recordset;
  }

  static async getById(id) {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query('SELECT * FROM point_settings WHERE id = @id AND is_deleted = 0');
    return result.recordset[0];
  }

  static async create(data) {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('name', sql.VarChar, data.name)
      .input('spend_amount_mmk', sql.Decimal(18, 2), data.spend_amount_mmk)
      .input('points_reward', sql.Int, data.points_reward)
      .input('start_date', sql.DateTime, data.start_date || null)
      .input('end_date', sql.DateTime, data.end_date || null)
      .input('is_active', sql.Bit, data.is_active !== undefined ? data.is_active : 1)
      .query(`
        INSERT INTO point_settings (id, name, spend_amount_mmk, points_reward, start_date, end_date, is_active, is_deleted)
        OUTPUT INSERTED.*
        VALUES (NEWID(), @name, @spend_amount_mmk, @points_reward, @start_date, @end_date, @is_active, 0)
      `);
    return result.recordset[0];
  }

  static async update(id, data) {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .input('name', sql.VarChar, data.name)
      .input('spend_amount_mmk', sql.Decimal(18, 2), data.spend_amount_mmk)
      .input('points_reward', sql.Int, data.points_reward)
      .input('start_date', sql.DateTime, data.start_date || null)
      .input('end_date', sql.DateTime, data.end_date || null)
      .input('is_active', sql.Bit, data.is_active !== undefined ? data.is_active : 1)
      .query(`
        UPDATE point_settings 
        SET name = @name, 
            spend_amount_mmk = @spend_amount_mmk, 
            points_reward = @points_reward, 
            start_date = @start_date,
            end_date = @end_date,
            is_active = @is_active, 
            updated_at = GETDATE()
        OUTPUT INSERTED.*
        WHERE id = @id AND is_deleted = 0
      `);
    return result.recordset[0];
  }

  static async delete(id) {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query('UPDATE point_settings SET is_deleted = 1, updated_at = GETDATE() WHERE id = @id');
    return result.rowsAffected[0] > 0;
  }
}

module.exports = PointSetting;