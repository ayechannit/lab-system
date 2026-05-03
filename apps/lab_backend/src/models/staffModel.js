const { sql, poolPromise } = require('../config/db');

class Staff {
  static async getAll() {
    const pool = await poolPromise;
    const result = await pool.request().query('SELECT * FROM lab_staff WHERE is_deleted = 0');
    return result.recordset;
  }

  static async getById(id) {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query('SELECT * FROM lab_staff WHERE id = @id AND is_deleted = 0');
    return result.recordset[0];
  }

  static async create(data) {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('name', sql.VarChar, data.name)
      .input('email', sql.VarChar, data.email)
      .input('password_hash', sql.VarChar, data.password_hash)
      .input('role', sql.VarChar, data.role)
      .query(`
        INSERT INTO lab_staff (id, name, email, password_hash, role, is_active, is_deleted)
        OUTPUT INSERTED.*
        VALUES (NEWID(), @name, @email, @password_hash, @role, 1, 0)
      `);
    return result.recordset[0];
  }

  static async update(id, data) {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .input('name', sql.VarChar, data.name)
      .input('email', sql.VarChar, data.email)
      .input('role', sql.VarChar, data.role)
      .input('is_active', sql.Bit, data.is_active)
      .query(`
        UPDATE lab_staff
        SET name = @name, email = @email, role = @role, is_active = @is_active, updated_at = GETDATE()
        OUTPUT INSERTED.*
        WHERE id = @id AND is_deleted = 0
      `);
    return result.recordset[0];
  }

  static async delete(id) {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query('UPDATE lab_staff SET is_deleted = 1, updated_at = GETDATE() WHERE id = @id');
    return result.rowsAffected[0] > 0;
  }
}

module.exports = Staff;
