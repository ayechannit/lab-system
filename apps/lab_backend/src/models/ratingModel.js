const { sql, poolPromise } = require('../config/db');

class Rating {
  static async create(data, createdBy = null) {
    const pool = await poolPromise;
    
    // Check if order already has a rating
    const checkReq = await pool.request()
      .input('order_id', sql.UniqueIdentifier, data.order_id)
      .query('SELECT id FROM order_ratings WHERE order_id = @order_id');
      
    if (checkReq.recordset.length > 0) {
      throw new Error('This order has already been rated.');
    }

    const result = await pool.request()
      .input('order_id', sql.UniqueIdentifier, data.order_id)
      .input('user_id', sql.UniqueIdentifier, data.user_id)
      .input('rating', sql.Int, data.rating)
      .input('remark', sql.Text, data.remark)
      .input('created_user', sql.UniqueIdentifier, createdBy)
      .query(`
        INSERT INTO order_ratings (id, order_id, user_id, rating, remark, created_user, updated_user)
        OUTPUT INSERTED.*
        VALUES (NEWID(), @order_id, @user_id, @rating, @remark, @created_user, @created_user)
      `);
      
    return result.recordset[0];
  }

  static async getAll(filters = {}) {
    const pool = await poolPromise;
    const request = pool.request();
    
    let query = `
      SELECT r.*, 
             u.name as user_name, u.email as user_email, u.phone as user_phone, u.role as user_role,
             o.patient_name, o.patient_age, o.status as order_status, o.priority, o.final_price_mmk, o.created_at as order_created_at,
             (SELECT t.test_name, t.test_code 
              FROM lab_order_items oi 
              JOIN lab_test_catalog t ON oi.test_id = t.id 
              WHERE oi.order_id = o.id 
              FOR JSON PATH) as order_tests
      FROM order_ratings r
      JOIN users u ON r.user_id = u.id
      JOIN lab_orders o ON r.order_id = o.id
      WHERE 1=1
    `;

    if (filters.rating) {
      query += ' AND r.rating = @rating';
      request.input('rating', sql.Int, filters.rating);
    }
    
    if (filters.user_id) {
      query += ' AND r.user_id = @user_id';
      request.input('user_id', sql.UniqueIdentifier, filters.user_id);
    }

    query += ' ORDER BY r.created_at DESC';

    if (filters.page && filters.limit) {
      const page = parseInt(filters.page, 10);
      const limit = parseInt(filters.limit, 10);
      const offset = (page - 1) * limit;
      query += ' OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY';
      request.input('offset', sql.Int, offset);
      request.input('limit', sql.Int, limit);
    }

    const result = await request.query(query);
    
    // Parse the JSON string from SQL Server back into a JavaScript array
    return result.recordset.map(row => {
      if (row.order_tests) {
        row.order_tests = JSON.parse(row.order_tests);
      } else {
        row.order_tests = [];
      }
      return row;
    });
  }
  
  static async getByOrderId(orderId) {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('order_id', sql.UniqueIdentifier, orderId)
      .query(`
        SELECT r.*, 
               u.name as user_name, u.email as user_email, u.phone as user_phone, u.role as user_role,
               o.patient_name, o.patient_age, o.status as order_status, o.priority, o.final_price_mmk, o.created_at as order_created_at,
               (SELECT t.test_name, t.test_code 
                FROM lab_order_items oi 
                JOIN lab_test_catalog t ON oi.test_id = t.id 
                WHERE oi.order_id = o.id 
                FOR JSON PATH) as order_tests
        FROM order_ratings r
        JOIN users u ON r.user_id = u.id
        JOIN lab_orders o ON r.order_id = o.id
        WHERE r.order_id = @order_id
      `);
      
    if (result.recordset[0]) {
      const row = result.recordset[0];
      row.order_tests = row.order_tests ? JSON.parse(row.order_tests) : [];
      return row;
    }
    return null;
  }
}

module.exports = Rating;