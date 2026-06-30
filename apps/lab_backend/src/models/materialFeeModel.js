const { sql, poolPromise } = require('../config/db');

class MaterialFee {
  static async getAll() {
    const pool = await poolPromise;
    const result = await pool.request()
      .query('SELECT *, created_user, updated_user FROM material_fees WHERE is_deleted = 0 ORDER BY created_at DESC');
    return result.recordset;
  }

  static async getActive() {
    const pool = await poolPromise;
    const result = await pool.request()
      .query('SELECT *, created_user, updated_user FROM material_fees WHERE is_active = 1 AND is_deleted = 0 ORDER BY created_at DESC');
    return result.recordset;
  }

  static async getById(id) {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query('SELECT *, created_user, updated_user FROM material_fees WHERE id = @id AND is_deleted = 0');
    return result.recordset[0];
  }

  static async create(data, createdBy = null) {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('name', sql.NVarChar, data.name)
      .input('amount_mmk', sql.Decimal(18, 2), data.amount_mmk)
      .input('is_active', sql.Bit, data.is_active !== undefined ? data.is_active : 1)
      .input('created_user', sql.UniqueIdentifier, createdBy)
      .query(`
        INSERT INTO material_fees (id, name, amount_mmk, is_active, is_deleted, created_user, updated_user, created_at, updated_at)
        OUTPUT INSERTED.*
        VALUES (NEWID(), @name, @amount_mmk, @is_active, 0, @created_user, @created_user, GETDATE(), GETDATE())
      `);
    return result.recordset[0];
  }

  static async update(id, data, updatedBy = null) {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .input('name', sql.NVarChar, data.name)
      .input('amount_mmk', sql.Decimal(18, 2), data.amount_mmk)
      .input('is_active', sql.Bit, data.is_active !== undefined ? data.is_active : 1)
      .input('updated_user', sql.UniqueIdentifier, updatedBy)
      .query(`
        UPDATE material_fees 
        SET name = @name, 
            amount_mmk = @amount_mmk, 
            is_active = @is_active, 
            updated_user = @updated_user, 
            updated_at = GETDATE()
        OUTPUT INSERTED.*
        WHERE id = @id AND is_deleted = 0
      `);
    return result.recordset[0] ?? null;
  }

  static async delete(id, updatedBy = null) {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .input('updated_user', sql.UniqueIdentifier, updatedBy)
      .query('UPDATE material_fees SET is_deleted = 1, updated_user = @updated_user, updated_at = GETDATE() WHERE id = @id');
    return result.rowsAffected[0] > 0;
  }
}

module.exports = MaterialFee;
