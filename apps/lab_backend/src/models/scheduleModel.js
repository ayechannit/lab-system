const { sql, poolPromise } = require('../config/db');

/** Accept ISO strings, Date, or empty; return null for SQL nullable datetime2. */
function toSqlDateTime2(value) {
  if (value === undefined || value === null || value === '') return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

class Schedule {
  static async getByOrderId(orderId) {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('order_id', sql.UniqueIdentifier, orderId)
      .query('SELECT *, created_user, updated_user FROM order_schedules WHERE order_id = @order_id');
    return result.recordset[0];
  }

  static async upsert(data, updatedBy = null) {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('order_id', sql.UniqueIdentifier, data.order_id)
      .input('collecting_person', sql.NVarChar(255), data.collecting_person || null)
      .input('collection_time', sql.DateTime2, toSqlDateTime2(data.collection_time))
      .input('running_time', sql.DateTime2, toSqlDateTime2(data.running_time))
      .input('report_out_time', sql.DateTime2, toSqlDateTime2(data.report_out_time))
      .input('accepted_by_user', sql.Bit, data.accepted_by_user ? 1 : 0)
      .input('updated_user', sql.UniqueIdentifier, updatedBy)
      .query(`
        IF EXISTS (SELECT 1 FROM order_schedules WHERE order_id = @order_id)
        BEGIN
            UPDATE order_schedules 
            SET collecting_person = @collecting_person, 
                collection_time = @collection_time, 
                running_time = @running_time, 
                report_out_time = @report_out_time,
                accepted_by_user = @accepted_by_user,
                updated_user = @updated_user,
                updated_at = GETDATE()
            OUTPUT INSERTED.*
            WHERE order_id = @order_id
        END
        ELSE
        BEGIN
            INSERT INTO order_schedules (id, order_id, collecting_person, collection_time, running_time, report_out_time, accepted_by_user, created_user, updated_user)
            OUTPUT INSERTED.*
            VALUES (NEWID(), @order_id, @collecting_person, @collection_time, @running_time, @report_out_time, @accepted_by_user, @updated_user, @updated_user)
        END
      `);
    return result.recordset[0];
  }
}

module.exports = Schedule;
