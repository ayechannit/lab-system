const { sql, poolPromise } = require('../config/db');
const bcrypt = require('bcryptjs');

class User {
  static async getAll(filters = {}) {
    const pool = await poolPromise;
    const request = pool.request();
    let query = 'SELECT id, name, email, phone, role, address, latitude, longitude, total_points, created_user, updated_user, created_at, updated_at FROM users WHERE is_deleted = 0';

    if (filters.role) {
      query += ' AND role = @role';
      request.input('role', sql.VarChar, filters.role);
    }
    if (filters.name) {
      query += ' AND name LIKE @name';
      request.input('name', sql.VarChar, `%${filters.name}%`);
    }
    if (filters.phone) {
      query += ' AND phone LIKE @phone';
      request.input('phone', sql.VarChar, `%${filters.phone}%`);
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
      .query('SELECT id, name, email, phone, role, address, latitude, longitude, total_points, created_user, updated_user, created_at, updated_at FROM users WHERE id = @id AND is_deleted = 0');
    return result.recordset[0];
  }

  static async getByEmail(email) {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('email', sql.VarChar, email)
      .query('SELECT * FROM users WHERE email = @email AND is_deleted = 0');
    return result.recordset[0];
  }

  static async create(data, createdBy = null) {
    const pool = await poolPromise;
    const hashedPassword = await bcrypt.hash(data.password_hash || data.password, 10);
    const result = await pool.request()
      .input('name', sql.VarChar, data.name)
      .input('email', sql.VarChar, data.email)
      .input('phone', sql.VarChar, data.phone)
      .input('password_hash', sql.VarChar, hashedPassword)
      .input('role', sql.VarChar, data.role)
      .input('address', sql.Text, data.address)
      .input('latitude', sql.Float, data.latitude)
      .input('longitude', sql.Float, data.longitude)
      .input('created_user', sql.UniqueIdentifier, createdBy)
      .query(`
        INSERT INTO users (id, name, email, phone, password_hash, role, address, latitude, longitude, total_points, created_user, updated_user, is_deleted)
        OUTPUT INSERTED.id, INSERTED.name, INSERTED.email, INSERTED.phone, INSERTED.role, INSERTED.address, INSERTED.latitude, INSERTED.longitude, INSERTED.total_points, INSERTED.created_user, INSERTED.updated_user, INSERTED.created_at, INSERTED.updated_at
        VALUES (NEWID(), @name, @email, @phone, @password_hash, @role, @address, @latitude, @longitude, 0, @created_user, @created_user, 0)
      `);
    return result.recordset[0];
  }

  static async update(id, data, updatedBy = null) {
    const pool = await poolPromise;
    
    let passwordFragment = '';
    const request = pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .input('name', sql.VarChar, data.name)
      .input('email', sql.VarChar, data.email)
      .input('phone', sql.VarChar, data.phone)
      .input('role', sql.VarChar, data.role)
      .input('address', sql.Text, data.address)
      .input('latitude', sql.Float, data.latitude)
      .input('longitude', sql.Float, data.longitude)
      .input('total_points', sql.Int, data.total_points)
      .input('updated_user', sql.UniqueIdentifier, updatedBy);

    const newPassword = data.password || data.password_hash;
    if (newPassword) {
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      passwordFragment = ', password_hash = @password_hash';
      request.input('password_hash', sql.VarChar, hashedPassword);
    }

    const result = await request.query(`
      UPDATE users
      SET name = @name, email = @email, phone = @phone, role = @role, 
          address = @address, latitude = @latitude, longitude = @longitude, 
          total_points = @total_points, updated_user = @updated_user, updated_at = GETDATE()
          ${passwordFragment}
      OUTPUT INSERTED.id, INSERTED.name, INSERTED.email, INSERTED.phone, INSERTED.role, INSERTED.address, INSERTED.latitude, INSERTED.longitude, INSERTED.total_points, INSERTED.created_user, INSERTED.updated_user, INSERTED.created_at, INSERTED.updated_at
      WHERE id = @id AND is_deleted = 0
    `);
    return result.recordset[0];
  }

  static async addPoints(id, pointsToAdd, updatedBy = null) {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .input('points', sql.Int, pointsToAdd)
      .input('updated_user', sql.UniqueIdentifier, updatedBy)
      .query(`
        UPDATE users 
        SET total_points = total_points + @points, updated_user = @updated_user, updated_at = GETDATE()
        OUTPUT INSERTED.id, INSERTED.name, INSERTED.email, INSERTED.phone, INSERTED.role, INSERTED.address, INSERTED.latitude, INSERTED.longitude, INSERTED.total_points, INSERTED.created_user, INSERTED.updated_user, INSERTED.created_at, INSERTED.updated_at
        WHERE id = @id AND is_deleted = 0
      `);
    return result.recordset[0];
  }

  static async delete(id, updatedBy = null) {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .input('updated_user', sql.UniqueIdentifier, updatedBy)
      .query('UPDATE users SET is_deleted = 1, updated_user = @updated_user, updated_at = GETDATE() WHERE id = @id');
    return result.rowsAffected[0] > 0;
  }
}

module.exports = User;

