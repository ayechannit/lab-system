const { sql, poolPromise } = require('../config/db');

class Order {
  static async _expandPackageItems(items, transaction) {
    if (!items || items.length === 0) return [];
    
    let expandedItems = [];
    
    for (const item of items) {
      const testReq = new sql.Request(transaction);
      const testResult = await testReq
        .input('test_id', sql.UniqueIdentifier, item.test_id)
        .query('SELECT is_package, package_items FROM lab_test_catalog WHERE id = @test_id');
        
      if (testResult.recordset.length === 0) continue; // Test doesn't exist, skip or throw error
      
      const testInfo = testResult.recordset[0];
      
      if (testInfo.is_package && testInfo.package_items) {
        let subTestIds = [];
        try {
          subTestIds = JSON.parse(testInfo.package_items);
        } catch (e) {
          console.error("Failed to parse package_items", e);
        }
        
        // Distribute price logic:
        // We will assign the full price to the first sub-test, and 0 to the rest.
        // This ensures the order total remains exactly what the frontend calculated,
        // while expanding the tests for the lab staff.
        
        for (let i = 0; i < subTestIds.length; i++) {
          const subId = subTestIds[i];
          expandedItems.push({
            test_id: subId,
            quantity: item.quantity,
            unit_price_mmk: i === 0 ? item.unit_price_mmk : 0,
            subtotal_mmk: i === 0 ? item.subtotal_mmk : 0,
            from_package_id: item.test_id // optional tracking
          });
        }
      } else {
        // Not a package, push as is
        expandedItems.push(item);
      }
    }
    
    return expandedItems;
  }

  static async getAll(filters = {}) {
    const pool = await poolPromise;
    const request = pool.request();
    let query = 'SELECT *, created_user, updated_user FROM lab_orders WHERE is_deleted = 0';

    if (filters.status) {
      query += ' AND status = @status';
      request.input('status', sql.VarChar, filters.status);
    }
    if (filters.user_id) {
      query += ' AND user_id = @user_id';
      request.input('user_id', sql.UniqueIdentifier, filters.user_id);
    }
    if (filters.priority) {
      query += ' AND priority = @priority';
      request.input('priority', sql.VarChar, filters.priority);
    }
    if (filters.patient_name) {
      query += ' AND patient_name LIKE @patient_name';
      request.input('patient_name', sql.VarChar, `%${filters.patient_name}%`);
    }
    if (filters.is_tests_assigned !== undefined) {
      query += ' AND is_tests_assigned = @is_tests_assigned';
      request.input('is_tests_assigned', sql.Bit, filters.is_tests_assigned === 'true' || filters.is_tests_assigned === true ? 1 : 0);
    }

    query += ' ORDER BY created_at DESC';

    if (filters.page && filters.limit) {
      const page = parseInt(filters.page, 10);
      const limit = parseInt(filters.limit, 10);
      const offset = (page - 1) * limit;
      query += ' OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY';
      request.input('offset', sql.Int, offset);
      request.input('limit', sql.Int, limit);
    }

    const result = await request.query(query);
    return result.recordset;
  }

  static async getById(id) {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query(`
        SELECT o.*,
               u.name AS ordering_user_name,
               u.role AS ordering_user_role,
               (
                 SELECT oi.*, tc.test_name, tc.test_code
                 FROM lab_order_items oi
                 JOIN lab_test_catalog tc ON oi.test_id = tc.id
                 WHERE oi.order_id = o.id 
                 FOR JSON PATH
               ) as items,
               (SELECT * FROM order_schedules WHERE order_id = o.id FOR JSON PATH) as schedule,
               (SELECT * FROM payments WHERE order_id = o.id ORDER BY created_at ASC FOR JSON PATH) as payments,
               (SELECT 
                  ISNULL(SUM(amount_mmk), 0) 
                FROM payments 
                WHERE order_id = o.id AND status IN ('received', 'verified')) as total_paid_mmk
        FROM lab_orders o
        LEFT JOIN users u ON u.id = o.user_id
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

  static async create(data, createdBy = null) {
    const pool = await poolPromise;
    const transaction = new sql.Transaction(pool);
    
    try {
      await transaction.begin();
      
      const originalPrice = data.original_price_mmk || 0;
      const discountPercent = data.discount_percent || 0;
      const finalPrice = data.final_price_mmk || 0;
      const isTestsAssigned = (data.items && data.items.length > 0) ? 1 : 0;

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
        .input('report_delivery_method', sql.VarChar, data.report_delivery_method)
        .input('original_price_mmk', sql.Decimal(18, 2), originalPrice)
        .input('discount_percent', sql.Decimal(5, 2), discountPercent)
        .input('final_price_mmk', sql.Decimal(18, 2), finalPrice)
        .input('prescription_url', sql.NVarChar(2048), data.prescription_url)
        .input('is_tests_assigned', sql.Bit, isTestsAssigned)
        .input('created_user', sql.UniqueIdentifier, createdBy)
        .query(`
          INSERT INTO lab_orders (id, user_id, description, priority, patient_name, patient_age, patient_phone, 
                                 address, latitude, longitude, status, report_delivery_method, original_price_mmk, 
                                 discount_percent, final_price_mmk, prescription_url, is_tests_assigned, created_user, updated_user, is_deleted)
          OUTPUT INSERTED.*
          VALUES (NEWID(), @user_id, @description, @priority, @patient_name, @patient_age, @patient_phone, 
                  @address, @latitude, @longitude, @status, @report_delivery_method, @original_price_mmk, 
                  @discount_percent, @final_price_mmk, @prescription_url, @is_tests_assigned, @created_user, @created_user, 0)
        `);

      const newOrder = orderResult.recordset[0];

      if (data.items && data.items.length > 0) {
        const expandedItems = await this._expandPackageItems(data.items, transaction);
        
        for (const item of expandedItems) {
          const itemRequest = new sql.Request(transaction);
          await itemRequest
            .input('order_id', sql.UniqueIdentifier, newOrder.id)
            .input('test_id', sql.UniqueIdentifier, item.test_id)
            .input('quantity', sql.Int, item.quantity || 1)
            .input('unit_price_mmk', sql.Decimal(18, 2), item.unit_price_mmk)
            .input('subtotal_mmk', sql.Decimal(18, 2), item.subtotal_mmk)
            .input('created_user', sql.UniqueIdentifier, createdBy)
            .query(`
              INSERT INTO lab_order_items (id, order_id, test_id, quantity, unit_price_mmk, subtotal_mmk, created_user, updated_user)
              VALUES (NEWID(), @order_id, @test_id, @quantity, @unit_price_mmk, @subtotal_mmk, @created_user, @created_user)
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

  static async addItemsAndUpdateTotals(orderId, items, totals, updatedBy = null) {
    const pool = await poolPromise;
    const transaction = new sql.Transaction(pool);
    
    try {
      await transaction.begin();
      
      // Update order totals
      const updateOrderReq = new sql.Request(transaction);
      await updateOrderReq
        .input('id', sql.UniqueIdentifier, orderId)
        .input('original_price_mmk', sql.Decimal(18, 2), totals.original_price_mmk)
        .input('discount_percent', sql.Decimal(5, 2), totals.discount_percent || 0)
        .input('final_price_mmk', sql.Decimal(18, 2), totals.final_price_mmk)
        .input('updated_user', sql.UniqueIdentifier, updatedBy)
        .query(`
          UPDATE lab_orders 
          SET original_price_mmk = @original_price_mmk, 
              discount_percent = @discount_percent, 
              final_price_mmk = @final_price_mmk, 
              is_tests_assigned = 1,
              updated_user = @updated_user, 
              updated_at = GETDATE()
          WHERE id = @id AND is_deleted = 0
        `);

      // Add new items
      if (items && items.length > 0) {
        const expandedItems = await this._expandPackageItems(items, transaction);
        
        for (const item of expandedItems) {
          const itemRequest = new sql.Request(transaction);
          
          // Use IF NOT EXISTS to prevent duplicates if adding the same package/test twice,
          // though usually they just update quantity. For simplicity, we just insert. 
          // If UQ_Order_Test constraint hits, we catch it.
          await itemRequest
            .input('order_id', sql.UniqueIdentifier, orderId)
            .input('test_id', sql.UniqueIdentifier, item.test_id)
            .input('quantity', sql.Int, item.quantity || 1)
            .input('unit_price_mmk', sql.Decimal(18, 2), item.unit_price_mmk)
            .input('subtotal_mmk', sql.Decimal(18, 2), item.subtotal_mmk)
            .input('created_user', sql.UniqueIdentifier, updatedBy)
            .query(`
              IF NOT EXISTS (SELECT 1 FROM lab_order_items WHERE order_id = @order_id AND test_id = @test_id)
              BEGIN
                INSERT INTO lab_order_items (id, order_id, test_id, quantity, unit_price_mmk, subtotal_mmk, created_user, updated_user)
                VALUES (NEWID(), @order_id, @test_id, @quantity, @unit_price_mmk, @subtotal_mmk, @created_user, @created_user)
              END
            `);
        }
      }

      await transaction.commit();
      
      // Fetch and return the updated order
      const getOrderReq = new sql.Request(pool);
      const orderResult = await getOrderReq
        .input('id', sql.UniqueIdentifier, orderId)
        .query('SELECT * FROM lab_orders WHERE id = @id');
      
      return orderResult.recordset[0];
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }

  static async updateStatus(id, newStatus, staffId, note, updatedBy = null) {
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
        .input('updated_user', sql.UniqueIdentifier, updatedBy || staffId)
        .query(`
          UPDATE lab_orders SET status = @status, updated_user = @updated_user, updated_at = GETDATE() 
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
        .input('created_user', sql.UniqueIdentifier, updatedBy || staffId)
        .query(`
          INSERT INTO order_status_logs (id, order_id, changed_by, old_status, new_status, note, created_user)
          VALUES (NEWID(), @order_id, @changed_by, @old_status, @new_status, @note, @created_user)
        `);

      await transaction.commit();
      return result.recordset[0];
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }

  static async delete(id, updatedBy = null) {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .input('updated_user', sql.UniqueIdentifier, updatedBy)
      .query('UPDATE lab_orders SET is_deleted = 1, updated_user = @updated_user, updated_at = GETDATE() WHERE id = @id');
    return result.rowsAffected[0] > 0;
  }

  static async uploadResult(orderId, testId, fileUrl, updatedBy = null) {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('order_id', sql.UniqueIdentifier, orderId)
      .input('test_id', sql.UniqueIdentifier, testId)
      .input('result_file_url', sql.VarChar, fileUrl)
      .input('updated_user', sql.UniqueIdentifier, updatedBy)
      .query(`
        UPDATE lab_order_items 
        SET result_file_url = @result_file_url, updated_user = @updated_user, updated_at = GETDATE()
        WHERE order_id = @order_id AND test_id = @test_id
      `);
    return result.rowsAffected[0] > 0;
  }

  static async areAllResultsUploaded(orderId) {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('order_id', sql.UniqueIdentifier, orderId)
      .query(`
        SELECT COUNT(*) as total, 
               SUM(CASE WHEN result_file_url IS NOT NULL THEN 1 ELSE 0 END) as uploaded
        FROM lab_order_items
        WHERE order_id = @order_id
      `);
    
    if (result.recordset.length === 0) return false;
    
    const { total, uploaded } = result.recordset[0];
    return total > 0 && total === uploaded;
  }

  static async getQrDetails(orderId) {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('order_id', sql.UniqueIdentifier, orderId)
      .query(`
        SELECT 
          o.patient_name, o.patient_age, o.patient_phone, o.address,
          (
            SELECT t.test_name, t.test_code
            FROM lab_order_items oi
            JOIN lab_test_catalog t ON oi.test_id = t.id
            WHERE oi.order_id = o.id AND t.is_deleted = 0
            FOR JSON PATH
          ) as tests
        FROM lab_orders o
        WHERE o.id = @order_id AND o.is_deleted = 0
      `);
      
    if (result.recordset[0]) {
      const details = result.recordset[0];
      details.tests = details.tests ? JSON.parse(details.tests) : [];
      return details;
    }
    return null;
  }
}

module.exports = Order;
