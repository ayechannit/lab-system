const { sql, poolPromise } = require('../config/db');

class LabResult {
  static async create(data, createdBy = null) {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('order_id', sql.UniqueIdentifier, data.order_id)
      .input('result_summary', sql.NVarChar(sql.MAX), data.result_summary)
      .input('pdf_url', sql.NVarChar(2048), data.pdf_url)
      .input('uploaded_by', sql.UniqueIdentifier, data.uploaded_by || createdBy)
      .input('quality_checked', sql.Bit, data.quality_checked || 0)
      .input('created_user', sql.UniqueIdentifier, createdBy)
      .query(`
        INSERT INTO lab_results (id, order_id, result_summary, pdf_url, uploaded_by, quality_checked, created_user, updated_user)
        OUTPUT INSERTED.*
        VALUES (NEWID(), @order_id, @result_summary, @pdf_url, @uploaded_by, @quality_checked, @created_user, @created_user)
      `);
    return result.recordset[0];
  }

  static async getByOrderId(orderId) {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('order_id', sql.UniqueIdentifier, orderId)
      .query(`
        SELECT r.*, 
               s.name as uploaded_by_name,
               (SELECT * FROM ai_quality_checks WHERE result_id = r.id FOR JSON PATH) as ai_checks
        FROM lab_results r
        LEFT JOIN lab_staff s ON r.uploaded_by = s.id
        WHERE r.order_id = @order_id
      `);
    
    if (result.recordset[0]) {
      const row = result.recordset[0];
      row.ai_checks = row.ai_checks ? JSON.parse(row.ai_checks)[0] : null;
      return row;
    }
    return null;
  }

  static async updateQualityCheck(id, qualityChecked, updatedBy = null) {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .input('quality_checked', sql.Bit, qualityChecked)
      .input('updated_user', sql.UniqueIdentifier, updatedBy)
      .query(`
        UPDATE lab_results 
        SET quality_checked = @quality_checked, updated_user = @updated_user, updated_at = GETDATE()
        WHERE id = @id
      `);
    return result.rowsAffected[0] > 0;
  }
}

module.exports = LabResult;
