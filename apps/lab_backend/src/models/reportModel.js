const { poolPromise } = require('../config/db');

/**
 * Builds a ` AND field >= $n AND field <= $m` clause (using 1-based placeholder
 * indices starting at `startIndex + 1`) plus the matching params array, for the
 * optional `startDate`/`endDate` filters used throughout this report.
 */
function dateRangeClause(filters, dateField, startIndex) {
  const clauses = [];
  const params = [];
  if (filters.startDate) {
    params.push(filters.startDate);
    clauses.push(`${dateField} >= $${startIndex + params.length}`);
  }
  if (filters.endDate) {
    params.push(filters.endDate);
    clauses.push(`${dateField} <= $${startIndex + params.length}`);
  }
  return { clause: clauses.length ? ' AND ' + clauses.join(' AND ') : '', params };
}

class Report {
  static async getDashboardKpis(filters = {}) {
    const pool = await poolPromise;
    const { clause: dateFilter, params } = dateRangeClause(filters, 'created_at', 0);
    const aiDateFilter = dateFilter.replace(/created_at/g, 'checked_at');

    const kpiQuery = `
      SELECT
        (SELECT COALESCE(SUM(final_price_mmk), 0) FROM lab_orders WHERE is_deleted = false AND status = 'delivered' ${dateFilter}) as total_revenue,
        (SELECT COUNT(*) FROM lab_orders WHERE is_deleted = false ${dateFilter}) as total_orders,
        (SELECT COUNT(*) FROM lab_orders WHERE is_deleted = false AND priority = 'urgent' ${dateFilter}) as urgent_orders,
        (SELECT COUNT(*) FROM users WHERE is_deleted = false) as total_users,
        (SELECT COUNT(*) FROM ai_quality_checks WHERE 1=1 ${aiDateFilter} AND verdict = 'pass') as ai_pass_count,
        (SELECT COUNT(*) FROM ai_quality_checks WHERE 1=1 ${aiDateFilter} AND verdict != 'pass') as ai_issue_count
    `;

    const kpiResult = await pool.query(kpiQuery, params);

    const trendQuery = `
      SELECT
        CAST(created_at AS DATE) as date,
        SUM(final_price_mmk) as revenue,
        COUNT(*) as order_count
      FROM lab_orders
      WHERE is_deleted = false ${dateFilter}
      GROUP BY CAST(created_at AS DATE)
      ORDER BY date ASC
    `;

    const trendResult = await pool.query(trendQuery, params);

    return {
      kpis: kpiResult.rows[0],
      revenueTrend: trendResult.rows
    };
  }

  static async getTestCategoryDistribution(filters = {}) {
    const pool = await poolPromise;
    const params = [];

    let query = `
      SELECT
        tc.category,
        COUNT(oi.id) as test_count,
        SUM(oi.subtotal_mmk) as total_revenue
      FROM lab_order_items oi
      JOIN lab_test_catalog tc ON oi.test_id = tc.id
      JOIN lab_orders o ON oi.order_id = o.id
      WHERE o.is_deleted = false
    `;

    if (filters.startDate) {
      params.push(filters.startDate);
      query += ` AND o.created_at >= $${params.length}`;
    }
    if (filters.endDate) {
      params.push(filters.endDate);
      query += ` AND o.created_at <= $${params.length}`;
    }
    if (filters.category) {
      params.push(filters.category);
      query += ` AND tc.category = $${params.length}`;
    }

    query += ' GROUP BY tc.category ORDER BY total_revenue DESC';

    const result = await pool.query(query, params);
    return result.rows;
  }

  static async getTurnaroundTimeReport(filters = {}) {
    const pool = await poolPromise;
    const params = [];

    let query = `
      SELECT
        o.id as order_id,
        o.patient_name,
        o.priority,
        s.collection_time,
        s.report_out_time,
        EXTRACT(EPOCH FROM (s.report_out_time - s.collection_time)) / 60 as tat_minutes
      FROM lab_orders o
      JOIN order_schedules s ON o.id = s.order_id
      WHERE o.is_deleted = false AND s.report_out_time IS NOT NULL
    `;

    if (filters.startDate) {
      params.push(filters.startDate);
      query += ` AND o.created_at >= $${params.length}`;
    }
    if (filters.endDate) {
      params.push(filters.endDate);
      query += ` AND o.created_at <= $${params.length}`;
    }
    if (filters.priority) {
      params.push(filters.priority);
      query += ` AND o.priority = $${params.length}`;
    }

    query += ' ORDER BY o.created_at DESC';

    const result = await pool.query(query, params);
    return result.rows;
  }

  static async getPendingResultsQueue(filters = {}) {
    const pool = await poolPromise;
    const params = [];

    let query = `
      SELECT
        o.id as order_id,
        o.patient_name,
        o.status,
        o.priority,
        o.created_at,
        EXTRACT(EPOCH FROM (now() - o.created_at)) / 3600 as hours_elapsed
      FROM lab_orders o
      WHERE o.is_deleted = false AND o.status NOT IN ('delivered', 'completed')
    `;

    if (filters.priority) {
      params.push(filters.priority);
      query += ` AND o.priority = $${params.length}`;
    }
    if (filters.status) {
      params.push(filters.status);
      query += ` AND o.status = $${params.length}`;
    }

    query += ' ORDER BY o.priority DESC, o.created_at ASC';

    const result = await pool.query(query, params);
    return result.rows;
  }

  static async getStaffActivityAudit(filters = {}) {
    const pool = await poolPromise;
    const params = [];

    let query = `
      SELECT
        s.name as staff_name,
        s.role as staff_role,
        COUNT(l.id) as actions_performed,
        MAX(l.created_at) as last_action_at
      FROM order_status_logs l
      JOIN lab_staff s ON l.changed_by = s.id
      WHERE 1=1
    `;

    if (filters.startDate) {
      params.push(filters.startDate);
      query += ` AND l.created_at >= $${params.length}`;
    }
    if (filters.endDate) {
      params.push(filters.endDate);
      query += ` AND l.created_at <= $${params.length}`;
    }
    if (filters.staffId) {
      params.push(filters.staffId);
      query += ` AND s.id = $${params.length}`;
    }

    query += ' GROUP BY s.name, s.role ORDER BY actions_performed DESC';

    const result = await pool.query(query, params);
    return result.rows;
  }

  static async getDiscountImpactAnalysis(filters = {}) {
    const pool = await poolPromise;
    const params = [];

    let query = `
      SELECT
        SUM(original_price_mmk) as total_original_value,
        SUM(final_price_mmk) as total_final_revenue,
        SUM(original_price_mmk - final_price_mmk) as total_discount_given,
        CASE
          WHEN SUM(original_price_mmk) > 0
          THEN (SUM(original_price_mmk - final_price_mmk) / SUM(original_price_mmk)) * 100
          ELSE 0
        END as effective_discount_percent
      FROM lab_orders o
      WHERE o.is_deleted = false
    `;

    if (filters.startDate) {
      params.push(filters.startDate);
      query += ` AND o.created_at >= $${params.length}`;
    }
    if (filters.endDate) {
      params.push(filters.endDate);
      query += ` AND o.created_at <= $${params.length}`;
    }

    const result = await pool.query(query, params);
    return result.rows[0];
  }

  static async getRatingsSummary(filters = {}) {
    const pool = await poolPromise;
    const { clause: dateFilter, params } = dateRangeClause(filters, 'created_at', 0);

    const kpiQuery = `
      SELECT
        AVG(CAST(rating AS FLOAT)) as average_rating,
        COUNT(*) as total_reviews,
        (SELECT COUNT(*) FROM order_ratings WHERE rating >= 4) as positive_reviews,
        (SELECT COUNT(*) FROM order_ratings WHERE rating <= 2) as negative_reviews
      FROM order_ratings
      WHERE 1=1 ${dateFilter}
    `;

    const kpiResult = await pool.query(kpiQuery, params);

    const reviewParams = [...params];
    let paramIdx = 0;
    let latestReviewsQuery = `
      SELECT
        r.rating,
        r.remark,
        u.name as user_name,
        r.created_at
      FROM order_ratings r
      JOIN users u ON r.user_id = u.id
      WHERE 1=1
    `;

    if (filters.startDate) {
      paramIdx += 1;
      latestReviewsQuery += ` AND r.created_at >= $${paramIdx}`;
    }
    if (filters.endDate) {
      paramIdx += 1;
      latestReviewsQuery += ` AND r.created_at <= $${paramIdx}`;
    }
    if (filters.minRating) {
      reviewParams.push(filters.minRating);
      latestReviewsQuery += ` AND r.rating >= $${reviewParams.length}`;
    }

    latestReviewsQuery += ' ORDER BY r.created_at DESC LIMIT 5';

    const reviewsResult = await pool.query(latestReviewsQuery, reviewParams);

    return {
      stats: kpiResult.rows[0],
      latestReviews: reviewsResult.rows
    };
  }

  static async getCollectionReport(filters = {}) {
    const pool = await poolPromise;
    const params = [];

    let query = `
      SELECT
        s.id as staff_id,
        s.name as staff_name,
        COUNT(l.id) as collections_count,
        AVG(CAST(EXTRACT(EPOCH FROM (l.created_at - o.created_at)) / 60 AS FLOAT)) as avg_assignment_to_collection_minutes
      FROM order_status_logs l
      JOIN lab_staff s ON l.changed_by = s.id
      JOIN lab_orders o ON l.order_id = o.id
      WHERE l.new_status = 'collecting' AND s.role = 'collector'
    `;

    if (filters.startDate) {
      params.push(filters.startDate);
      query += ` AND l.created_at >= $${params.length}`;
    }
    if (filters.endDate) {
      params.push(filters.endDate);
      query += ` AND l.created_at <= $${params.length}`;
    }

    query += ' GROUP BY s.id, s.name ORDER BY collections_count DESC';

    const result = await pool.query(query, params);
    return result.rows;
  }

  static async getUserReport(userId, filters = {}) {
    const pool = await poolPromise;
    // $1 is always user_id; startDate/endDate (if present) follow at $2, $3.
    const { clause: dateFilter, params: dateParams } = dateRangeClause(filters, 'created_at', 1);
    const params = [userId, ...dateParams];

    // 1. Query user-specific KPIs
    const kpiQuery = `
      SELECT
        (SELECT COALESCE(SUM(final_price_mmk), 0) FROM lab_orders WHERE user_id = $1 AND is_deleted = false AND status = 'delivered' ${dateFilter}) as total_spent,
        (SELECT COUNT(*) FROM lab_orders WHERE user_id = $1 AND is_deleted = false ${dateFilter}) as total_orders,
        (SELECT COUNT(*) FROM lab_orders WHERE user_id = $1 AND is_deleted = false AND status IN ('completed', 'delivered') ${dateFilter}) as completed_orders,
        (SELECT COUNT(*) FROM lab_orders WHERE user_id = $1 AND is_deleted = false AND status NOT IN ('completed', 'delivered') ${dateFilter}) as pending_orders,
        (SELECT COALESCE(total_points, 0) FROM users WHERE id = $1) as loyalty_points
    `;
    const kpiResult = await pool.query(kpiQuery, params);

    // 2. Query spend & order trends
    const trendQuery = `
      SELECT
        CAST(created_at AS DATE) as date,
        SUM(final_price_mmk) as spent,
        COUNT(*) as order_count
      FROM lab_orders
      WHERE user_id = $1 AND is_deleted = false ${dateFilter}
      GROUP BY CAST(created_at AS DATE)
      ORDER BY date ASC
    `;
    const trendResult = await pool.query(trendQuery, params);

    // 3. Query top ordered tests
    const topTestsQuery = `
      SELECT
        tc.test_name,
        tc.test_code,
        tc.category,
        COUNT(oi.id) as order_count,
        SUM(oi.subtotal_mmk) as total_spent
      FROM lab_order_items oi
      JOIN lab_test_catalog tc ON oi.test_id = tc.id
      JOIN lab_orders o ON oi.order_id = o.id
      WHERE o.user_id = $1 AND o.is_deleted = false ${dateFilter}
      GROUP BY tc.test_name, tc.test_code, tc.category
      ORDER BY order_count DESC
      LIMIT 5
    `;
    const topTestsResult = await pool.query(topTestsQuery, params);

    return {
      kpis: kpiResult.rows[0],
      spendTrend: trendResult.rows,
      topTests: topTestsResult.rows
    };
  }
}

module.exports = Report;
