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

  /**
   * Public (any authenticated user, not just staff) — active referral rates by test,
   * for live pricing display in patient-facing order screens.
   */
  static async getActive() {
    const pool = await poolPromise;
    const result = await pool.request()
      .query('SELECT test_id, referral_percent FROM test_referral_fees WHERE is_active = 1 AND is_deleted = 0');
    return result.recordset;
  }

  /**
   * Orders that actually generated a referral fee (sum of each item's
   * subtotal_mmk * the test's referral_percent), for accounting/reporting.
   * Orders with zero referral fee are excluded.
   */
  static async getOrderReport(filters = {}) {
    const pool = await poolPromise;
    const request = pool.request();

    let where = 'WHERE o.is_deleted = 0';
    if (filters.start_date) {
      request.input('start_date', sql.DateTime2, new Date(filters.start_date));
      where += ' AND o.created_at >= @start_date';
    }
    if (filters.end_date) {
      request.input('end_date', sql.DateTime2, new Date(filters.end_date));
      where += ' AND o.created_at <= @end_date';
    }

    const page = parseInt(filters.page) || 1;
    const limit = parseInt(filters.limit) || 50;
    const offset = (page - 1) * limit;
    request.input('offset', sql.Int, offset);
    request.input('limit', sql.Int, limit);

    const rowsResult = await request.query(`
      SELECT o.id AS order_id, o.patient_name, o.status, o.created_at, o.final_price_mmk,
             SUM(oi.subtotal_mmk * ISNULL(rf.referral_percent, 0) / 100) AS referral_fee_total_mmk
      FROM lab_orders o
      JOIN lab_order_items oi ON oi.order_id = o.id
      LEFT JOIN test_referral_fees rf ON rf.test_id = oi.test_id AND rf.is_active = 1 AND rf.is_deleted = 0
      ${where}
      GROUP BY o.id, o.patient_name, o.status, o.created_at, o.final_price_mmk
      HAVING SUM(oi.subtotal_mmk * ISNULL(rf.referral_percent, 0) / 100) > 0
      ORDER BY o.created_at DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `);

    const summaryRequest = pool.request();
    if (filters.start_date) summaryRequest.input('start_date', sql.DateTime2, new Date(filters.start_date));
    if (filters.end_date) summaryRequest.input('end_date', sql.DateTime2, new Date(filters.end_date));
    const summaryResult = await summaryRequest.query(`
      SELECT
        COUNT(DISTINCT o.id) AS total_orders,
        ISNULL(SUM(oi.subtotal_mmk * ISNULL(rf.referral_percent, 0) / 100), 0) AS total_referral_fee_mmk
      FROM lab_orders o
      JOIN lab_order_items oi ON oi.order_id = o.id
      LEFT JOIN test_referral_fees rf ON rf.test_id = oi.test_id AND rf.is_active = 1 AND rf.is_deleted = 0
      ${where}
      AND (oi.subtotal_mmk * ISNULL(rf.referral_percent, 0) / 100) > 0
    `);

    return {
      rows: rowsResult.recordset,
      total_orders: summaryResult.recordset[0]?.total_orders || 0,
      total_referral_fee_mmk: summaryResult.recordset[0]?.total_referral_fee_mmk || 0,
    };
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
