const { poolPromise } = require('../config/db');

class AiQualityCheck {
  static async create(data, createdBy = null) {
    const pool = await poolPromise;
    const result = await pool.query(
      `INSERT INTO ai_quality_checks (id, result_id, verdict, analysis_detail, raw_ai_response, created_user)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5)
       RETURNING *`,
      [data.result_id, data.verdict, data.analysis_detail, data.raw_ai_response, createdBy]
    );
    return result.rows[0];
  }

  static async getByResultId(resultId) {
    const pool = await poolPromise;
    const result = await pool.query(
      'SELECT * FROM ai_quality_checks WHERE result_id = $1',
      [resultId]
    );
    return result.rows[0];
  }
}

module.exports = AiQualityCheck;
