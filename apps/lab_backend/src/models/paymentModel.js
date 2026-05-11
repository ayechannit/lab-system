const { sql, poolPromise } = require('../config/db');

class Payment {
  static async getByOrderId(orderId) {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('order_id', sql.UniqueIdentifier, orderId)
      .query('SELECT *, created_user, updated_user FROM payments WHERE order_id = @order_id ORDER BY created_at ASC');
    return result.recordset;
  }

  /**
   * Get payment summary for an order (Total Paid, Balance)
   */
  static async getSummaryByOrderId(orderId) {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('order_id', sql.UniqueIdentifier, orderId)
      .query(`
        SELECT 
          o.final_price_mmk as total_price,
          ISNULL(SUM(p.amount_mmk), 0) as total_paid,
          (o.final_price_mmk - ISNULL(SUM(p.amount_mmk), 0)) as balance
        FROM lab_orders o
        LEFT JOIN payments p ON o.id = p.order_id AND p.status IN ('received', 'verified')
        WHERE o.id = @order_id
        GROUP BY o.final_price_mmk
      `);
    return result.recordset[0];
  }

  static async create(data, createdBy = null) {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('order_id', sql.UniqueIdentifier, data.order_id)
      .input('amount_mmk', sql.Decimal(18, 2), data.amount_mmk)
      .input('status', sql.VarChar, data.status || 'received') // Defaulting to received per user suggestion
      .input('method', sql.VarChar, data.method)
      .input('reference_no', sql.VarChar, data.reference_no)
      .input('created_user', sql.UniqueIdentifier, createdBy)
      .query(`
        INSERT INTO payments (id, order_id, amount_mmk, status, method, reference_no, paid_at, created_user, updated_user)
        OUTPUT INSERTED.*
        VALUES (NEWID(), @order_id, @amount_mmk, @status, @method, @reference_no, GETDATE(), @created_user, @created_user)
      `);
    return result.recordset[0];
  }

  static async verify(id, staffId, updatedBy = null) {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .input('verified_by', sql.UniqueIdentifier, staffId)
      .input('updated_user', sql.UniqueIdentifier, updatedBy || staffId)
      .query(`
        UPDATE payments 
        SET status = 'verified', verified_by = @verified_by, verified_at = GETDATE(), 
            updated_user = @updated_user, updated_at = GETDATE()
        OUTPUT INSERTED.*
        WHERE id = @id
      `);
    return result.recordset[0];
  }
}

module.exports = Payment;
