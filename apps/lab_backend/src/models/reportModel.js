const { sql, poolPromise } = require('../config/db');

class Report {
  static _applyDateFilters(query, filters, dateField = 'created_at') {
    let whereClauses = [];
    if (filters.startDate) {
      whereClauses.push(`${dateField} >= @startDate`);
    }
    if (filters.endDate) {
      whereClauses.push(`${dateField} <= @endDate`);
    }
    return whereClauses;
  }

  static async getDashboardKpis(filters = {}) {
    const pool = await poolPromise;
    const request = pool.request();
    
    let dateFilter = '';
    if (filters.startDate) {
      dateFilter += ' AND created_at >= @startDate';
      request.input('startDate', sql.DateTime2, filters.startDate);
    }
    if (filters.endDate) {
      dateFilter += ' AND created_at <= @endDate';
      request.input('endDate', sql.DateTime2, filters.endDate);
    }

    // For KPIs, some subqueries might need date filters while others (like total users) might not.
    // Usually, "Total Revenue" and "Total Orders" in a dashboard context refer to the selected period.
    const kpiQuery = `
      SELECT 
        (SELECT ISNULL(SUM(final_price_mmk), 0) FROM lab_orders WHERE is_deleted = 0 AND status = 'delivered' ${dateFilter}) as total_revenue,
        (SELECT COUNT(*) FROM lab_orders WHERE is_deleted = 0 ${dateFilter}) as total_orders,
        (SELECT COUNT(*) FROM lab_orders WHERE is_deleted = 0 AND priority = 'urgent' ${dateFilter}) as urgent_orders,
        (SELECT COUNT(*) FROM users WHERE is_deleted = 0) as total_users,
        (SELECT COUNT(*) FROM ai_quality_checks WHERE 1=1 ${dateFilter.replace(/created_at/g, 'checked_at')} AND verdict = 'pass') as ai_pass_count,
        (SELECT COUNT(*) FROM ai_quality_checks WHERE 1=1 ${dateFilter.replace(/created_at/g, 'checked_at')} AND verdict != 'pass') as ai_issue_count
    `;
    
    const kpiResult = await request.query(kpiQuery);
    
    const trendQuery = `
      SELECT 
        CAST(created_at AS DATE) as date,
        SUM(final_price_mmk) as revenue,
        COUNT(*) as order_count
      FROM lab_orders
      WHERE is_deleted = 0 ${dateFilter}
      GROUP BY CAST(created_at AS DATE)
      ORDER BY date ASC
    `;
    
    const trendResult = await request.query(trendQuery);
    
    return {
      kpis: kpiResult.recordset[0],
      revenueTrend: trendResult.recordset
    };
  }

  static async getTestCategoryDistribution(filters = {}) {
    const pool = await poolPromise;
    const request = pool.request();
    
    let query = `
      SELECT 
        tc.category,
        COUNT(oi.id) as test_count,
        SUM(oi.subtotal_mmk) as total_revenue
      FROM lab_order_items oi
      JOIN lab_test_catalog tc ON oi.test_id = tc.id
      JOIN lab_orders o ON oi.order_id = o.id
      WHERE o.is_deleted = 0
    `;

    if (filters.startDate) {
      query += ' AND o.created_at >= @startDate';
      request.input('startDate', sql.DateTime2, filters.startDate);
    }
    if (filters.endDate) {
      query += ' AND o.created_at <= @endDate';
      request.input('endDate', sql.DateTime2, filters.endDate);
    }
    if (filters.category) {
      query += ' AND tc.category = @category';
      request.input('category', sql.NVarChar, filters.category);
    }

    query += ' GROUP BY tc.category ORDER BY total_revenue DESC';
    
    const result = await request.query(query);
    return result.recordset;
  }

  static async getTurnaroundTimeReport(filters = {}) {
    const pool = await poolPromise;
    const request = pool.request();
    
    let query = `
      SELECT 
        o.id as order_id,
        o.patient_name,
        o.priority,
        s.collection_time,
        s.report_out_time,
        DATEDIFF(MINUTE, s.collection_time, s.report_out_time) as tat_minutes
      FROM lab_orders o
      JOIN order_schedules s ON o.id = s.order_id
      WHERE o.is_deleted = 0 AND s.report_out_time IS NOT NULL
    `;

    if (filters.startDate) {
      query += ' AND o.created_at >= @startDate';
      request.input('startDate', sql.DateTime2, filters.startDate);
    }
    if (filters.endDate) {
      query += ' AND o.created_at <= @endDate';
      request.input('endDate', sql.DateTime2, filters.endDate);
    }
    if (filters.priority) {
      query += ' AND o.priority = @priority';
      request.input('priority', sql.VarChar, filters.priority);
    }

    query += ' ORDER BY o.created_at DESC';
    
    const result = await request.query(query);
    return result.recordset;
  }

  static async getPendingResultsQueue(filters = {}) {
    const pool = await poolPromise;
    const request = pool.request();
    
    let query = `
      SELECT 
        o.id as order_id,
        o.patient_name,
        o.status,
        o.priority,
        o.created_at,
        DATEDIFF(HOUR, o.created_at, GETDATE()) as hours_elapsed
      FROM lab_orders o
      WHERE o.is_deleted = 0 AND o.status NOT IN ('delivered', 'completed')
    `;

    if (filters.priority) {
      query += ' AND o.priority = @priority';
      request.input('priority', sql.VarChar, filters.priority);
    }
    if (filters.status) {
      query += ' AND o.status = @status';
      request.input('status', sql.VarChar, filters.status);
    }

    query += ' ORDER BY o.priority DESC, o.created_at ASC';
    
    const result = await request.query(query);
    return result.recordset;
  }

  static async getStaffActivityAudit(filters = {}) {
    const pool = await poolPromise;
    const request = pool.request();
    
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
      query += ' AND l.created_at >= @startDate';
      request.input('startDate', sql.DateTime2, filters.startDate);
    }
    if (filters.endDate) {
      query += ' AND l.created_at <= @endDate';
      request.input('endDate', sql.DateTime2, filters.endDate);
    }
    if (filters.staffId) {
      query += ' AND s.id = @staffId';
      request.input('staffId', sql.UniqueIdentifier, filters.staffId);
    }

    query += ' GROUP BY s.name, s.role ORDER BY actions_performed DESC';
    
    const result = await request.query(query);
    return result.recordset;
  }

  static async getDiscountImpactAnalysis(filters = {}) {
    const pool = await poolPromise;
    const request = pool.request();
    
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
      WHERE o.is_deleted = 0
    `;

    if (filters.startDate) {
      query += ' AND o.created_at >= @startDate';
      request.input('startDate', sql.DateTime2, filters.startDate);
    }
    if (filters.endDate) {
      query += ' AND o.created_at <= @endDate';
      request.input('endDate', sql.DateTime2, filters.endDate);
    }

    const result = await request.query(query);
    return result.recordset[0];
  }

  static async getRatingsSummary(filters = {}) {
    const pool = await poolPromise;
    const request = pool.request();
    
    let kpiQuery = `
      SELECT 
        AVG(CAST(rating AS FLOAT)) as average_rating,
        COUNT(*) as total_reviews,
        (SELECT COUNT(*) FROM order_ratings WHERE rating >= 4) as positive_reviews,
        (SELECT COUNT(*) FROM order_ratings WHERE rating <= 2) as negative_reviews
      FROM order_ratings
      WHERE 1=1
    `;

    if (filters.startDate) {
      kpiQuery += ' AND created_at >= @startDate';
      request.input('startDate', sql.DateTime2, filters.startDate);
    }
    if (filters.endDate) {
      kpiQuery += ' AND created_at <= @endDate';
      request.input('endDate', sql.DateTime2, filters.endDate);
    }

    const kpiResult = await request.query(kpiQuery);
    
    let latestReviewsQuery = `
      SELECT TOP 5
        r.rating,
        r.remark,
        u.name as user_name,
        r.created_at
      FROM order_ratings r
      JOIN users u ON r.user_id = u.id
      WHERE 1=1
    `;

    if (filters.startDate) {
      latestReviewsQuery += ' AND r.created_at >= @startDate';
    }
    if (filters.endDate) {
      latestReviewsQuery += ' AND r.created_at <= @endDate';
    }
    if (filters.minRating) {
      latestReviewsQuery += ' AND r.rating >= @minRating';
      request.input('minRating', sql.Int, filters.minRating);
    }

    latestReviewsQuery += ' ORDER BY r.created_at DESC';
    
    const reviewsResult = await request.query(latestReviewsQuery);
    
    return {
      stats: kpiResult.recordset[0],
      latestReviews: reviewsResult.recordset
    };
  }

  static async getCollectionReport(filters = {}) {
    const pool = await poolPromise;
    const request = pool.request();
    
    let query = `
      SELECT 
        s.id as staff_id,
        s.name as staff_name,
        COUNT(l.id) as collections_count,
        AVG(CAST(DATEDIFF(MINUTE, o.created_at, l.created_at) AS FLOAT)) as avg_assignment_to_collection_minutes
      FROM order_status_logs l
      JOIN lab_staff s ON l.changed_by = s.id
      JOIN lab_orders o ON l.order_id = o.id
      WHERE l.new_status = 'collecting' AND s.role = 'collector'
    `;

    if (filters.startDate) {
      query += ' AND l.created_at >= @startDate';
      request.input('startDate', sql.DateTime2, filters.startDate);
    }
    if (filters.endDate) {
      query += ' AND l.created_at <= @endDate';
      request.input('endDate', sql.DateTime2, filters.endDate);
    }

    query += ' GROUP BY s.id, s.name ORDER BY collections_count DESC';
    
    const result = await request.query(query);
    return result.recordset;
  }

  static async getUserReport(userId, filters = {}) {
    const pool = await poolPromise;
    const request = pool.request();
    request.input('user_id', sql.UniqueIdentifier, userId);
    
    let dateFilter = '';
    if (filters.startDate) {
      dateFilter += ' AND created_at >= @startDate';
      request.input('startDate', sql.DateTime2, filters.startDate);
    }
    if (filters.endDate) {
      dateFilter += ' AND created_at <= @endDate';
      request.input('endDate', sql.DateTime2, filters.endDate);
    }

    // 1. Query user-specific KPIs
    const kpiQuery = `
      SELECT 
        (SELECT ISNULL(SUM(final_price_mmk), 0) FROM lab_orders WHERE user_id = @user_id AND is_deleted = 0 AND status = 'delivered' ${dateFilter}) as total_spent,
        (SELECT COUNT(*) FROM lab_orders WHERE user_id = @user_id AND is_deleted = 0 ${dateFilter}) as total_orders,
        (SELECT COUNT(*) FROM lab_orders WHERE user_id = @user_id AND is_deleted = 0 AND status IN ('completed', 'delivered') ${dateFilter}) as completed_orders,
        (SELECT COUNT(*) FROM lab_orders WHERE user_id = @user_id AND is_deleted = 0 AND status NOT IN ('completed', 'delivered') ${dateFilter}) as pending_orders,
        (SELECT ISNULL(total_points, 0) FROM users WHERE id = @user_id) as loyalty_points
    `;
    const kpiResult = await request.query(kpiQuery);

    // 2. Query spend & order trends
    const trendQuery = `
      SELECT 
        CAST(created_at AS DATE) as date,
        SUM(final_price_mmk) as spent,
        COUNT(*) as order_count
      FROM lab_orders
      WHERE user_id = @user_id AND is_deleted = 0 ${dateFilter}
      GROUP BY CAST(created_at AS DATE)
      ORDER BY date ASC
    `;
    const trendResult = await request.query(trendQuery);

    // 3. Query top ordered tests
    let testFilter = '';
    if (filters.startDate) {
      testFilter += ' AND o.created_at >= @startDate';
    }
    if (filters.endDate) {
      testFilter += ' AND o.created_at <= @endDate';
    }
    const topTestsQuery = `
      SELECT TOP 5
        tc.test_name,
        tc.test_code,
        tc.category,
        COUNT(oi.id) as order_count,
        SUM(oi.subtotal_mmk) as total_spent
      FROM lab_order_items oi
      JOIN lab_test_catalog tc ON oi.test_id = tc.id
      JOIN lab_orders o ON oi.order_id = o.id
      WHERE o.user_id = @user_id AND o.is_deleted = 0 ${testFilter}
      GROUP BY tc.test_name, tc.test_code, tc.category
      ORDER BY order_count DESC
    `;
    const topTestsResult = await request.query(topTestsQuery);

    return {
      kpis: kpiResult.recordset[0],
      spendTrend: trendResult.recordset,
      topTests: topTestsResult.recordset
    };
  }
}

module.exports = Report;
