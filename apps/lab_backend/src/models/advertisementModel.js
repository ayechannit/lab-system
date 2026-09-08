const { poolPromise } = require('../config/db');

class Advertisement {
  static async create(data, createdBy = null) {
    const pool = await poolPromise;
    const result = await pool.query(
      `INSERT INTO advertisements (id, title, description, image_url, start_date, end_date, is_active, created_user, updated_user, is_deleted)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $7, false)
       RETURNING *`,
      [
        data.title,
        data.description || null,
        data.image_url || null,
        data.start_date || null,
        data.end_date || null,
        data.is_active !== undefined ? data.is_active : true,
        createdBy,
      ]
    );
    return result.rows[0];
  }

  static async getById(id) {
    const pool = await poolPromise;
    const result = await pool.query(
      'SELECT * FROM advertisements WHERE id = $1 AND is_deleted = false',
      [id]
    );
    return result.rows[0] ?? null;
  }

  static async getAll(filters = {}) {
    const pool = await poolPromise;
    const params = [];
    let query = 'SELECT * FROM advertisements WHERE is_deleted = false';

    if (filters.is_active !== undefined) {
      const activeVal = filters.is_active === 'true' || filters.is_active === true || filters.is_active === '1';
      params.push(activeVal);
      query += ` AND is_active = $${params.length}`;
    }

    if (filters.title) {
      params.push(`%${filters.title}%`);
      query += ` AND title ILIKE $${params.length}`;
    }

    if (filters.current_date) {
      // Fetch only advertisements valid on this date
      params.push(filters.current_date);
      query += ` AND (start_date IS NULL OR start_date <= $${params.length}) AND (end_date IS NULL OR end_date >= $${params.length})`;
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
      params.push(limit);
      query += ` LIMIT $${params.length}`;
      params.push(offset);
      query += ` OFFSET $${params.length}`;
    }

    const result = await pool.query(query, params);
    return result.rows;
  }

  static async update(id, data, updatedBy = null) {
    const pool = await poolPromise;
    const result = await pool.query(
      `UPDATE advertisements
       SET title = $2,
           description = $3,
           image_url = $4,
           start_date = $5,
           end_date = $6,
           is_active = $7,
           updated_user = $8,
           updated_at = now()
       WHERE id = $1 AND is_deleted = false
       RETURNING *`,
      [
        id,
        data.title,
        data.description || null,
        data.image_url || null,
        data.start_date || null,
        data.end_date || null,
        data.is_active !== undefined ? data.is_active : true,
        updatedBy,
      ]
    );
    return result.rows[0] ?? null;
  }

  static async delete(id, updatedBy = null) {
    const pool = await poolPromise;
    const result = await pool.query(
      'UPDATE advertisements SET is_deleted = true, updated_user = $2, updated_at = now() WHERE id = $1 AND is_deleted = false',
      [id, updatedBy]
    );
    return result.rowCount > 0;
  }
}

module.exports = Advertisement;
