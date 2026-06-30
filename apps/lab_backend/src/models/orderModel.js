const path = require('path');
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
    let query = `
      SELECT *, created_user, updated_user,
             (
               SELECT s.*,
                      COALESCE(
                        (SELECT TOP 1 profile_image_url FROM lab_staff WHERE id = lab_orders.collector_id AND is_deleted = 0),
                        (SELECT TOP 1 profile_image_url FROM lab_staff WHERE name = s.collecting_person AND is_deleted = 0)
                      ) AS profile_image_url
               FROM order_schedules s
               WHERE s.order_id = lab_orders.id
               FOR JSON PATH
             ) as schedule
      FROM lab_orders
      WHERE is_deleted = 0
    `;

    if (filters.status) {
      query += ' AND status = @status';
      request.input('status', sql.VarChar, filters.status);
    }
    if (filters.exclude_status) {
      query += ' AND status <> @exclude_status';
      request.input('exclude_status', sql.VarChar, filters.exclude_status);
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

    const validSortFields = ['created_at', 'updated_at', 'status', 'patient_name', 'final_price_mmk', 'priority'];
    const sortBy = validSortFields.includes(filters.sortBy) ? filters.sortBy : 'created_at';
    const sortOrder = filters.sortOrder === 'ASC' || filters.sortOrder === 'asc' ? 'ASC' : 'DESC';
    query += ` ORDER BY ${sortBy} ${sortOrder}`;

    if (filters.page && filters.limit) {
      const page = parseInt(filters.page, 10);
      const limit = parseInt(filters.limit, 10);
      const offset = (page - 1) * limit;
      query += ' OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY';
      request.input('offset', sql.Int, offset);
      request.input('limit', sql.Int, limit);
    }

    const result = await request.query(query);
    const orders = result.recordset;
    const StorageService = require('../utils/storageService');
    for (let order of orders) {
      if (order.schedule) {
        try {
          const parsed = JSON.parse(order.schedule);
          order.schedule = parsed && parsed.length > 0 ? parsed[0] : null;
          if (order.schedule && order.schedule.profile_image_url) {
            order.schedule.profile_image_url = await StorageService.getFileUrl(order.schedule.profile_image_url);
          }
        } catch (e) {
          order.schedule = null;
        }
      } else {
        order.schedule = null;
      }

      if (order.prescription_url) {
        const fullUrl = await StorageService.getFileUrl(order.prescription_url);
        order.prescription_url = fullUrl;
        order.prescription_download_url = fullUrl;
      }
    }
    return orders;
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
               (
                 SELECT s.*,
                        COALESCE(
                          (SELECT TOP 1 profile_image_url FROM lab_staff WHERE id = o.collector_id AND is_deleted = 0),
                          (SELECT TOP 1 profile_image_url FROM lab_staff WHERE name = s.collecting_person AND is_deleted = 0)
                        ) AS profile_image_url
                 FROM order_schedules s
                 WHERE s.order_id = o.id
                 FOR JSON PATH
               ) as schedule,
               (SELECT * FROM payments WHERE order_id = o.id ORDER BY created_at ASC FOR JSON PATH) as payments,
               (SELECT 
                  ISNULL(SUM(amount_mmk), 0) 
                FROM payments 
                WHERE order_id = o.id AND status IN ('pending', 'received', 'verified')) as total_paid_mmk
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

      const StorageService = require('../utils/storageService');
      if (order.schedule && order.schedule.profile_image_url) {
        order.schedule.profile_image_url = await StorageService.getFileUrl(order.schedule.profile_image_url);
      }
      if (order.prescription_url) {
        const fullUrl = await StorageService.getFileUrl(order.prescription_url);
        order.prescription_url = fullUrl;
        order.prescription_download_url = fullUrl;
      }

      if (order.items && order.items.length > 0) {
        for (let item of order.items) {
          if (item.result_file_url) {
            const storageKey = item.result_file_url;
            const viewUrl = await StorageService.getFileUrl(storageKey);
            const downloadUrl = await StorageService.getDownloadUrl(
              storageKey,
              path.basename(storageKey),
            );
            item.result_file_url = viewUrl;
            item.download_url = downloadUrl;
          }
        }
      }

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
      const materialFee = data.material_fee_mmk || 0;
      const serviceFee = data.service_fee_mmk || 0;
      const isTestsAssigned = (data.items && data.items.length > 0) ? 1 : 0;

      const orderRequest = new sql.Request(transaction);
      const orderResult = await orderRequest
        .input('user_id', sql.UniqueIdentifier, data.user_id)
        .input('collector_id', sql.UniqueIdentifier, data.collector_id || null)
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
        .input('material_fee_mmk', sql.Decimal(18, 2), materialFee)
        .input('service_geofence_id', sql.UniqueIdentifier, data.service_geofence_id || null)
        .input('service_fee_mmk', sql.Decimal(18, 2), serviceFee)
        .input('prescription_url', sql.NVarChar(2048), data.prescription_url)
        .input('is_tests_assigned', sql.Bit, isTestsAssigned)
        .input('created_user', sql.UniqueIdentifier, createdBy)
        .query(`
          INSERT INTO lab_orders (id, user_id, collector_id, description, priority, patient_name, patient_age, patient_phone,
                                 address, latitude, longitude, status, report_delivery_method, original_price_mmk,
                                 discount_percent, final_price_mmk, material_fee_mmk, service_geofence_id, service_fee_mmk, prescription_url, is_tests_assigned, created_user, updated_user, is_deleted)
          OUTPUT INSERTED.*
          VALUES (NEWID(), @user_id, @collector_id, @description, @priority, @patient_name, @patient_age, @patient_phone,
                  @address, @latitude, @longitude, @status, @report_delivery_method, @original_price_mmk,
                  @discount_percent, @final_price_mmk, @material_fee_mmk, @service_geofence_id, @service_fee_mmk, @prescription_url, @is_tests_assigned, @created_user, @created_user, 0)
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
        .input('material_fee_mmk', sql.Decimal(18, 2), totals.material_fee_mmk || 0)
        .input('service_fee_mmk', sql.Decimal(18, 2), totals.service_fee_mmk || 0)
        .input('updated_user', sql.UniqueIdentifier, updatedBy)
        .query(`
          UPDATE lab_orders 
          SET original_price_mmk = @original_price_mmk, 
              discount_percent = @discount_percent, 
              final_price_mmk = @final_price_mmk, 
              material_fee_mmk = @material_fee_mmk,
              service_fee_mmk = @service_fee_mmk,
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

  static async _resolveOrderItemPrices(items, discountPercent, transaction) {
    if (!Array.isArray(items) || items.length === 0) return [];

    const resolved = [];
    for (const item of items) {
      const quantity = Number(item.quantity) > 0 ? Number(item.quantity) : 1;
      if (item.unit_price_mmk != null && item.subtotal_mmk != null) {
        resolved.push({
          test_id: item.test_id,
          quantity,
          unit_price_mmk: Number(item.unit_price_mmk),
          subtotal_mmk: Number(item.subtotal_mmk),
        });
        continue;
      }

      const testReq = new sql.Request(transaction);
      const testResult = await testReq
        .input('test_id', sql.UniqueIdentifier, item.test_id)
        .query(`
          SELECT base_price_mmk
          FROM lab_test_catalog
          WHERE id = @test_id AND is_deleted = 0
        `);

      if (testResult.recordset.length === 0) {
        throw new Error(`Test not found: ${item.test_id}`);
      }

      const basePrice = Number(testResult.recordset[0].base_price_mmk) || 0;
      const unitPrice = basePrice * (1 - (Number(discountPercent) || 0) / 100);
      resolved.push({
        test_id: item.test_id,
        quantity,
        unit_price_mmk: unitPrice,
        subtotal_mmk: unitPrice * quantity,
      });
    }

    return resolved;
  }

  static async syncPendingOrder(orderId, data, updatedBy = null, options = {}) {
    const { isStaff = false, userId = null } = options;
    const pool = await poolPromise;
    const transaction = new sql.Transaction(pool);

    try {
      await transaction.begin();

      const orderCheckReq = new sql.Request(transaction);
      const orderCheck = await orderCheckReq
        .input('id', sql.UniqueIdentifier, orderId)
        .query(`
          SELECT o.user_id, o.status,
                 SUM(CASE WHEN oi.result_file_url IS NOT NULL THEN 1 ELSE 0 END) as uploaded_count
          FROM lab_orders o
          LEFT JOIN lab_order_items oi ON oi.order_id = o.id
          WHERE o.id = @id AND o.is_deleted = 0
          GROUP BY o.user_id, o.status
        `);

      if (orderCheck.recordset.length === 0) {
        await transaction.rollback();
        return { error: 'not_found' };
      }

      const { user_id: orderUserId, status, uploaded_count: uploadedCount } = orderCheck.recordset[0];
      if (status !== 'pending') {
        throw new Error('Only pending orders can be synchronized with pending-sync.');
      }
      if (!isStaff) {
        const ownerId = orderUserId ? String(orderUserId).toLowerCase() : '';
        const requesterId = userId ? String(userId).toLowerCase() : '';
        if (!ownerId || ownerId !== requesterId) {
          await transaction.rollback();
          return { error: 'forbidden' };
        }
      }
      if (uploadedCount > 0) {
        throw new Error('Tests cannot be changed after results have been uploaded.');
      }

      const items = Array.isArray(data.items) ? data.items : [];
      const discountPercent = Number(data.discount_percent) || 0;
      const pricedItems = await this._resolveOrderItemPrices(items, discountPercent, transaction);

      const updateOrderReq = new sql.Request(transaction);
      await updateOrderReq
        .input('id', sql.UniqueIdentifier, orderId)
        .input('collector_id', sql.UniqueIdentifier, data.collector_id || null)
        .input('description', sql.Text, data.description ?? null)
        .input('priority', sql.VarChar, data.priority)
        .input('patient_name', sql.VarChar, data.patient_name)
        .input('patient_age', sql.Int, data.patient_age)
        .input('patient_phone', sql.VarChar, data.patient_phone)
        .input('address', sql.Text, data.address)
        .input('latitude', sql.Float, data.latitude)
        .input('longitude', sql.Float, data.longitude)
        .input('original_price_mmk', sql.Decimal(18, 2), data.original_price_mmk || 0)
        .input('discount_percent', sql.Decimal(5, 2), discountPercent)
        .input('final_price_mmk', sql.Decimal(18, 2), data.final_price_mmk || 0)
        .input('material_fee_mmk', sql.Decimal(18, 2), data.material_fee_mmk || 0)
        .input('service_geofence_id', sql.UniqueIdentifier, data.service_geofence_id || null)
        .input('service_fee_mmk', sql.Decimal(18, 2), data.service_fee_mmk || 0)
        .input('is_tests_assigned', sql.Bit, pricedItems.length > 0 ? 1 : 0)
        .input('updated_user', sql.UniqueIdentifier, updatedBy)
        .query(`
          UPDATE lab_orders
          SET collector_id = @collector_id,
              description = @description,
              priority = @priority,
              patient_name = @patient_name,
              patient_age = @patient_age,
              patient_phone = @patient_phone,
              address = @address,
              latitude = @latitude,
              longitude = @longitude,
              original_price_mmk = @original_price_mmk,
              discount_percent = @discount_percent,
              final_price_mmk = @final_price_mmk,
              material_fee_mmk = @material_fee_mmk,
              service_geofence_id = @service_geofence_id,
              service_fee_mmk = @service_fee_mmk,
              is_tests_assigned = @is_tests_assigned,
              updated_user = @updated_user,
              updated_at = GETDATE()
          WHERE id = @id AND is_deleted = 0 AND status = 'pending'
        `);

      const deleteItemsReq = new sql.Request(transaction);
      await deleteItemsReq
        .input('order_id', sql.UniqueIdentifier, orderId)
        .query('DELETE FROM lab_order_items WHERE order_id = @order_id');

      if (pricedItems.length > 0) {
        const expandedItems = await this._expandPackageItems(pricedItems, transaction);

        for (const item of expandedItems) {
          const itemRequest = new sql.Request(transaction);
          await itemRequest
            .input('order_id', sql.UniqueIdentifier, orderId)
            .input('test_id', sql.UniqueIdentifier, item.test_id)
            .input('quantity', sql.Int, item.quantity || 1)
            .input('unit_price_mmk', sql.Decimal(18, 2), item.unit_price_mmk)
            .input('subtotal_mmk', sql.Decimal(18, 2), item.subtotal_mmk)
            .input('created_user', sql.UniqueIdentifier, updatedBy)
            .query(`
              INSERT INTO lab_order_items (id, order_id, test_id, quantity, unit_price_mmk, subtotal_mmk, created_user, updated_user)
              VALUES (NEWID(), @order_id, @test_id, @quantity, @unit_price_mmk, @subtotal_mmk, @created_user, @created_user)
            `);
        }
      }

      await transaction.commit();
      return this.getById(orderId);
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }

  static async replaceItemsAndUpdateTotals(orderId, items, totals, updatedBy = null) {
    const pool = await poolPromise;
    const transaction = new sql.Transaction(pool);

    try {
      await transaction.begin();

      const orderCheckReq = new sql.Request(transaction);
      const orderCheck = await orderCheckReq
        .input('id', sql.UniqueIdentifier, orderId)
        .query(`
          SELECT o.status,
                 SUM(CASE WHEN oi.result_file_url IS NOT NULL THEN 1 ELSE 0 END) as uploaded_count
          FROM lab_orders o
          LEFT JOIN lab_order_items oi ON oi.order_id = o.id
          WHERE o.id = @id AND o.is_deleted = 0
          GROUP BY o.status
        `);

      if (orderCheck.recordset.length === 0) {
        await transaction.rollback();
        return null;
      }

      const { status, uploaded_count: uploadedCount } = orderCheck.recordset[0];
      if (status !== 'pending') {
        throw new Error('Tests can only be updated while the order is pending.');
      }
      if (uploadedCount > 0) {
        throw new Error('Tests cannot be changed after results have been uploaded.');
      }

      const deleteItemsReq = new sql.Request(transaction);
      await deleteItemsReq
        .input('order_id', sql.UniqueIdentifier, orderId)
        .query('DELETE FROM lab_order_items WHERE order_id = @order_id');

      const updateOrderReq = new sql.Request(transaction);
      await updateOrderReq
        .input('id', sql.UniqueIdentifier, orderId)
        .input('original_price_mmk', sql.Decimal(18, 2), totals.original_price_mmk)
        .input('discount_percent', sql.Decimal(5, 2), totals.discount_percent || 0)
        .input('final_price_mmk', sql.Decimal(18, 2), totals.final_price_mmk)
        .input('material_fee_mmk', sql.Decimal(18, 2), totals.material_fee_mmk || 0)
        .input('is_tests_assigned', sql.Bit, items && items.length > 0 ? 1 : 0)
        .input('updated_user', sql.UniqueIdentifier, updatedBy)
        .query(`
          UPDATE lab_orders
          SET original_price_mmk = @original_price_mmk,
              discount_percent = @discount_percent,
              final_price_mmk = @final_price_mmk,
              material_fee_mmk = @material_fee_mmk,
              is_tests_assigned = @is_tests_assigned,
              updated_user = @updated_user,
              updated_at = GETDATE()
          WHERE id = @id AND is_deleted = 0
        `);

      if (items && items.length > 0) {
        const expandedItems = await this._expandPackageItems(items, transaction);

        for (const item of expandedItems) {
          const itemRequest = new sql.Request(transaction);
          await itemRequest
            .input('order_id', sql.UniqueIdentifier, orderId)
            .input('test_id', sql.UniqueIdentifier, item.test_id)
            .input('quantity', sql.Int, item.quantity || 1)
            .input('unit_price_mmk', sql.Decimal(18, 2), item.unit_price_mmk)
            .input('subtotal_mmk', sql.Decimal(18, 2), item.subtotal_mmk)
            .input('created_user', sql.UniqueIdentifier, updatedBy)
            .query(`
              INSERT INTO lab_order_items (id, order_id, test_id, quantity, unit_price_mmk, subtotal_mmk, created_user, updated_user)
              VALUES (NEWID(), @order_id, @test_id, @quantity, @unit_price_mmk, @subtotal_mmk, @created_user, @created_user)
            `);
        }
      }

      await transaction.commit();

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

  static async update(id, data, updatedBy = null) {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .input('collector_id', sql.UniqueIdentifier, data.collector_id || null)
      .input('description', sql.Text, data.description ?? null)
      .input('priority', sql.VarChar, data.priority)
      .input('patient_name', sql.VarChar, data.patient_name)
      .input('patient_age', sql.Int, data.patient_age)
      .input('patient_phone', sql.VarChar, data.patient_phone)
      .input('address', sql.Text, data.address)
      .input('latitude', sql.Float, data.latitude)
      .input('longitude', sql.Float, data.longitude)
      .input('service_geofence_id', sql.UniqueIdentifier, data.service_geofence_id || null)
      .input('service_fee_mmk', sql.Decimal(18, 2), data.service_fee_mmk || 0)
      .input('updated_user', sql.UniqueIdentifier, updatedBy)
      .query(`
        UPDATE lab_orders SET
          collector_id = @collector_id,
          description = @description,
          priority = @priority,
          patient_name = @patient_name,
          patient_age = @patient_age,
          patient_phone = @patient_phone,
          address = @address,
          latitude = @latitude,
          longitude = @longitude,
          service_geofence_id = @service_geofence_id,
          service_fee_mmk = @service_fee_mmk,
          updated_user = @updated_user,
          updated_at = GETDATE()
        OUTPUT INSERTED.*
        WHERE id = @id AND is_deleted = 0
      `);

    return result.recordset[0] ?? null;
  }

  static async updateCollectorId(id, collectorId, updatedBy = null) {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .input('collector_id', sql.UniqueIdentifier, collectorId || null)
      .input('updated_user', sql.UniqueIdentifier, updatedBy)
      .query(`
        UPDATE lab_orders SET
          collector_id = @collector_id,
          updated_user = @updated_user,
          updated_at = GETDATE()
        WHERE id = @id AND is_deleted = 0
      `);
    return result.rowsAffected[0] > 0;
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

  static async bulkUpdateStatus(ids, newStatus, staffId, note, updatedBy = null) {
    const pool = await poolPromise;
    const transaction = new sql.Transaction(pool);
    
    try {
      await transaction.begin();
      const updatedOrders = [];

      for (const id of ids) {
        // 1. Get old status
        const getOldStatusReq = new sql.Request(transaction);
        const oldStatusResult = await getOldStatusReq
          .input('id', sql.UniqueIdentifier, id)
          .query('SELECT status FROM lab_orders WHERE id = @id AND is_deleted = 0');
        
        const oldStatus = oldStatusResult.recordset[0]?.status;
        if (!oldStatus) throw new Error(`Order ${id} not found or deleted`);

        // 2. Update status
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

        const updatedOrder = result.recordset[0];
        if (!updatedOrder) throw new Error(`Failed to update status for order ${id}`);
        updatedOrders.push(updatedOrder);

        // 3. Log change
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
      }

      await transaction.commit();
      return updatedOrders;
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }

  static async getTracking(orderId) {
    const pool = await poolPromise;
    
    // Get order details
    const orderResult = await pool.request()
      .input('id', sql.UniqueIdentifier, orderId)
      .query(`
        SELECT o.id, o.patient_name, o.status as current_status, o.created_at, o.updated_at
        FROM lab_orders o
        WHERE o.id = @id AND o.is_deleted = 0
      `);
    
    const order = orderResult.recordset[0];
    if (!order) return null;

    // Get order status logs with staff names
    const logsResult = await pool.request()
      .input('order_id', sql.UniqueIdentifier, orderId)
      .query(`
        SELECT l.id, l.old_status, l.new_status, l.note, l.created_at, s.name as changed_by_name
        FROM order_status_logs l
        LEFT JOIN lab_staff s ON l.changed_by = s.id
        WHERE l.order_id = @order_id
        ORDER BY l.created_at ASC
      `);

    // Get schedule if any
    const scheduleResult = await pool.request()
      .input('order_id', sql.UniqueIdentifier, orderId)
      .query(`
        SELECT s.collecting_person, s.collection_time, s.running_time, s.report_out_time,
               COALESCE(
                 (SELECT TOP 1 profile_image_url FROM lab_staff WHERE id = o.collector_id AND is_deleted = 0),
                 (SELECT TOP 1 profile_image_url FROM lab_staff WHERE name = s.collecting_person AND is_deleted = 0)
               ) AS profile_image_url
        FROM order_schedules s
        LEFT JOIN lab_orders o ON s.order_id = o.id
        WHERE s.order_id = @order_id
      `);

    const schedule = scheduleResult.recordset[0] || null;
    if (schedule && schedule.profile_image_url) {
      const StorageService = require('../utils/storageService');
      schedule.profile_image_url = await StorageService.getFileUrl(schedule.profile_image_url);
    }

    return {
      order_id: order.id,
      patient_name: order.patient_name,
      current_status: order.current_status,
      created_at: order.created_at,
      updated_at: order.updated_at,
      schedule,
      timeline: logsResult.recordset
    };
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
        SET result_file_url = @result_file_url,
            result_pdf_group_id = NULL,
            result_pdf_display_solo = 0,
            updated_user = @updated_user,
            updated_at = GETDATE()
        WHERE order_id = @order_id AND test_id = @test_id
      `);
    return result.rowsAffected[0] > 0;
  }

  static async uploadResultBulk(orderId, testIds, fileUrl, groupId, updatedBy = null) {
    if (!Array.isArray(testIds) || testIds.length === 0) return 0;
    const pool = await poolPromise;
    const transaction = new sql.Transaction(pool);
    try {
      await transaction.begin();
      let updated = 0;
      for (const testId of testIds) {
        const result = await new sql.Request(transaction)
          .input('order_id', sql.UniqueIdentifier, orderId)
          .input('test_id', sql.UniqueIdentifier, testId)
          .input('result_file_url', sql.VarChar, fileUrl)
          .input('result_pdf_group_id', sql.UniqueIdentifier, groupId)
          .input('updated_user', sql.UniqueIdentifier, updatedBy)
          .query(`
            UPDATE lab_order_items
            SET result_file_url = @result_file_url,
                result_pdf_group_id = @result_pdf_group_id,
                result_pdf_display_solo = 0,
                updated_user = @updated_user,
                updated_at = GETDATE()
            WHERE order_id = @order_id AND test_id = @test_id
          `);
        updated += result.rowsAffected[0] || 0;
      }
      await transaction.commit();
      return updated;
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }

  static async separateResultPdfs(orderId, testIds, updatedBy = null) {
    if (!Array.isArray(testIds) || testIds.length === 0) return 0;
    const pool = await poolPromise;
    const transaction = new sql.Transaction(pool);
    try {
      await transaction.begin();
      let updated = 0;
      for (const testId of testIds) {
        const result = await new sql.Request(transaction)
          .input('order_id', sql.UniqueIdentifier, orderId)
          .input('test_id', sql.UniqueIdentifier, testId)
          .input('updated_user', sql.UniqueIdentifier, updatedBy)
          .query(`
            UPDATE lab_order_items
            SET result_pdf_group_id = NULL,
                result_pdf_display_solo = 1,
                updated_user = @updated_user,
                updated_at = GETDATE()
            WHERE order_id = @order_id AND test_id = @test_id
          `);
        updated += result.rowsAffected[0] || 0;
      }
      await transaction.commit();
      return updated;
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }

  static async saveAiReview(orderId, testId, verdict, rawResponse, updatedBy = null) {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('order_id', sql.UniqueIdentifier, orderId)
      .input('test_id', sql.UniqueIdentifier, testId)
      .input('ai_verdict', sql.VarChar, verdict)
      .input('ai_raw_response', sql.NVarChar, rawResponse)
      .input('updated_user', sql.UniqueIdentifier, updatedBy)
      .query(`
        UPDATE lab_order_items 
        SET ai_verdict = @ai_verdict, ai_raw_response = @ai_raw_response, updated_user = @updated_user, updated_at = GETDATE()
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
