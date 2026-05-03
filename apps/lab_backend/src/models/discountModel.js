const { sql, poolPromise } = require('../config/db');

class Discount {
  /**
   * Upsert a discount for a specific test and role.
   * If role is 'all', it applies to clinic, doctor, and patient.
   */
  static async upsert(data) {
    const pool = await poolPromise;
    const roles = data.role === 'all' ? ['clinic', 'doctor', 'patient'] : [data.role];
    const results = [];

    for (const role of roles) {
      const result = await pool.request()
        .input('test_id', sql.UniqueIdentifier, data.test_id)
        .input('role', sql.VarChar, role)
        .input('discount_percent', sql.Decimal(5, 2), data.discount_percent)
        .input('is_active', sql.Bit, data.is_active !== undefined ? data.is_active : 1)
        .query(`
          IF EXISTS (SELECT 1 FROM test_specific_discounts WHERE test_id = @test_id AND role = @role)
          BEGIN
              UPDATE test_specific_discounts 
              SET discount_percent = @discount_percent, is_active = @is_active, is_deleted = 0, updated_at = GETDATE()
              OUTPUT INSERTED.*
              WHERE test_id = @test_id AND role = @role
          END
          ELSE
          BEGIN
              INSERT INTO test_specific_discounts (id, test_id, role, discount_percent, is_active, is_deleted)
              OUTPUT INSERTED.*
              VALUES (NEWID(), @test_id, @role, @discount_percent, @is_active, 0)
          END
        `);
      results.push(result.recordset[0]);
    }
    return results;
  }

  static async getByTestId(test_id) {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('test_id', sql.UniqueIdentifier, test_id)
      .query('SELECT * FROM test_specific_discounts WHERE test_id = @test_id AND is_deleted = 0');
    return result.recordset;
  }

  static async getAll() {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT sd.*, t.test_name, t.test_code 
      FROM test_specific_discounts sd
      JOIN lab_test_catalog t ON sd.test_id = t.id
      WHERE sd.is_deleted = 0 AND t.is_deleted = 0
    `);
    return result.recordset;
  }

  static async delete(id) {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query('UPDATE test_specific_discounts SET is_deleted = 1, updated_at = GETDATE() WHERE id = @id');
    return result.rowsAffected[0] > 0;
  }
}

module.exports = Discount;
