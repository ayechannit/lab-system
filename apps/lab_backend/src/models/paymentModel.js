const { poolPromise } = require('../config/db');

class Payment {
  static async getByOrderId(orderId) {
    const pool = await poolPromise;
    const result = await pool.query(
      'SELECT *, created_user, updated_user FROM payments WHERE order_id = $1 ORDER BY created_at ASC',
      [orderId]
    );
    return result.rows;
  }

  /**
   * Get payment summary for an order (Total Paid, Balance)
   */
  static async getSummaryByOrderId(orderId) {
    const pool = await poolPromise;
    const result = await pool.query(
      `SELECT
         o.final_price_mmk as total_price,
         COALESCE(SUM(p.amount_mmk), 0) + COALESCE(SUM(p.points_value_mmk), 0) as total_paid,
         (o.final_price_mmk - (COALESCE(SUM(p.amount_mmk), 0) + COALESCE(SUM(p.points_value_mmk), 0))) as balance
       FROM lab_orders o
       LEFT JOIN payments p ON o.id = p.order_id AND p.status IN ('pending', 'received', 'verified')
       WHERE o.id = $1
       GROUP BY o.final_price_mmk`,
      [orderId]
    );
    return result.rows[0];
  }

  static async getById(id) {
    const pool = await poolPromise;
    const result = await pool.query('SELECT * FROM payments WHERE id = $1', [id]);
    return result.rows[0];
  }

  static async create(data, createdBy = null) {
    const pool = await poolPromise;
    const status = data.status || 'received'; // Defaulting to received per user suggestion

    const params = [
      data.order_id,
      data.amount_mmk,
      status,
      data.method,
      data.reference_no,
      data.points_redeemed || 0,
      data.points_value_mmk || 0,
      createdBy,
    ];

    let verifiedColumns = '';
    let verifiedValues = '';
    if (status === 'verified') {
      params.push(data.staff_id);
      verifiedColumns = ', verified_by, verified_at';
      verifiedValues = `, $${params.length}, now()`;
    }

    const result = await pool.query(
      `INSERT INTO payments (id, order_id, amount_mmk, status, method, reference_no, points_redeemed, points_value_mmk, paid_at, created_user, updated_user${verifiedColumns})
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, now(), $8, $8${verifiedValues})
       RETURNING *`,
      params
    );
    return result.rows[0];
  }

  static async verify(id, staffId, updatedBy = null) {
    return Payment.updateStatus(id, 'verified', staffId, updatedBy);
  }

  static async updateStatus(id, status, staffId = null, updatedBy = null) {
    const pool = await poolPromise;
    const params = [id, status, updatedBy || staffId];

    let setClause = 'status = $2, updated_user = $3, updated_at = now()';
    if (status === 'verified') {
      params.push(staffId);
      setClause += `, verified_by = $${params.length}, verified_at = now()`;
    } else {
      setClause += ', verified_by = NULL, verified_at = NULL';
    }

    const result = await pool.query(
      `UPDATE payments
       SET ${setClause}
       WHERE id = $1
       RETURNING *`,
      params
    );
    return result.rows[0];
  }
}

module.exports = Payment;
