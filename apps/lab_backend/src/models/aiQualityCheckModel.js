const { sql, poolPromise } = require('../config/db');

class AiQualityCheck {
  static async create(data, createdBy = null) {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('result_id', sql.UniqueIdentifier, data.result_id)
      .input('verdict', sql.VarChar(20), data.verdict)
      .input('analysis_detail', sql.NVarChar(sql.MAX), data.analysis_detail)
      .input('raw_ai_response', sql.NVarChar(sql.MAX), data.raw_ai_response)
      .input('created_user', sql.UniqueIdentifier, createdBy)
      .query(`
        INSERT INTO ai_quality_checks (id, result_id, verdict, analysis_detail, raw_ai_response, created_user)
        OUTPUT INSERTED.*
        VALUES (NEWID(), @result_id, @verdict, @analysis_detail, @raw_ai_response, @created_user)
      `);
    return result.recordset[0];
  }

  static async getByResultId(resultId) {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('result_id', sql.UniqueIdentifier, resultId)
      .query('SELECT * FROM ai_quality_checks WHERE result_id = @result_id');
    return result.recordset[0];
  }
}

module.exports = AiQualityCheck;
