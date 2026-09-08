const { poolPromise } = require('../config/db');

function parsePackageItems(row) {
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

class LabTest {
  static async getById(id) {
    const pool = await poolPromise;
    const result = await pool.query(
      'SELECT *, created_user, updated_user FROM lab_test_catalog WHERE id = $1 AND is_deleted = false',
      [id]
    );

    return result.rows[0] ? parsePackageItems(result.rows[0]) : null;
  }

  static async create(data, createdBy = null) {
    const pool = await poolPromise;
    const isPackage = !!data.is_package;
    const packageItems = (isPackage && data.package_items && Array.isArray(data.package_items)) ? JSON.stringify(data.package_items) : null;

    const result = await pool.query(
      `INSERT INTO lab_test_catalog (id, test_name, test_code, description, base_price_mmk, category, is_package, package_items, is_active, is_deleted, created_user, updated_user)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, true, false, $8, $8)
       RETURNING *`,
      [
        data.test_name,
        data.test_code,
        data.description,
        data.base_price_mmk,
        data.category,
        isPackage,
        packageItems,
        createdBy,
      ]
    );

    return result.rows[0] ? parsePackageItems(result.rows[0]) : null;
  }

  static async update(id, data, updatedBy = null) {
    const pool = await poolPromise;
    const isPackage = !!data.is_package;
    const packageItems = (isPackage && data.package_items && Array.isArray(data.package_items)) ? JSON.stringify(data.package_items) : null;

    const result = await pool.query(
      `UPDATE lab_test_catalog
       SET test_name = $2, test_code = $3, description = $4,
           base_price_mmk = $5, category = $6, is_package = $7,
           package_items = $8, is_active = $9,
           updated_user = $10, updated_at = now()
       WHERE id = $1 AND is_deleted = false
       RETURNING *`,
      [
        id,
        data.test_name,
        data.test_code,
        data.description,
        data.base_price_mmk,
        data.category,
        isPackage,
        packageItems,
        data.is_active,
        updatedBy,
      ]
    );

    return result.rows[0] ? parsePackageItems(result.rows[0]) : null;
  }

  static async delete(id, updatedBy = null) {
    const pool = await poolPromise;
    const result = await pool.query(
      'UPDATE lab_test_catalog SET is_deleted = true, updated_user = $2, updated_at = now() WHERE id = $1',
      [id, updatedBy]
    );
    return result.rowCount > 0;
  }

  static async getAll(filters = {}) {
    const pool = await poolPromise;
    const params = [];

    let query = `
      SELECT t.*,
        (SELECT sd.discount_percent FROM test_specific_discounts sd
         WHERE sd.test_id = t.id AND sd.is_active = true AND sd.is_deleted = false
           AND (sd.start_date IS NULL OR sd.start_date <= now())
           AND (sd.end_date IS NULL OR sd.end_date >= now())
         ORDER BY sd.updated_at DESC LIMIT 1) AS discount_percent
      FROM lab_test_catalog t
      WHERE t.is_deleted = false
    `;

    if (filters.category) {
      params.push(filters.category);
      query += ` AND t.category = $${params.length}`;
    }
    if (filters.is_active !== undefined) {
      params.push(filters.is_active === 'true' || filters.is_active === true);
      query += ` AND t.is_active = $${params.length}`;
    }
    if (filters.is_package !== undefined) {
      params.push(filters.is_package === 'true' || filters.is_package === true);
      query += ` AND t.is_package = $${params.length}`;
    }
    if (filters.test_name) {
      params.push(`%${filters.test_name}%`);
      query += ` AND t.test_name ILIKE $${params.length}`;
    }
    if (filters.test_code) {
      params.push(`%${filters.test_code}%`);
      query += ` AND t.test_code ILIKE $${params.length}`;
    }

    const validSortFields = ['created_at', 'updated_at', 'test_name', 'test_code', 'base_price_mmk', 'category'];
    const sortBy = validSortFields.includes(filters.sortBy) ? `t.${filters.sortBy}` : 't.created_at';
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
      parsePackageItems(row);

      row.discounted_price_mmk = row.discount_percent != null
        ? Math.round(row.base_price_mmk * (1 - row.discount_percent / 100) * 100) / 100
        : null;

      return row;
    });
  }
}

module.exports = LabTest;
