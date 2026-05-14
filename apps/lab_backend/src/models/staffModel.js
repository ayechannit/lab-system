const { sql, poolPromise } = require('../config/db');
const bcrypt = require('bcryptjs');

class Staff {
  static async getAll(filters = {}) {
    const pool = await poolPromise;
    const request = pool.request();
    let query = 'SELECT id, name, email, role, is_active, created_user, updated_user, created_at, updated_at FROM lab_staff WHERE is_deleted = 0';

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
      .query('SELECT id, name, email, role, is_active, created_user, updated_user, created_at, updated_at FROM lab_staff WHERE id = @id AND is_deleted = 0');
    return result.recordset[0];
  }

  static async getByEmail(email) {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('email', sql.VarChar, email)
      .query('SELECT * FROM lab_staff WHERE email = @email AND is_deleted = 0');
    return result.recordset[0];
  }

  static async create(data, createdBy = null) {
    const pool = await poolPromise;
    const hashedPassword = await bcrypt.hash(data.password_hash || data.password, 10);
    const result = await pool.request()
      .input('name', sql.VarChar, data.name)
      .input('email', sql.VarChar, data.email)
      .input('password_hash', sql.VarChar, hashedPassword)
      .input('role', sql.VarChar, data.role)
      .input('created_user', sql.UniqueIdentifier, createdBy)
      .query(`
        INSERT INTO lab_staff (id, name, email, password_hash, role, is_active, created_user, updated_user, is_deleted)
        OUTPUT INSERTED.id, INSERTED.name, INSERTED.email, INSERTED.role, INSERTED.is_active, INSERTED.created_user, INSERTED.updated_user, INSERTED.created_at, INSERTED.updated_at
        VALUES (NEWID(), @name, @email, @password_hash, @role, 1, @created_user, @created_user, 0)
      `);
    return result.recordset[0];
  }

  static async update(id, data, updatedBy = null) {
    const pool = await poolPromise;

    let passwordFragment = '';
    let emailFragment = '';
    const request = pool
      .request()
      .input('id', sql.UniqueIdentifier, id)
      .input('name', sql.VarChar, data.name)
      .input('is_active', sql.Bit, data.is_active)
      .input('updated_user', sql.UniqueIdentifier, updatedBy);

    const newPassword = data.password || data.password_hash;
    if (newPassword) {
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      passwordFragment = ', password_hash = @password_hash';
      request.input('password_hash', sql.VarChar, hashedPassword);
    }

    if (data.email !== undefined && data.email !== null && String(data.email).trim() !== '') {
      emailFragment = ', email = @email';
      request.input('email', sql.VarChar, String(data.email).trim().toLowerCase());
    }

    const result = await request.query(`
      UPDATE lab_staff
      SET name = @name, is_active = @is_active, updated_user = @updated_user, updated_at = GETDATE()
          ${emailFragment}
          ${passwordFragment}
      OUTPUT INSERTED.id, INSERTED.name, INSERTED.email, INSERTED.role, INSERTED.is_active, INSERTED.created_user, INSERTED.updated_user, INSERTED.created_at, INSERTED.updated_at
      WHERE id = @id AND is_deleted = 0
    `);
    return result.recordset[0];
  }

  static async delete(id, updatedBy = null) {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .input('updated_user', sql.UniqueIdentifier, updatedBy)
      .query('UPDATE lab_staff SET is_deleted = 1, updated_user = @updated_user, updated_at = GETDATE() WHERE id = @id');
    return result.rowsAffected[0] > 0;
  }
}

module.exports = Staff;

