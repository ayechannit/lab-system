const { sql, poolPromise } = require('../config/db');

class Advertisement {
  static async create(data, createdBy = null) {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('title', sql.NVarChar(255), data.title)
      .input('description', sql.NVarChar, data.description || null)
      .input('image_url', sql.NVarChar(2048), data.image_url || null)
      .input('start_date', sql.DateTime2, data.start_date || null)
      .input('end_date', sql.DateTime2, data.end_date || null)
      .input('is_active', sql.Bit, data.is_active !== undefined ? data.is_active : 1)
      .input('created_user', sql.UniqueIdentifier, createdBy)
      .query(`
        INSERT INTO advertisements (id, title, description, image_url, start_date, end_date, is_active, created_user, updated_user, is_deleted)
        OUTPUT INSERTED.*
        VALUES (NEWID(), @title, @description, @image_url, @start_date, @end_date, @is_active, @created_user, @created_user, 0)
      `);
    return result.recordset[0];
  }

  static async getById(id) {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query('SELECT * FROM advertisements WHERE id = @id AND is_deleted = 0');
    return result.recordset[0] ?? null;
  }

  static async getAll(filters = {}) {
    const pool = await poolPromise;
    const request = pool.request();
    let query = 'SELECT * FROM advertisements WHERE is_deleted = 0';

    if (filters.is_active !== undefined) {
      const activeVal = filters.is_active === 'true' || filters.is_active === true || filters.is_active === '1' ? 1 : 0;
      request.input('is_active', sql.Bit, activeVal);
      query += ' AND is_active = @is_active';
    }

    if (filters.title) {
      request.input('title', sql.NVarChar(255), `%${filters.title}%`);
      query += ' AND title LIKE @title';
    }

    if (filters.current_date) {
      // Fetch only advertisements valid on this date
      request.input('current_date', sql.DateTime2, filters.current_date);
      query += ' AND (start_date IS NULL OR start_date <= @current_date) AND (end_date IS NULL OR end_date >= @current_date)';
    }

    // Sorting
    let sortBy = 'created_at';
    let sortOrder = 'DESC';
    if (filters.sortBy) {
      const allowedSortFields = ['title', 'start_date', 'end_date', 'created_at', 'is_active'];
      if (allowedSortFields.includes(filters.sortBy)) {
        sortBy = filters.sortBy;
      }
    }
    if (filters.sortOrder && ['ASC', 'DESC'].includes(filters.sortOrder.toUpperCase())) {
      sortOrder = filters.sortOrder.toUpperCase();
    }
    query += ` ORDER BY ${sortBy} ${sortOrder}`;

    // Pagination
    if (filters.page && filters.limit) {
      const page = parseInt(filters.page) || 1;
      const limit = parseInt(filters.limit) || 10;
      const offset = (page - 1) * limit;
      request.input('offset', sql.Int, offset);
      request.input('limit', sql.Int, limit);
      query += ' OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY';
    }

    const result = await request.query(query);
    return result.recordset;
  }

  static async update(id, data, updatedBy = null) {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .input('title', sql.NVarChar(255), data.title)
      .input('description', sql.NVarChar, data.description || null)
      .input('image_url', sql.NVarChar(2048), data.image_url || null)
      .input('start_date', sql.DateTime2, data.start_date || null)
      .input('end_date', sql.DateTime2, data.end_date || null)
      .input('is_active', sql.Bit, data.is_active !== undefined ? data.is_active : 1)
      .input('updated_user', sql.UniqueIdentifier, updatedBy)
      .query(`
        UPDATE advertisements
        SET title = @title,
            description = @description,
            image_url = @image_url,
            start_date = @start_date,
            end_date = @end_date,
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
      .query('UPDATE advertisements SET is_deleted = 1, updated_user = @updated_user, updated_at = GETDATE() WHERE id = @id AND is_deleted = 0');
    return result.rowsAffected[0] > 0;
  }
}

module.exports = Advertisement;
