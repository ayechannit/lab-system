const { poolPromise } = require('../config/db');

const ORDER_TESTS_SUBQUERY = `
  (SELECT json_agg(json_build_object('test_name', t.test_name, 'test_code', t.test_code))
   FROM lab_order_items oi
   JOIN lab_test_catalog t ON oi.test_id = t.id
   WHERE oi.order_id = o.id) as order_tests
`;

class Rating {
  static async create(data, createdBy = null) {
    const pool = await poolPromise;

    // Check if order already has a rating
    const checkReq = await pool.query(
      'SELECT id FROM order_ratings WHERE order_id = $1',
      [data.order_id]
    );

    if (checkReq.rows.length > 0) {
      throw new Error('This order has already been rated.');
    }

    const result = await pool.query(
      `INSERT INTO order_ratings (id, order_id, user_id, rating, remark, created_user, updated_user)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $5)
       RETURNING *`,
      [data.order_id, data.user_id, data.rating, data.remark, createdBy]
    );

    return result.rows[0];
  }

  static async getAll(filters = {}) {
    const pool = await poolPromise;
    const params = [];

    let query = `
      SELECT r.*,
             u.name as user_name, u.phone as user_phone,
             o.patient_name, o.patient_age, o.status as order_status, o.priority, o.final_price_mmk, o.created_at as order_created_at,
             ${ORDER_TESTS_SUBQUERY}
      FROM order_ratings r
      JOIN users u ON r.user_id = u.id
      JOIN lab_orders o ON r.order_id = o.id
      WHERE 1=1
    `;

    if (filters.rating) {
      params.push(filters.rating);
      query += ` AND r.rating = $${params.length}`;
    }

    if (filters.user_id) {
      params.push(filters.user_id);
      query += ` AND r.user_id = $${params.length}`;
    }

    if (filters.search) {
      params.push(`%${filters.search}%`);
      const idx = params.length;
      query += ` AND (o.patient_name ILIKE $${idx} OR u.name ILIKE $${idx} OR u.phone ILIKE $${idx} OR r.remark ILIKE $${idx})`;
    }

    const validSortFields = ['created_at', 'updated_at', 'rating', 'patient_name'];
    let sortBy = 'r.created_at';
    if (filters.sortBy === 'patient_name') {
      sortBy = 'o.patient_name';
    } else if (validSortFields.includes(filters.sortBy)) {
      sortBy = `r.${filters.sortBy}`;
    }
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

    return result.rows.map(row => {
      row.order_tests = row.order_tests || [];
      return row;
    });
  }

  static async getByOrderId(orderId) {
    const pool = await poolPromise;
    const result = await pool.query(
      `SELECT r.*,
              u.name as user_name, u.phone as user_phone,
              o.patient_name, o.patient_age, o.status as order_status, o.priority, o.final_price_mmk, o.created_at as order_created_at,
              ${ORDER_TESTS_SUBQUERY}
       FROM order_ratings r
       JOIN users u ON r.user_id = u.id
       JOIN lab_orders o ON r.order_id = o.id
       WHERE r.order_id = $1`,
      [orderId]
    );

    if (result.rows[0]) {
      const row = result.rows[0];
      row.order_tests = row.order_tests || [];
      return row;
    }
    return null;
  }
}

module.exports = Rating;
