const { poolPromise } = require('../config/db');

class MaterialFee {
  static async getAll() {
    const pool = await poolPromise;
    const result = await pool.query(
      'SELECT *, created_user, updated_user FROM material_fees WHERE is_deleted = false ORDER BY created_at DESC'
    );
    return result.rows;
  }

  static async getActive() {
    const pool = await poolPromise;
    const result = await pool.query(
      'SELECT *, created_user, updated_user FROM material_fees WHERE is_active = true AND is_deleted = false ORDER BY created_at DESC'
    );
    return result.rows;
  }

  static async getById(id) {
    const pool = await poolPromise;
    const result = await pool.query(
      'SELECT *, created_user, updated_user FROM material_fees WHERE id = $1 AND is_deleted = false',
      [id]
    );
    return result.rows[0];
  }

  static async create(data, createdBy = null) {
    const pool = await poolPromise;
    const result = await pool.query(
      `INSERT INTO material_fees (id, name, amount_mmk, is_active, is_deleted, created_user, updated_user, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $2, $3, false, $4, $4, now(), now())
       RETURNING *`,
      [data.name, data.amount_mmk, data.is_active !== undefined ? data.is_active : true, createdBy]
    );
    return result.rows[0];
  }

  static async update(id, data, updatedBy = null) {
    const pool = await poolPromise;
    const result = await pool.query(
      `UPDATE material_fees
       SET name = $2,
           amount_mmk = $3,
           is_active = $4,
           updated_user = $5,
           updated_at = now()
       WHERE id = $1 AND is_deleted = false
       RETURNING *`,
      [id, data.name, data.amount_mmk, data.is_active !== undefined ? data.is_active : true, updatedBy]
    );
    return result.rows[0] ?? null;
  }

  static async delete(id, updatedBy = null) {
    const pool = await poolPromise;
    const result = await pool.query(
      'UPDATE material_fees SET is_deleted = true, updated_user = $2, updated_at = now() WHERE id = $1',
      [id, updatedBy]
    );
    return result.rowCount > 0;
  }
}

module.exports = MaterialFee;
