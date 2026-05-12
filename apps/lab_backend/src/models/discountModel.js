const { sql, poolPromise } = require('../config/db');

class Discount {
  /**
   * Upsert a discount for a specific test and role.
   * If role is 'all', it applies to clinic, doctor, and patient.
   */
  static async upsert(data, updatedBy = null) {
    const pool = await poolPromise;
    const roles = data.role === 'all' ? ['clinic', 'doctor', 'patient'] : [data.role];
    const results = [];

    for (const role of roles) {
      const result = await pool.request()
        .input('test_id', sql.UniqueIdentifier, data.test_id)
        .input('role', sql.VarChar, role)
        .input('discount_percent', sql.Decimal(5, 2), data.discount_percent)
        .input('is_active', sql.Bit, data.is_active !== undefined ? data.is_active : 1)
        .input('updated_user', sql.UniqueIdentifier, updatedBy)
        .query(`
          IF EXISTS (SELECT 1 FROM test_specific_discounts WHERE test_id = @test_id AND role = @role)
          BEGIN
              UPDATE test_specific_discounts 
              SET discount_percent = @discount_percent, is_active = @is_active, is_deleted = 0, 
                  updated_user = @updated_user, updated_at = GETDATE()
              OUTPUT INSERTED.*
              WHERE test_id = @test_id AND role = @role
          END
          ELSE
          BEGIN
              INSERT INTO test_specific_discounts (id, test_id, role, discount_percent, is_active, is_deleted, created_user, updated_user)
              OUTPUT INSERTED.*
              VALUES (NEWID(), @test_id, @role, @discount_percent, @is_active, 0, @updated_user, @updated_user)
          END
        `);
      results.push(result.recordset[0]);
    }
    return results;
  }

  /**
   * Bulk upsert multiple discounts.
   */
  static async bulkUpsert(discountsArray, updatedBy = null) {
    const results = [];
    for (const data of discountsArray) {
      const res = await this.upsert(data, updatedBy);
      results.push(...res);
    }
    return results;
  }

  static async getByTestIdAndRole(test_id, role) {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('test_id', sql.UniqueIdentifier, test_id)
      .input('role', sql.VarChar, role)
      .query(`
        SELECT sd.*, t.test_name, t.test_code, t.base_price_mmk as original_price,
               (t.base_price_mmk * (1 - sd.discount_percent / 100)) as after_discount_price,
               sd.created_user, sd.updated_user
        FROM test_specific_discounts sd
        JOIN lab_test_catalog t ON sd.test_id = t.id
        WHERE sd.test_id = @test_id AND sd.role = @role AND sd.is_deleted = 0 AND t.is_deleted = 0
      `);
    return result.recordset[0]; // Return a single object or undefined
  }

  static async getByTestId(test_id) {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('test_id', sql.UniqueIdentifier, test_id)
      .query(`
        SELECT sd.*, t.test_name, t.test_code, t.base_price_mmk as original_price,
               (t.base_price_mmk * (1 - sd.discount_percent / 100)) as after_discount_price,
               sd.created_user, sd.updated_user
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
             (t.base_price_mmk * (1 - sd.discount_percent / 100)) as after_discount_price,
             sd.created_user, sd.updated_user
      FROM test_specific_discounts sd
      JOIN lab_test_catalog t ON sd.test_id = t.id
      WHERE sd.is_deleted = 0 AND t.is_deleted = 0
    `;

    if (filters.role) {
      query += ` AND sd.role = @role`;
      request.input('role', sql.VarChar, filters.role);
    }
    if (filters.test_id) {
      query += ` AND sd.test_id = @test_id`;
      request.input('test_id', sql.UniqueIdentifier, filters.test_id);
    }
    if (filters.is_active !== undefined) {
      query += ` AND sd.is_active = @is_active`;
      request.input('is_active', sql.Bit, filters.is_active === 'true' || filters.is_active === true ? 1 : 0);
    }
    if (filters.test_name) {
      query += ` AND t.test_name LIKE @test_name`;
      request.input('test_name', sql.VarChar, `%${filters.test_name}%`);
    }
    if (filters.test_code) {
      query += ` AND t.test_code LIKE @test_code`;
      request.input('test_code', sql.VarChar, `%${filters.test_code}%`);
    }

    query += ` ORDER BY sd.created_at DESC`;

    if (filters.page && filters.limit) {
      const page = parseInt(filters.page, 10);
      const limit = parseInt(filters.limit, 10);
      const offset = (page - 1) * limit;
      query += ` OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`;
      request.input('offset', sql.Int, offset);
      request.input('limit', sql.Int, limit);
    }

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
