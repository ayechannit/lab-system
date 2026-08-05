const { sql, poolPromise } = require('../config/db');

class ReferralFee {
  /**
   * Upsert a referral fee percentage for a specific test.
   */
  static async upsert(data, updatedBy = null) {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('test_id', sql.UniqueIdentifier, data.test_id)
      .input('referral_percent', sql.Decimal(5, 2), data.referral_percent)
      .input('is_active', sql.Bit, data.is_active !== undefined ? data.is_active : 1)
      .input('updated_user', sql.UniqueIdentifier, updatedBy)
      .query(`
        IF EXISTS (SELECT 1 FROM test_referral_fees WHERE test_id = @test_id)
        BEGIN
            UPDATE test_referral_fees
            SET referral_percent = @referral_percent, is_active = @is_active, is_deleted = 0,
                updated_user = @updated_user, updated_at = GETDATE()
            OUTPUT INSERTED.*
            WHERE test_id = @test_id
        END
        ELSE
        BEGIN
            INSERT INTO test_referral_fees (id, test_id, referral_percent, is_active, is_deleted, created_user, updated_user)
            OUTPUT INSERTED.*
            VALUES (NEWID(), @test_id, @referral_percent, @is_active, 0, @updated_user, @updated_user)
        END
      `);
    return result.recordset[0];
  }

  /**
   * Bulk upsert multiple referral fee percentages, one per test_id.
   */
  static async bulkUpsert(referralsArray, updatedBy = null) {
    const results = [];
    for (const data of referralsArray) {
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
        SELECT rf.*, t.test_name, t.test_code, t.base_price_mmk as original_price,
               (t.base_price_mmk * (rf.referral_percent / 100)) as referral_fee_amount
        FROM test_referral_fees rf
        JOIN lab_test_catalog t ON rf.test_id = t.id
        WHERE rf.test_id = @test_id AND rf.is_deleted = 0 AND t.is_deleted = 0
      `);
    return result.recordset;
  }

  static async getAll(filters = {}) {
    const pool = await poolPromise;
    const request = pool.request();

    let query = `
      SELECT rf.*, t.test_name, t.test_code, t.base_price_mmk as original_price,
             (t.base_price_mmk * (rf.referral_percent / 100)) as referral_fee_amount
      FROM test_referral_fees rf
      JOIN lab_test_catalog t ON rf.test_id = t.id
      WHERE rf.is_deleted = 0 AND t.is_deleted = 0
    `;

    if (filters.is_active !== undefined) {
      const activeVal = filters.is_active === 'true' || filters.is_active === true || filters.is_active === '1' ? 1 : 0;
      request.input('is_active', sql.Bit, activeVal);
      query += ` AND rf.is_active = @is_active`;
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
      const allowedSortFields = ['test_name', 'test_code', 'referral_percent', 'created_at'];
      if (allowedSortFields.includes(filters.sortBy)) {
        sortBy = filters.sortBy === 'test_name' || filters.sortBy === 'test_code' ? `t.${filters.sortBy}` : `rf.${filters.sortBy}`;
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
      .query('UPDATE test_referral_fees SET is_deleted = 1, updated_user = @updated_user, updated_at = GETDATE() WHERE id = @id');
    return result.rowsAffected[0] > 0;
  }
}

module.exports = ReferralFee;
