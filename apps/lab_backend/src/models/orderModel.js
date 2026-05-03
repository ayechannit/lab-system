const { sql, poolPromise } = require('../config/db');

class Order {
  static async getAll() {
    const pool = await poolPromise;
    const result = await pool.request().query('SELECT * FROM lab_orders WHERE is_deleted = 0 ORDER BY created_at DESC');
    return result.recordset;
  }

  static async getById(id) {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query(`
        SELECT o.*, 
               (SELECT * FROM lab_order_items WHERE order_id = o.id FOR JSON PATH) as items,
               (SELECT * FROM order_schedules WHERE order_id = o.id FOR JSON PATH) as schedule,
               (SELECT * FROM payments WHERE order_id = o.id ORDER BY created_at ASC FOR JSON PATH) as payments,
               (SELECT 
                  ISNULL(SUM(amount_mmk), 0) 
                FROM payments 
                WHERE order_id = o.id AND status IN ('received', 'verified')) as total_paid_mmk
        FROM lab_orders o
        WHERE o.id = @id AND o.is_deleted = 0
      `);
    
    if (result.recordset[0]) {
      const order = result.recordset[0];
      order.items = order.items ? JSON.parse(order.items) : [];
      order.schedule = order.schedule ? JSON.parse(order.schedule)[0] : null;
      order.payments = order.payments ? JSON.parse(order.payments) : [];
      order.balance_mmk = order.final_price_mmk - order.total_paid_mmk;
      return order;
    }
    return null;
  }

  static async create(data) {
    const pool = await poolPromise;
    const transaction = new sql.Transaction(pool);
    
    try {
      await transaction.begin();
      
      const orderRequest = new sql.Request(transaction);
      const orderResult = await orderRequest
        .input('user_id', sql.UniqueIdentifier, data.user_id)
        .input('description', sql.Text, data.description)
        .input('priority', sql.VarChar, data.priority)
        .input('patient_name', sql.VarChar, data.patient_name)
        .input('patient_age', sql.Int, data.patient_age)
        .input('patient_phone', sql.VarChar, data.patient_phone)
        .input('address', sql.Text, data.address)
        .input('latitude', sql.Float, data.latitude)
        .input('longitude', sql.Float, data.longitude)
        .input('status', sql.VarChar, data.status || 'pending')
        .input('original_price_mmk', sql.Decimal(18, 2), data.original_price_mmk)
        .input('discount_percent', sql.Decimal(5, 2), data.discount_percent || 0)
        .input('final_price_mmk', sql.Decimal(18, 2), data.final_price_mmk)
        .query(`
          INSERT INTO lab_orders (id, user_id, description, priority, patient_name, patient_age, patient_phone, 
                                 address, latitude, longitude, status, original_price_mmk, 
                                 discount_percent, final_price_mmk, is_deleted)
          OUTPUT INSERTED.*
          VALUES (NEWID(), @user_id, @description, @priority, @patient_name, @patient_age, @patient_phone, 
                  @address, @latitude, @longitude, @status, @original_price_mmk, 
                  @discount_percent, @final_price_mmk, 0)
        `);

      const newOrder = orderResult.recordset[0];

      if (data.items && data.items.length > 0) {
        for (const item of data.items) {
          const itemRequest = new sql.Request(transaction);
          await itemRequest
            .input('order_id', sql.UniqueIdentifier, newOrder.id)
            .input('test_id', sql.UniqueIdentifier, item.test_id)
            .input('quantity', sql.Int, item.quantity || 1)
            .input('unit_price_mmk', sql.Decimal(18, 2), item.unit_price_mmk)
            .input('subtotal_mmk', sql.Decimal(18, 2), item.subtotal_mmk)
            .query(`
              INSERT INTO lab_order_items (id, order_id, test_id, quantity, unit_price_mmk, subtotal_mmk)
              VALUES (NEWID(), @order_id, @test_id, @quantity, @unit_price_mmk, @subtotal_mmk)
            `);
        }
      }

      await transaction.commit();
      return newOrder;
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }

  static async updateStatus(id, newStatus, staffId, note) {
    const pool = await poolPromise;
    const transaction = new sql.Transaction(pool);
    
    try {
      await transaction.begin();
      
      const getOldStatusReq = new sql.Request(transaction);
      const oldStatusResult = await getOldStatusReq
        .input('id', sql.UniqueIdentifier, id)
        .query('SELECT status FROM lab_orders WHERE id = @id AND is_deleted = 0');
      
      const oldStatus = oldStatusResult.recordset[0]?.status;
      if (!oldStatus) throw new Error('Order not found or deleted');

      const updateReq = new sql.Request(transaction);
      const result = await updateReq
        .input('id', sql.UniqueIdentifier, id)
        .input('status', sql.VarChar, newStatus)
        .query(`
          UPDATE lab_orders SET status = @status, updated_at = GETDATE() 
          OUTPUT INSERTED.*
          WHERE id = @id AND is_deleted = 0
        `);

      const logReq = new sql.Request(transaction);
      await logReq
        .input('order_id', sql.UniqueIdentifier, id)
        .input('changed_by', sql.UniqueIdentifier, staffId)
        .input('old_status', sql.VarChar, oldStatus)
        .input('new_status', sql.VarChar, newStatus)
        .input('note', sql.Text, note)
        .query(`
          INSERT INTO order_status_logs (id, order_id, changed_by, old_status, new_status, note)
          VALUES (NEWID(), @order_id, @changed_by, @old_status, @new_status, @note)
        `);

      await transaction.commit();
      return result.recordset[0];
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }

  static async delete(id) {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query('UPDATE lab_orders SET is_deleted = 1, updated_at = GETDATE() WHERE id = @id');
    return result.rowsAffected[0] > 0;
  }
}

module.exports = Order;
