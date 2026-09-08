const { poolPromise } = require('../config/db');

class LabResult {
  static async create(data, createdBy = null) {
    const pool = await poolPromise;
    const result = await pool.query(
      `INSERT INTO lab_results (id, order_id, result_summary, pdf_url, uploaded_by, quality_checked, created_user, updated_user)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $6)
       RETURNING *`,
      [
        data.order_id,
        data.result_summary,
        data.pdf_url,
        data.uploaded_by || createdBy,
        !!data.quality_checked,
        createdBy,
      ]
    );
    return result.rows[0];
  }

  static async getByOrderId(orderId) {
    const pool = await poolPromise;
    const result = await pool.query(
      `SELECT r.*,
              s.name as uploaded_by_name,
              (SELECT json_agg(aqc) FROM ai_quality_checks aqc WHERE aqc.result_id = r.id) as ai_checks
       FROM lab_results r
       LEFT JOIN lab_staff s ON r.uploaded_by = s.id
       WHERE r.order_id = $1`,
      [orderId]
    );

    if (result.rows[0]) {
      const row = result.rows[0];
      row.ai_checks = row.ai_checks ? row.ai_checks[0] : null;
      return row;
    }
    return null;
  }

  static async updateQualityCheck(id, qualityChecked, updatedBy = null) {
    const pool = await poolPromise;
    const result = await pool.query(
      `UPDATE lab_results
       SET quality_checked = $2, updated_user = $3, updated_at = now()
       WHERE id = $1`,
      [id, qualityChecked, updatedBy]
    );
    return result.rowCount > 0;
  }
}

module.exports = LabResult;
