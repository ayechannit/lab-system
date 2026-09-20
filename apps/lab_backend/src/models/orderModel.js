const path = require('path');
const { poolPromise } = require('../config/db');

class Order {
  static async _expandPackageItems(items, client) {
    if (!items || items.length === 0) return [];

    let expandedItems = [];

    for (const item of items) {
      const testResult = await client.query(
        'SELECT is_package, package_items FROM lab_test_catalog WHERE id = $1',
        [item.test_id]
      );

      if (testResult.rows.length === 0) continue; // Test doesn't exist, skip or throw error

      const testInfo = testResult.rows[0];

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
    const params = [];
    let query = `
      SELECT *, created_user, updated_user,
             (
               SELECT json_agg(row_to_json(sched))
               FROM (
                 SELECT s.*,
                        COALESCE(
                          (SELECT profile_image_url FROM lab_staff WHERE id = lab_orders.collector_id AND is_deleted = false LIMIT 1),
                          (SELECT profile_image_url FROM lab_staff WHERE name = s.collecting_person AND is_deleted = false LIMIT 1)
                        ) AS profile_image_url
                 FROM order_schedules s
                 WHERE s.order_id = lab_orders.id
               ) sched
             ) as schedule,
             (
               SELECT COALESCE(SUM(ROUND(oi.subtotal_mmk * COALESCE(rf.referral_percent, 0) / 100, 2)), 0)
               FROM lab_order_items oi
               LEFT JOIN test_referral_fees rf ON rf.test_id = oi.test_id AND rf.is_active = true AND rf.is_deleted = false
               WHERE oi.order_id = lab_orders.id
             ) AS referral_fee_total_mmk
      FROM lab_orders
      WHERE is_deleted = false
    `;

    if (filters.status) {
      params.push(filters.status);
      query += ` AND status = $${params.length}`;
    }
    if (filters.exclude_status) {
      params.push(filters.exclude_status);
      query += ` AND status <> $${params.length}`;
    }
    if (filters.user_id) {
      params.push(filters.user_id);
      query += ` AND user_id = $${params.length}`;
    }
    if (filters.priority) {
      params.push(filters.priority);
      query += ` AND priority = $${params.length}`;
    }
    if (filters.patient_name) {
      params.push(`%${filters.patient_name}%`);
      query += ` AND patient_name ILIKE $${params.length}`;
    }
    if (filters.is_tests_assigned !== undefined) {
      params.push(filters.is_tests_assigned === 'true' || filters.is_tests_assigned === true);
      query += ` AND is_tests_assigned = $${params.length}`;
    }

    const validSortFields = ['created_at', 'updated_at', 'status', 'patient_name', 'final_price_mmk', 'priority'];
    const sortBy = validSortFields.includes(filters.sortBy) ? filters.sortBy : 'created_at';
    const sortOrder = filters.sortOrder === 'ASC' || filters.sortOrder === 'asc' ? 'ASC' : 'DESC';
    query += ` ORDER BY ${sortBy} ${sortOrder}`;

    if (filters.page && filters.limit) {
      const page = parseInt(filters.page, 10);
      const limit = parseInt(filters.limit, 10);
      const offset = (page - 1) * limit;
      params.push(limit);
      query += ` LIMIT $${params.length}`;
      params.push(offset);
      query += ` OFFSET $${params.length}`;
    }

    const result = await pool.query(query, params);
    const orders = result.rows;
    const StorageService = require('../utils/storageService');
    for (let order of orders) {
      if (order.schedule && order.schedule.length > 0) {
        order.schedule = order.schedule[0];
        if (order.schedule.profile_image_url) {
          order.schedule.profile_image_url = await StorageService.getFileUrl(order.schedule.profile_image_url);
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
    const result = await pool.query(
      `SELECT o.*,
              u.name AS ordering_user_name,
              (
                SELECT json_agg(row_to_json(itm))
                FROM (
                  SELECT oi.*, tc.test_name, tc.test_code,
                         rf.referral_percent,
                         ROUND(oi.subtotal_mmk * COALESCE(rf.referral_percent, 0) / 100, 2) AS referral_fee_mmk
                  FROM lab_order_items oi
                  JOIN lab_test_catalog tc ON oi.test_id = tc.id
                  LEFT JOIN test_referral_fees rf ON rf.test_id = oi.test_id AND rf.is_active = true AND rf.is_deleted = false
                  WHERE oi.order_id = o.id
                ) itm
              ) as items,
              (
                SELECT json_agg(row_to_json(sched))
                FROM (
                  SELECT s.*,
                         COALESCE(
                           (SELECT profile_image_url FROM lab_staff WHERE id = o.collector_id AND is_deleted = false LIMIT 1),
                           (SELECT profile_image_url FROM lab_staff WHERE name = s.collecting_person AND is_deleted = false LIMIT 1)
                         ) AS profile_image_url
                  FROM order_schedules s
                  WHERE s.order_id = o.id
                ) sched
              ) as schedule,
              (SELECT json_agg(row_to_json(p) ORDER BY p.created_at ASC) FROM payments p WHERE p.order_id = o.id) as payments,
              (SELECT
                 COALESCE(SUM(amount_mmk), 0)
               FROM payments
               WHERE order_id = o.id AND status IN ('pending', 'received', 'verified')) as total_paid_mmk
       FROM lab_orders o
       LEFT JOIN users u ON u.id = o.user_id
       WHERE o.id = $1 AND o.is_deleted = false`,
      [id]
    );

    if (result.rows[0]) {
      const order = result.rows[0];
      order.items = order.items || [];
      order.schedule = order.schedule && order.schedule.length > 0 ? order.schedule[0] : null;
      order.payments = order.payments || [];
      order.balance_mmk = order.final_price_mmk - order.total_paid_mmk;
      order.referral_fee_total_mmk = order.items.reduce(
        (sum, item) => sum + (Number(item.referral_fee_mmk) || 0),
        0
      );

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
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const originalPrice = data.original_price_mmk || 0;
      const discountPercent = data.discount_percent || 0;
      const finalPrice = data.final_price_mmk || 0;
      const materialFee = data.material_fee_mmk || 0;
      const serviceFee = data.service_fee_mmk || 0;
      const isTestsAssigned = !!(data.items && data.items.length > 0);

      const orderResult = await client.query(
        `INSERT INTO lab_orders (id, user_id, collector_id, description, priority, patient_name, patient_age, patient_phone,
                               address, latitude, longitude, status, report_delivery_method, original_price_mmk,
                               discount_percent, final_price_mmk, material_fee_mmk, service_geofence_id, service_fee_mmk, prescription_url, is_tests_assigned, created_user, updated_user, is_deleted)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7,
                 $8, $9, $10, $11, $12, $13,
                 $14, $15, $16, $17, $18, $19, $20, $21, $21, false)
         RETURNING *`,
        [
          data.user_id,
          data.collector_id || null,
          data.description,
          data.priority,
          data.patient_name,
          data.patient_age,
          data.patient_phone,
          data.address,
          data.latitude,
          data.longitude,
          data.status || 'pending',
          data.report_delivery_method,
          originalPrice,
          discountPercent,
          finalPrice,
          materialFee,
          data.service_geofence_id || null,
          serviceFee,
          data.prescription_url,
          isTestsAssigned,
          createdBy,
        ]
      );

      const newOrder = orderResult.rows[0];

      if (data.items && data.items.length > 0) {
        const expandedItems = await this._expandPackageItems(data.items, client);

        for (const item of expandedItems) {
          await client.query(
            `INSERT INTO lab_order_items (id, order_id, test_id, quantity, unit_price_mmk, subtotal_mmk, created_user, updated_user)
             VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $6)`,
            [newOrder.id, item.test_id, item.quantity || 1, item.unit_price_mmk, item.subtotal_mmk, createdBy]
          );
        }
      }

      await this._recalculateFinalPrice(newOrder.id, client);

      const refetched = await client.query('SELECT * FROM lab_orders WHERE id = $1', [newOrder.id]);

      await client.query('COMMIT');
      return refetched.rows[0];
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  static async addItemsAndUpdateTotals(orderId, items, totals, updatedBy = null) {
    const pool = await poolPromise;
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Update order totals. service_fee_mmk is intentionally untouched here — this
      // method has no location context to re-resolve it, so the existing value stands.
      await client.query(
        `UPDATE lab_orders
         SET original_price_mmk = $2,
             discount_percent = $3,
             material_fee_mmk = $4,
             is_tests_assigned = true,
             updated_user = $5,
             updated_at = now()
         WHERE id = $1 AND is_deleted = false`,
        [orderId, totals.original_price_mmk, totals.discount_percent || 0, totals.material_fee_mmk || 0, updatedBy]
      );

      // Add new items
      if (items && items.length > 0) {
        const expandedItems = await this._expandPackageItems(items, client);

        for (const item of expandedItems) {
          // A UNIQUE(order_id, test_id) constraint exists on lab_order_items, so a
          // duplicate insert (e.g. the same package/test added twice) is a no-op.
          await client.query(
            `INSERT INTO lab_order_items (id, order_id, test_id, quantity, unit_price_mmk, subtotal_mmk, created_user, updated_user)
             VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $6)
             ON CONFLICT (order_id, test_id) DO NOTHING`,
            [orderId, item.test_id, item.quantity || 1, item.unit_price_mmk, item.subtotal_mmk, updatedBy]
          );
        }
      }

      await this._recalculateFinalPrice(orderId, client);
      await client.query('COMMIT');

      // Fetch and return the updated order
      const orderResult = await pool.query('SELECT * FROM lab_orders WHERE id = $1', [orderId]);
      return orderResult.rows[0];
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Authoritative final_price_mmk = items subtotal + material_fee_mmk + service_fee_mmk
   * (the order's own columns, as already set earlier in this transaction) − the referral
   * fee earned on this order's tests (subtotal_mmk * each test's referral_percent).
   * Never trust a client-sent final_price_mmk — always derive it from DB state.
   */
  static async _recalculateFinalPrice(orderId, client) {
    await client.query(
      `UPDATE lab_orders
       SET final_price_mmk = COALESCE((SELECT SUM(subtotal_mmk) FROM lab_order_items WHERE order_id = $1), 0)
                              + COALESCE(material_fee_mmk, 0) + COALESCE(service_fee_mmk, 0)
                              - COALESCE((
                                  SELECT SUM(ROUND(oi.subtotal_mmk * COALESCE(rf.referral_percent, 0) / 100, 2))
                                  FROM lab_order_items oi
                                  LEFT JOIN test_referral_fees rf
                                    ON rf.test_id = oi.test_id AND rf.is_active = true AND rf.is_deleted = false
                                  WHERE oi.order_id = $1
                                ), 0)
       WHERE id = $1`,
      [orderId]
    );
  }

  static async _resolveOrderItemPrices(items, discountPercent, client) {
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

      const testResult = await client.query(
        `SELECT base_price_mmk
         FROM lab_test_catalog
         WHERE id = $1 AND is_deleted = false`,
        [item.test_id]
      );

      if (testResult.rows.length === 0) {
        throw new Error(`Test not found: ${item.test_id}`);
      }

      const basePrice = Number(testResult.rows[0].base_price_mmk) || 0;
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
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const orderCheck = await client.query(
        `SELECT o.user_id, o.status,
                SUM(CASE WHEN oi.result_file_url IS NOT NULL THEN 1 ELSE 0 END) as uploaded_count
         FROM lab_orders o
         LEFT JOIN lab_order_items oi ON oi.order_id = o.id
         WHERE o.id = $1 AND o.is_deleted = false
         GROUP BY o.user_id, o.status`,
        [orderId]
      );

      if (orderCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return { error: 'not_found' };
      }

      const { user_id: orderUserId, status, uploaded_count: uploadedCount } = orderCheck.rows[0];
      if (status !== 'pending') {
        throw new Error('Only pending orders can be synchronized with pending-sync.');
      }
      if (!isStaff) {
        const ownerId = orderUserId ? String(orderUserId).toLowerCase() : '';
        const requesterId = userId ? String(userId).toLowerCase() : '';
        if (!ownerId || ownerId !== requesterId) {
          await client.query('ROLLBACK');
          return { error: 'forbidden' };
        }
      }
      if (uploadedCount > 0) {
        throw new Error('Tests cannot be changed after results have been uploaded.');
      }

      const items = Array.isArray(data.items) ? data.items : [];
      const discountPercent = Number(data.discount_percent) || 0;
      const pricedItems = await this._resolveOrderItemPrices(items, discountPercent, client);

      await client.query(
        `UPDATE lab_orders
         SET collector_id = $2,
             description = $3,
             priority = $4,
             patient_name = $5,
             patient_age = $6,
             patient_phone = $7,
             address = $8,
             latitude = $9,
             longitude = $10,
             report_delivery_method = $11,
             original_price_mmk = $12,
             discount_percent = $13,
             material_fee_mmk = $14,
             service_geofence_id = $15,
             service_fee_mmk = $16,
             is_tests_assigned = $17,
             updated_user = $18,
             updated_at = now()
         WHERE id = $1 AND is_deleted = false AND status = 'pending'`,
        [
          orderId,
          data.collector_id || null,
          data.description ?? null,
          data.priority,
          data.patient_name,
          data.patient_age,
          data.patient_phone,
          data.address,
          data.latitude,
          data.longitude,
          data.report_delivery_method,
          data.original_price_mmk || 0,
          discountPercent,
          data.material_fee_mmk || 0,
          data.service_geofence_id || null,
          data.service_fee_mmk || 0,
          pricedItems.length > 0,
          updatedBy,
        ]
      );

      await client.query('DELETE FROM lab_order_items WHERE order_id = $1', [orderId]);

      if (pricedItems.length > 0) {
        const expandedItems = await this._expandPackageItems(pricedItems, client);

        for (const item of expandedItems) {
          await client.query(
            `INSERT INTO lab_order_items (id, order_id, test_id, quantity, unit_price_mmk, subtotal_mmk, created_user, updated_user)
             VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $6)`,
            [orderId, item.test_id, item.quantity || 1, item.unit_price_mmk, item.subtotal_mmk, updatedBy]
          );
        }
      }

      await this._recalculateFinalPrice(orderId, client);
      await client.query('COMMIT');
      return this.getById(orderId);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  static async replaceItemsAndUpdateTotals(orderId, items, totals, updatedBy = null) {
    const pool = await poolPromise;
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const orderCheck = await client.query(
        `SELECT o.status,
                SUM(CASE WHEN oi.result_file_url IS NOT NULL THEN 1 ELSE 0 END) as uploaded_count
         FROM lab_orders o
         LEFT JOIN lab_order_items oi ON oi.order_id = o.id
         WHERE o.id = $1 AND o.is_deleted = false
         GROUP BY o.status`,
        [orderId]
      );

      if (orderCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return null;
      }

      const { status, uploaded_count: uploadedCount } = orderCheck.rows[0];
      if (status !== 'pending') {
        throw new Error('Tests can only be updated while the order is pending.');
      }
      if (uploadedCount > 0) {
        throw new Error('Tests cannot be changed after results have been uploaded.');
      }

      await client.query('DELETE FROM lab_order_items WHERE order_id = $1', [orderId]);

      // service_fee_mmk is intentionally untouched here — this method has no location
      // context to re-resolve it, so the existing value stands.
      await client.query(
        `UPDATE lab_orders
         SET original_price_mmk = $2,
             discount_percent = $3,
             material_fee_mmk = $4,
             is_tests_assigned = $5,
             updated_user = $6,
             updated_at = now()
         WHERE id = $1 AND is_deleted = false`,
        [
          orderId,
          totals.original_price_mmk,
          totals.discount_percent || 0,
          totals.material_fee_mmk || 0,
          !!(items && items.length > 0),
          updatedBy,
        ]
      );

      if (items && items.length > 0) {
        const expandedItems = await this._expandPackageItems(items, client);

        for (const item of expandedItems) {
          await client.query(
            `INSERT INTO lab_order_items (id, order_id, test_id, quantity, unit_price_mmk, subtotal_mmk, created_user, updated_user)
             VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $6)`,
            [orderId, item.test_id, item.quantity || 1, item.unit_price_mmk, item.subtotal_mmk, updatedBy]
          );
        }
      }

      await this._recalculateFinalPrice(orderId, client);
      await client.query('COMMIT');

      const orderResult = await pool.query('SELECT * FROM lab_orders WHERE id = $1', [orderId]);
      return orderResult.rows[0];
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  static async update(id, data, updatedBy = null) {
    const pool = await poolPromise;
    const result = await pool.query(
      `UPDATE lab_orders SET
         collector_id = $2,
         description = $3,
         priority = $4,
         patient_name = $5,
         patient_age = $6,
         patient_phone = $7,
         address = $8,
         latitude = $9,
         longitude = $10,
         report_delivery_method = $11,
         service_geofence_id = $12,
         service_fee_mmk = $13,
         updated_user = $14,
         updated_at = now()
       WHERE id = $1 AND is_deleted = false
       RETURNING *`,
      [
        id,
        data.collector_id || null,
        data.description ?? null,
        data.priority,
        data.patient_name,
        data.patient_age,
        data.patient_phone,
        data.address,
        data.latitude,
        data.longitude,
        data.report_delivery_method,
        data.service_geofence_id || null,
        data.service_fee_mmk || 0,
        updatedBy,
      ]
    );

    return result.rows[0] ?? null;
  }

  static async updateCollectorId(id, collectorId, updatedBy = null) {
    const pool = await poolPromise;
    const result = await pool.query(
      `UPDATE lab_orders SET
         collector_id = $2,
         updated_user = $3,
         updated_at = now()
       WHERE id = $1 AND is_deleted = false`,
      [id, collectorId || null, updatedBy]
    );
    return result.rowCount > 0;
  }

  static async updateStatus(id, newStatus, staffId, note, updatedBy = null) {
    const pool = await poolPromise;
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const oldStatusResult = await client.query(
        'SELECT status FROM lab_orders WHERE id = $1 AND is_deleted = false',
        [id]
      );

      const oldStatus = oldStatusResult.rows[0]?.status;
      if (!oldStatus) throw new Error('Order not found or deleted');

      const result = await client.query(
        `UPDATE lab_orders SET status = $2, updated_user = $3, updated_at = now()
         WHERE id = $1 AND is_deleted = false
         RETURNING *`,
        [id, newStatus, updatedBy || staffId]
      );

      await client.query(
        `INSERT INTO order_status_logs (id, order_id, changed_by, old_status, new_status, note, created_user)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6)`,
        [id, staffId, oldStatus, newStatus, note, updatedBy || staffId]
      );

      await client.query('COMMIT');
      return result.rows[0];
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  static async bulkUpdateStatus(ids, newStatus, staffId, note, updatedBy = null) {
    const pool = await poolPromise;
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      const updatedOrders = [];

      for (const id of ids) {
        // 1. Get old status
        const oldStatusResult = await client.query(
          'SELECT status FROM lab_orders WHERE id = $1 AND is_deleted = false',
          [id]
        );

        const oldStatus = oldStatusResult.rows[0]?.status;
        if (!oldStatus) throw new Error(`Order ${id} not found or deleted`);

        // 2. Update status
        const result = await client.query(
          `UPDATE lab_orders SET status = $2, updated_user = $3, updated_at = now()
           WHERE id = $1 AND is_deleted = false
           RETURNING *`,
          [id, newStatus, updatedBy || staffId]
        );

        const updatedOrder = result.rows[0];
        if (!updatedOrder) throw new Error(`Failed to update status for order ${id}`);
        updatedOrders.push(updatedOrder);

        // 3. Log change
        await client.query(
          `INSERT INTO order_status_logs (id, order_id, changed_by, old_status, new_status, note, created_user)
           VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6)`,
          [id, staffId, oldStatus, newStatus, note, updatedBy || staffId]
        );
      }

      await client.query('COMMIT');
      return updatedOrders;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  static async getTracking(orderId) {
    const pool = await poolPromise;

    // Get order details
    const orderResult = await pool.query(
      `SELECT o.id, o.patient_name, o.status as current_status, o.created_at, o.updated_at
       FROM lab_orders o
       WHERE o.id = $1 AND o.is_deleted = false`,
      [orderId]
    );

    const order = orderResult.rows[0];
    if (!order) return null;

    // Get order status logs with staff names
    const logsResult = await pool.query(
      `SELECT l.id, l.old_status, l.new_status, l.note, l.created_at, s.name as changed_by_name
       FROM order_status_logs l
       LEFT JOIN lab_staff s ON l.changed_by = s.id
       WHERE l.order_id = $1
       ORDER BY l.created_at ASC`,
      [orderId]
    );

    // Get schedule if any
    const scheduleResult = await pool.query(
      `SELECT s.collecting_person, s.collection_time, s.running_time, s.report_out_time,
              COALESCE(
                (SELECT profile_image_url FROM lab_staff WHERE id = o.collector_id AND is_deleted = false LIMIT 1),
                (SELECT profile_image_url FROM lab_staff WHERE name = s.collecting_person AND is_deleted = false LIMIT 1)
              ) AS profile_image_url
       FROM order_schedules s
       LEFT JOIN lab_orders o ON s.order_id = o.id
       WHERE s.order_id = $1`,
      [orderId]
    );

    const schedule = scheduleResult.rows[0] || null;
    if (schedule && schedule.profile_image_url) {
      const StorageService = require('../utils/storageService');
      schedule.profile_image_url = await StorageService.getFileUrl(schedule.profile_image_url);
    }

    const logs = logsResult.rows;
    const timeline = [
      {
        id: `created-${order.id}`,
        old_status: null,
        new_status: 'pending',
        note: 'Order placed successfully',
        created_at: order.created_at,
        changed_by_name: 'Patient'
      },
      ...logs
    ];

    return {
      order_id: order.id,
      patient_name: order.patient_name,
      current_status: order.current_status,
      created_at: order.created_at,
      updated_at: order.updated_at,
      schedule,
      timeline
    };
  }

  static async delete(id, updatedBy = null) {
    const pool = await poolPromise;
    const result = await pool.query(
      'UPDATE lab_orders SET is_deleted = true, updated_user = $2, updated_at = now() WHERE id = $1',
      [id, updatedBy]
    );
    return result.rowCount > 0;
  }

  static async uploadResult(orderId, testId, fileUrl, updatedBy = null) {
    const pool = await poolPromise;
    const result = await pool.query(
      `UPDATE lab_order_items
       SET result_file_url = $3,
           result_pdf_group_id = NULL,
           result_pdf_display_solo = false,
           updated_user = $4,
           updated_at = now()
       WHERE order_id = $1 AND test_id = $2`,
      [orderId, testId, fileUrl, updatedBy]
    );
    return result.rowCount > 0;
  }

  static async uploadResultBulk(orderId, testIds, fileUrl, groupId, updatedBy = null) {
    if (!Array.isArray(testIds) || testIds.length === 0) return 0;
    const pool = await poolPromise;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      let updated = 0;
      for (const testId of testIds) {
        const result = await client.query(
          `UPDATE lab_order_items
           SET result_file_url = $3,
               result_pdf_group_id = $4,
               result_pdf_display_solo = false,
               updated_user = $5,
               updated_at = now()
           WHERE order_id = $1 AND test_id = $2`,
          [orderId, testId, fileUrl, groupId, updatedBy]
        );
        updated += result.rowCount || 0;
      }
      await client.query('COMMIT');
      return updated;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  static async separateResultPdfs(orderId, testIds, updatedBy = null) {
    if (!Array.isArray(testIds) || testIds.length === 0) return 0;
    const pool = await poolPromise;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      let updated = 0;
      for (const testId of testIds) {
        const result = await client.query(
          `UPDATE lab_order_items
           SET result_pdf_group_id = NULL,
               result_pdf_display_solo = true,
               updated_user = $3,
               updated_at = now()
           WHERE order_id = $1 AND test_id = $2`,
          [orderId, testId, updatedBy]
        );
        updated += result.rowCount || 0;
      }
      await client.query('COMMIT');
      return updated;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  static async saveAiReview(orderId, testId, verdict, rawResponse, updatedBy = null) {
    const pool = await poolPromise;
    const result = await pool.query(
      `UPDATE lab_order_items
       SET ai_verdict = $3, ai_raw_response = $4, updated_user = $5, updated_at = now()
       WHERE order_id = $1 AND test_id = $2`,
      [orderId, testId, verdict, rawResponse, updatedBy]
    );
    return result.rowCount > 0;
  }

  static async areAllResultsUploaded(orderId) {
    const pool = await poolPromise;
    const result = await pool.query(
      `SELECT COUNT(*) as total,
              SUM(CASE WHEN result_file_url IS NOT NULL THEN 1 ELSE 0 END) as uploaded
       FROM lab_order_items
       WHERE order_id = $1`,
      [orderId]
    );

    if (result.rows.length === 0) return false;

    const { total, uploaded } = result.rows[0];
    return total > 0 && Number(total) === Number(uploaded);
  }

  static async getQrDetails(orderId) {
    const pool = await poolPromise;
    const result = await pool.query(
      `SELECT
         o.patient_name, o.patient_age, o.patient_phone, o.address,
         (
           SELECT json_agg(json_build_object('test_name', t.test_name, 'test_code', t.test_code))
           FROM lab_order_items oi
           JOIN lab_test_catalog t ON oi.test_id = t.id
           WHERE oi.order_id = o.id AND t.is_deleted = false
         ) as tests
       FROM lab_orders o
       WHERE o.id = $1 AND o.is_deleted = false`,
      [orderId]
    );

    if (result.rows[0]) {
      const details = result.rows[0];
      details.tests = details.tests || [];
      return details;
    }
    return null;
  }
}

module.exports = Order;
