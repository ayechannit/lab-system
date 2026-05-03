const { sql, poolPromise } = require('../config/db');

class LabTest {
  static async getAll() {
    const pool = await poolPromise;
    const result = await pool.request().query('SELECT * FROM lab_test_catalog WHERE is_deleted = 0');
    return result.recordset;
  }

  static async getById(id) {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query('SELECT * FROM lab_test_catalog WHERE id = @id AND is_deleted = 0');
    return result.recordset[0];
  }

  static async create(data) {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('test_name', sql.VarChar, data.test_name)
      .input('test_code', sql.VarChar, data.test_code)
      .input('description', sql.Text, data.description)
      .input('base_price_mmk', sql.Decimal(18, 2), data.base_price_mmk)
      .input('category', sql.VarChar, data.category)
      .query(`
        INSERT INTO lab_test_catalog (id, test_name, test_code, description, base_price_mmk, category, is_active, is_deleted)
        OUTPUT INSERTED.*
        VALUES (NEWID(), @test_name, @test_code, @description, @base_price_mmk, @category, 1, 0)
      `);
    return result.recordset[0];
  }

  static async update(id, data) {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .input('test_name', sql.VarChar, data.test_name)
      .input('test_code', sql.VarChar, data.test_code)
      .input('description', sql.Text, data.description)
      .input('base_price_mmk', sql.Decimal(18, 2), data.base_price_mmk)
      .input('category', sql.VarChar, data.category)
      .input('is_active', sql.Bit, data.is_active)
      .query(`
        UPDATE lab_test_catalog
        SET test_name = @test_name, test_code = @test_code, description = @description, 
            base_price_mmk = @base_price_mmk, category = @category, is_active = @is_active
        OUTPUT INSERTED.*
        WHERE id = @id AND is_deleted = 0
      `);
    return result.recordset[0];
  }

  static async delete(id) {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query('UPDATE lab_test_catalog SET is_deleted = 1 WHERE id = @id');
    return result.rowsAffected[0] > 0;
  }

  /**
   * Fetches all tests and applies discounts based on the provided role.
   * Logic: Joins with test_specific_discounts for the given role.
   */
  static async getAllWithDiscounts(role) {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('role', sql.VarChar, role)
      .query(`
        SELECT t.*, 
               ISNULL(sd.discount_percent, 0) as discount_percent,
               (t.base_price_mmk * (1 - ISNULL(sd.discount_percent, 0) / 100)) as discounted_price_mmk
        FROM lab_test_catalog t
        LEFT JOIN test_specific_discounts sd ON sd.test_id = t.id AND sd.role = @role AND sd.is_active = 1 AND sd.is_deleted = 0
        WHERE t.is_active = 1 AND t.is_deleted = 0
      `);
    return result.recordset;
  }
}

module.exports = LabTest;
