const { poolPromise } = require('../config/db');

class ReferralFee {
  /**
   * Upsert a referral fee percentage for a specific test.
   */
  static async upsert(data, updatedBy = null) {
    const pool = await poolPromise;
    const result = await pool.query(
      `INSERT INTO test_referral_fees (id, test_id, referral_percent, is_active, is_deleted, created_user, updated_user)
       VALUES (gen_random_uuid(), $1, $2, $3, false, $4, $4)
       ON CONFLICT (test_id) DO UPDATE SET
         referral_percent = EXCLUDED.referral_percent,
         is_active = EXCLUDED.is_active,
         is_deleted = false,
         updated_user = EXCLUDED.updated_user,
         updated_at = now()
       RETURNING *`,
      [data.test_id, data.referral_percent, data.is_active !== undefined ? data.is_active : true, updatedBy]
    );
    return result.rows[0];
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
    const result = await pool.query(
      `SELECT rf.*, t.test_name, t.test_code, t.base_price_mmk as original_price,
              ROUND(t.base_price_mmk * (rf.referral_percent / 100), 2) as referral_fee_amount
       FROM test_referral_fees rf
       JOIN lab_test_catalog t ON rf.test_id = t.id
       WHERE rf.test_id = $1 AND rf.is_deleted = false AND t.is_deleted = false`,
      [test_id]
    );
    return result.rows;
  }

  static async getAll(filters = {}) {
    const pool = await poolPromise;
    const params = [];

    let query = `
      SELECT rf.*, t.test_name, t.test_code, t.base_price_mmk as original_price,
             ROUND(t.base_price_mmk * (rf.referral_percent / 100), 2) as referral_fee_amount
      FROM test_referral_fees rf
      JOIN lab_test_catalog t ON rf.test_id = t.id
      WHERE rf.is_deleted = false AND t.is_deleted = false
    `;

    if (filters.is_active !== undefined) {
      const activeVal = filters.is_active === 'true' || filters.is_active === true || filters.is_active === '1';
      params.push(activeVal);
      query += ` AND rf.is_active = $${params.length}`;
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
      const allowedSortFields = ['test_name', 'test_code', 'referral_percent', 'created_at'];
      if (allowedSortFields.includes(filters.sortBy)) {
        sortBy = filters.sortBy === 'test_name' || filters.sortBy === 'test_code' ? `t.${filters.sortBy}` : `rf.${filters.sortBy}`;
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

  /**
   * Public (any authenticated user, not just staff) — active referral rates by test,
   * for live pricing display in patient-facing order screens.
   */
  static async getActive() {
    const pool = await poolPromise;
    const result = await pool.query(
      'SELECT test_id, referral_percent FROM test_referral_fees WHERE is_active = true AND is_deleted = false'
    );
    return result.rows;
  }

  /**
   * Orders that actually generated a referral fee (sum of each item's
   * subtotal_mmk * the test's referral_percent), for accounting/reporting.
   * Orders with zero referral fee are excluded.
   */
  static async getOrderReport(filters = {}) {
    const pool = await poolPromise;

    const params = [];
    let where = 'WHERE o.is_deleted = false';
    if (filters.start_date) {
      params.push(new Date(filters.start_date));
      where += ` AND o.created_at >= $${params.length}`;
    }
    if (filters.end_date) {
      params.push(new Date(filters.end_date));
      where += ` AND o.created_at <= $${params.length}`;
    }

    const page = parseInt(filters.page) || 1;
    const limit = parseInt(filters.limit) || 50;
    const offset = (page - 1) * limit;

    const rowsParams = [...params, limit, offset];
    const rowsResult = await pool.query(
      `SELECT o.id AS order_id, o.patient_name, o.status, o.created_at, o.final_price_mmk,
              ROUND(SUM(oi.subtotal_mmk * COALESCE(rf.referral_percent, 0) / 100), 2) AS referral_fee_total_mmk
       FROM lab_orders o
       JOIN lab_order_items oi ON oi.order_id = o.id
       LEFT JOIN test_referral_fees rf ON rf.test_id = oi.test_id AND rf.is_active = true AND rf.is_deleted = false
       ${where}
       GROUP BY o.id, o.patient_name, o.status, o.created_at, o.final_price_mmk
       HAVING SUM(oi.subtotal_mmk * COALESCE(rf.referral_percent, 0) / 100) > 0
       ORDER BY o.created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      rowsParams
    );

    const summaryResult = await pool.query(
      `SELECT
         COUNT(DISTINCT o.id) AS total_orders,
         COALESCE(ROUND(SUM(oi.subtotal_mmk * COALESCE(rf.referral_percent, 0) / 100), 2), 0) AS total_referral_fee_mmk
       FROM lab_orders o
       JOIN lab_order_items oi ON oi.order_id = o.id
       LEFT JOIN test_referral_fees rf ON rf.test_id = oi.test_id AND rf.is_active = true AND rf.is_deleted = false
       ${where}
       AND (oi.subtotal_mmk * COALESCE(rf.referral_percent, 0) / 100) > 0`,
      params
    );

    return {
      rows: rowsResult.rows,
      total_orders: summaryResult.rows[0]?.total_orders || 0,
      total_referral_fee_mmk: summaryResult.rows[0]?.total_referral_fee_mmk || 0,
    };
  }

  static async delete(id, updatedBy = null) {
    const pool = await poolPromise;
    const result = await pool.query(
      'UPDATE test_referral_fees SET is_deleted = true, updated_user = $2, updated_at = now() WHERE id = $1',
      [id, updatedBy]
    );
    return result.rowCount > 0;
  }
}

module.exports = ReferralFee;
