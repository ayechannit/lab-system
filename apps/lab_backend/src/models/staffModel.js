const { sql, poolPromise } = require('../config/db');

class Staff {
  static async getAll(filters = {}) {
    const pool = await poolPromise;
    const request = pool.request();
    let query = 'SELECT id, name, email, role, is_active, created_at, updated_at FROM lab_staff WHERE is_deleted = 0';

    if (filters.role) {
      query += ' AND role = @role';
      request.input('role', sql.VarChar, filters.role);
    }
    if (filters.name) {
      query += ' AND name LIKE @name';
      request.input('name', sql.VarChar, `%${filters.name}%`);
    }
    if (filters.is_active !== undefined) {
      query += ' AND is_active = @is_active';
      request.input('is_active', sql.Bit, filters.is_active === 'true' || filters.is_active === true ? 1 : 0);
    }

    query += ' ORDER BY created_at DESC';

    if (filters.page && filters.limit) {
      const page = parseInt(filters.page, 10);
      const limit = parseInt(filters.limit, 10);
      const offset = (page - 1) * limit;
      query += ' OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY';
      request.input('offset', sql.Int, offset);
      request.input('limit', sql.Int, limit);
    }

    const result = await request.query(query);
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
