const { sql, poolPromise } = require('../config/db');

class User {
  static async getAll(filters = {}) {
    const pool = await poolPromise;
    const request = pool.request();
    let query = 'SELECT * FROM users WHERE is_deleted = 0';

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
      .query('SELECT * FROM users WHERE id = @id AND is_deleted = 0');
    return result.recordset[0];
  }

  static async create(data) {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('name', sql.VarChar, data.name)
      .input('email', sql.VarChar, data.email)
      .input('phone', sql.VarChar, data.phone)
      .input('password_hash', sql.VarChar, data.password_hash)
      .input('role', sql.VarChar, data.role)
      .input('address', sql.Text, data.address)
      .input('latitude', sql.Float, data.latitude)
      .input('longitude', sql.Float, data.longitude)
      .query(`
        INSERT INTO users (id, name, email, phone, password_hash, role, address, latitude, longitude, total_points, is_deleted)
        OUTPUT INSERTED.*
        VALUES (NEWID(), @name, @email, @phone, @password_hash, @role, @address, @latitude, @longitude, 0, 0)
      `);
    return result.recordset[0];
  }

  static async update(id, data) {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .input('name', sql.VarChar, data.name)
      .input('email', sql.VarChar, data.email)
      .input('phone', sql.VarChar, data.phone)
      .input('role', sql.VarChar, data.role)
      .input('address', sql.Text, data.address)
      .input('latitude', sql.Float, data.latitude)
      .input('longitude', sql.Float, data.longitude)
      .input('total_points', sql.Int, data.total_points)
      .query(`
        UPDATE users
        SET name = @name, email = @email, phone = @phone, role = @role, 
            address = @address, latitude = @latitude, longitude = @longitude, 
            total_points = @total_points, updated_at = GETDATE()
        OUTPUT INSERTED.*
        WHERE id = @id AND is_deleted = 0
      `);
    return result.recordset[0];
  }

  static async delete(id) {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query('UPDATE users SET is_deleted = 1, updated_at = GETDATE() WHERE id = @id');
    return result.rowsAffected[0] > 0;
  }
}

module.exports = User;
