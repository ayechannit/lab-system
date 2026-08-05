const { sql, poolPromise } = require('../config/db');

class Discount {
  /**
   * Upsert a discount percentage for a specific test.
   */
  static async upsert(data, updatedBy = null) {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('test_id', sql.UniqueIdentifier, data.test_id)
      .input('discount_percent', sql.Decimal(5, 2), data.discount_percent)
      .input('is_active', sql.Bit, data.is_active !== undefined ? data.is_active : 1)
      .input('start_date', sql.DateTime2, data.start_date || null)
      .input('end_date', sql.DateTime2, data.end_date || null)
      .input('updated_user', sql.UniqueIdentifier, updatedBy)
      .query(`
        IF EXISTS (SELECT 1 FROM test_specific_discounts WHERE test_id = @test_id)
        BEGIN
            UPDATE test_specific_discounts
            SET discount_percent = @discount_percent, is_active = @is_active, is_deleted = 0,
                start_date = @start_date, end_date = @end_date,
                updated_user = @updated_user, updated_at = GETDATE()
            OUTPUT INSERTED.*
            WHERE test_id = @test_id
        END
        ELSE
        BEGIN
            INSERT INTO test_specific_discounts (id, test_id, discount_percent, is_active, start_date, end_date, is_deleted, created_user, updated_user)
            OUTPUT INSERTED.*
            VALUES (NEWID(), @test_id, @discount_percent, @is_active, @start_date, @end_date, 0, @updated_user, @updated_user)
        END
      `);
    return result.recordset[0];
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
    const result = await pool.request()
      .input('test_id', sql.UniqueIdentifier, test_id)
      .query(`
        SELECT sd.*, t.test_name, t.test_code, t.base_price_mmk as original_price,
               (t.base_price_mmk * (1 - sd.discount_percent / 100)) as after_discount_price
        FROM test_specific_discounts sd
        JOIN lab_test_catalog t ON sd.test_id = t.id
        WHERE sd.test_id = @test_id AND sd.is_deleted = 0 AND t.is_deleted = 0
      `);
    return result.recordset;
  }

  static async getAll(filters = {}) {
    const pool = await poolPromise;
    const request = pool.request();

    let query = `
      SELECT sd.*, t.test_name, t.test_code, t.base_price_mmk as original_price,
             (t.base_price_mmk * (1 - sd.discount_percent / 100)) as after_discount_price
      FROM test_specific_discounts sd
      JOIN lab_test_catalog t ON sd.test_id = t.id
      WHERE sd.is_deleted = 0 AND t.is_deleted = 0
    `;

    if (filters.is_active !== undefined) {
      const activeVal = filters.is_active === 'true' || filters.is_active === true || filters.is_active === '1' ? 1 : 0;
      request.input('is_active', sql.Bit, activeVal);
      query += ` AND sd.is_active = @is_active`;
    }

    if (filters.test_name) {
      request.input('test_name', sql.NVarChar, `%${filters.test_name}%`);
      query += ` AND t.test_name LIKE @test_name`;
    }

    if (filters.test_code) {
      request.input('test_code', sql.NVarChar, `%${filters.test_code}%`);
      query += ` AND t.test_code LIKE @test_code`;
    }

    // Pagination
    const page = parseInt(filters.page) || 1;
    const limit = parseInt(filters.limit) || 50;
    const offset = (page - 1) * limit;

    request.input('offset', sql.Int, offset);
    request.input('limit', sql.Int, limit);

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

    query += ` ORDER BY ${sortBy} ${sortOrder} OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`;

    const result = await request.query(query);
    return result.recordset;
  }

  static async delete(id, updatedBy = null) {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .input('updated_user', sql.UniqueIdentifier, updatedBy)
      .query('UPDATE test_specific_discounts SET is_deleted = 1, updated_user = @updated_user, updated_at = GETDATE() WHERE id = @id');
    return result.rowsAffected[0] > 0;
  }
}

module.exports = Discount;
