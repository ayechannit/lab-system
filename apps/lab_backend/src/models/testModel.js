const { sql, poolPromise } = require('../config/db');

class LabTest {
  static async getAll(filters = {}) {
    const pool = await poolPromise;
    const request = pool.request();
    let query = 'SELECT *, created_user, updated_user FROM lab_test_catalog WHERE is_deleted = 0';

    if (filters.category) {
      query += ' AND category = @category';
      request.input('category', sql.VarChar, filters.category);
    }
    if (filters.is_active !== undefined) {
      query += ' AND is_active = @is_active';
      request.input('is_active', sql.Bit, filters.is_active === 'true' || filters.is_active === true ? 1 : 0);
    }
    if (filters.is_package !== undefined) {
      query += ' AND is_package = @is_package';
      request.input('is_package', sql.Bit, filters.is_package === 'true' || filters.is_package === true ? 1 : 0);
    }
    if (filters.test_name) {
      query += ' AND test_name LIKE @test_name';
      request.input('test_name', sql.VarChar, `%${filters.test_name}%`);
    }
    if (filters.test_code) {
      query += ' AND test_code LIKE @test_code';
      request.input('test_code', sql.VarChar, `%${filters.test_code}%`);
    }

    query += ' ORDER BY created_at DESC';

    if (filters.page && filters.limit) {
      const page = parseInt(filters.page, 10);
      const limit = parseInt(filters.limit, 10);
      const offset = (page - 1) * limit;
      query += ' OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY';
      request.input('offset', sql.Int, offset);
      request.input('limit', sql.Int, limit);
    }

    const result = await request.query(query);
    return result.recordset.map(row => {
      if (row.package_items) {
        try {
          row.package_items = JSON.parse(row.package_items);
        } catch (e) {
          row.package_items = [];
        }
      } else {
        row.package_items = [];
      }
      return row;
    });
  }

  static async getById(id) {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query('SELECT *, created_user, updated_user FROM lab_test_catalog WHERE id = @id AND is_deleted = 0');
    
    if (result.recordset[0]) {
      const row = result.recordset[0];
      if (row.package_items) {
        try {
          row.package_items = JSON.parse(row.package_items);
        } catch (e) {
          row.package_items = [];
        }
      } else {
        row.package_items = [];
      }
      return row;
    }
    return null;
  }

  static async create(data, createdBy = null) {
    const pool = await poolPromise;
    const isPackage = data.is_package ? 1 : 0;
    const packageItems = (isPackage && data.package_items && Array.isArray(data.package_items)) ? JSON.stringify(data.package_items) : null;

    const result = await pool.request()
      .input('test_name', sql.VarChar, data.test_name)
      .input('test_code', sql.VarChar, data.test_code)
      .input('description', sql.Text, data.description)
      .input('base_price_mmk', sql.Decimal(18, 2), data.base_price_mmk)
      .input('category', sql.VarChar, data.category)
      .input('is_package', sql.Bit, isPackage)
      .input('package_items', sql.NVarChar(sql.MAX), packageItems)
      .input('created_user', sql.UniqueIdentifier, createdBy)
      .query(`
        INSERT INTO lab_test_catalog (id, test_name, test_code, description, base_price_mmk, category, is_package, package_items, is_active, is_deleted, created_user, updated_user)
        OUTPUT INSERTED.*
        VALUES (NEWID(), @test_name, @test_code, @description, @base_price_mmk, @category, @is_package, @package_items, 1, 0, @created_user, @created_user)
      `);
      
    if (result.recordset[0]) {
      const row = result.recordset[0];
      if (row.package_items) {
        try {
          row.package_items = JSON.parse(row.package_items);
        } catch (e) {
          row.package_items = [];
        }
      } else {
        row.package_items = [];
      }
      return row;
    }
    return null;
  }

  static async update(id, data, updatedBy = null) {
    const pool = await poolPromise;
    const isPackage = data.is_package ? 1 : 0;
    const packageItems = (isPackage && data.package_items && Array.isArray(data.package_items)) ? JSON.stringify(data.package_items) : null;

    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .input('test_name', sql.VarChar, data.test_name)
      .input('test_code', sql.VarChar, data.test_code)
      .input('description', sql.Text, data.description)
      .input('base_price_mmk', sql.Decimal(18, 2), data.base_price_mmk)
      .input('category', sql.VarChar, data.category)
      .input('is_package', sql.Bit, isPackage)
      .input('package_items', sql.NVarChar(sql.MAX), packageItems)
      .input('is_active', sql.Bit, data.is_active)
      .input('updated_user', sql.UniqueIdentifier, updatedBy)
      .query(`
        UPDATE lab_test_catalog
        SET test_name = @test_name, test_code = @test_code, description = @description, 
            base_price_mmk = @base_price_mmk, category = @category, is_package = @is_package,
            package_items = @package_items, is_active = @is_active,
            updated_user = @updated_user, updated_at = GETDATE()
        OUTPUT INSERTED.*
        WHERE id = @id AND is_deleted = 0
      `);

    if (result.recordset[0]) {
      const row = result.recordset[0];
      if (row.package_items) {
        try {
          row.package_items = JSON.parse(row.package_items);
        } catch (e) {
          row.package_items = [];
        }
      } else {
        row.package_items = [];
      }
      return row;
    }
    return null;
  }

  static async delete(id, updatedBy = null) {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .input('updated_user', sql.UniqueIdentifier, updatedBy)
      .query('UPDATE lab_test_catalog SET is_deleted = 1, updated_user = @updated_user, updated_at = GETDATE() WHERE id = @id');
    return result.rowsAffected[0] > 0;
  }

  /**
   * Fetches all tests and includes an array of all active discounts for each test.
   */
  static async getAllWithAllDiscounts(filters = {}) {
    const pool = await poolPromise;
    const request = pool.request();

    let query = `
      SELECT t.*,
             (
                SELECT sd.id, sd.role, sd.discount_percent
                FROM test_specific_discounts sd
                WHERE sd.test_id = t.id AND sd.is_active = 1 AND sd.is_deleted = 0
                FOR JSON PATH
             ) as discounts_json
      FROM lab_test_catalog t
      WHERE t.is_deleted = 0
    `;

    if (filters.category) {
      query += ' AND t.category = @category';
      request.input('category', sql.VarChar, filters.category);
    }
    if (filters.is_active !== undefined) {
      query += ' AND t.is_active = @is_active';
      request.input('is_active', sql.Bit, filters.is_active === 'true' || filters.is_active === true ? 1 : 0);
    }
    if (filters.is_package !== undefined) {
      query += ' AND t.is_package = @is_package';
      request.input('is_package', sql.Bit, filters.is_package === 'true' || filters.is_package === true ? 1 : 0);
    }
    if (filters.test_name) {
      query += ' AND t.test_name LIKE @test_name';
      request.input('test_name', sql.VarChar, `%${filters.test_name}%`);
    }
    if (filters.test_code) {
      query += ' AND t.test_code LIKE @test_code';
      request.input('test_code', sql.VarChar, `%${filters.test_code}%`);
    }

    query += ' ORDER BY t.created_at DESC';

    if (filters.page && filters.limit) {
      const page = parseInt(filters.page, 10);
      const limit = parseInt(filters.limit, 10);
      const offset = (page - 1) * limit;
      query += ' OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY';
      request.input('offset', sql.Int, offset);
      request.input('limit', sql.Int, limit);
    }

    const result = await request.query(query);
    
    // Parse the JSON string from SQL Server into an actual array
    return result.recordset.map(row => {
      if (row.discounts_json) {
        row.discounts = JSON.parse(row.discounts_json);
      } else {
        row.discounts = [];
      }
      delete row.discounts_json;
      
      if (row.package_items) {
        try {
          row.package_items = JSON.parse(row.package_items);
        } catch (e) {
          row.package_items = [];
        }
      } else {
        row.package_items = [];
      }

      return row;
    });
  }
}

module.exports = LabTest;
