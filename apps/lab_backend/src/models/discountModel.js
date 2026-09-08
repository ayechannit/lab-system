const { poolPromise } = require('../config/db');

class Discount {
  /**
   * Upsert a discount percentage for a specific test.
   */
  static async upsert(data, updatedBy = null) {
    const pool = await poolPromise;
    const result = await pool.query(
      `INSERT INTO test_specific_discounts (id, test_id, discount_percent, is_active, start_date, end_date, is_deleted, created_user, updated_user)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, false, $6, $6)
       ON CONFLICT (test_id) DO UPDATE SET
         discount_percent = EXCLUDED.discount_percent,
         is_active = EXCLUDED.is_active,
         is_deleted = false,
         start_date = EXCLUDED.start_date,
         end_date = EXCLUDED.end_date,
         updated_user = EXCLUDED.updated_user,
         updated_at = now()
       RETURNING *`,
      [
        data.test_id,
        data.discount_percent,
        data.is_active !== undefined ? data.is_active : true,
        data.start_date || null,
        data.end_date || null,
        updatedBy,
      ]
    );
    return result.rows[0];
  }

  /**
   * Bulk upsert multiple discount percentages, one per test_id.
   */
  static async bulkUpsert(discountsArray, updatedBy = null) {
    const results = [];
    for (const data of discountsArray) {
      const res = await this.upsert(data, updatedBy);
      results.push(res);
    }
    return results;
  }

  static async getByTestId(test_id) {
    const pool = await poolPromise;
    const result = await pool.query(
      `SELECT sd.*, t.test_name, t.test_code, t.base_price_mmk as original_price,
              (t.base_price_mmk * (1 - sd.discount_percent / 100)) as after_discount_price
       FROM test_specific_discounts sd
       JOIN lab_test_catalog t ON sd.test_id = t.id
       WHERE sd.test_id = $1 AND sd.is_deleted = false AND t.is_deleted = false`,
      [test_id]
    );
    return result.rows;
  }

  static async getAll(filters = {}) {
    const pool = await poolPromise;
    const params = [];

    let query = `
      SELECT sd.*, t.test_name, t.test_code, t.base_price_mmk as original_price,
             (t.base_price_mmk * (1 - sd.discount_percent / 100)) as after_discount_price
      FROM test_specific_discounts sd
      JOIN lab_test_catalog t ON sd.test_id = t.id
      WHERE sd.is_deleted = false AND t.is_deleted = false
    `;

    if (filters.is_active !== undefined) {
      const activeVal = filters.is_active === 'true' || filters.is_active === true || filters.is_active === '1';
      params.push(activeVal);
      query += ` AND sd.is_active = $${params.length}`;
    }

    if (filters.test_name) {
      params.push(`%${filters.test_name}%`);
      query += ` AND t.test_name ILIKE $${params.length}`;
    }

    if (filters.test_code) {
      params.push(`%${filters.test_code}%`);
      query += ` AND t.test_code ILIKE $${params.length}`;
    }

    // Sorting
    let sortBy = 't.test_name';
    let sortOrder = 'ASC';
    if (filters.sortBy) {
      const allowedSortFields = ['created_at', 'updated_at', 'discount_percent', 'test_name'];
      if (allowedSortFields.includes(filters.sortBy)) {
        sortBy = filters.sortBy === 'test_name' ? `t.${filters.sortBy}` : `sd.${filters.sortBy}`;
      }
    }
    if (filters.sortOrder && ['ASC', 'DESC'].includes(filters.sortOrder.toUpperCase())) {
      sortOrder = filters.sortOrder.toUpperCase();
    }

    // Pagination
    const page = parseInt(filters.page) || 1;
    const limit = parseInt(filters.limit) || 50;
    const offset = (page - 1) * limit;

    params.push(limit);
    const limitIdx = params.length;
    params.push(offset);
    const offsetIdx = params.length;

    query += ` ORDER BY ${sortBy} ${sortOrder} LIMIT $${limitIdx} OFFSET $${offsetIdx}`;

    const result = await pool.query(query, params);
    return result.rows;
  }

  static async delete(id, updatedBy = null) {
    const pool = await poolPromise;
    const result = await pool.query(
      'UPDATE test_specific_discounts SET is_deleted = true, updated_user = $2, updated_at = now() WHERE id = $1',
      [id, updatedBy]
    );
    return result.rowCount > 0;
  }
}

module.exports = Discount;
