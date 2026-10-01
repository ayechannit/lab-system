const { poolPromise } = require('../config/db');
const bcrypt = require('bcryptjs');

/** Empty / whitespace-only values are stored as NULL so the partial unique indexes ignore them. */
function normalizeEmail(email) {
  const v = email == null ? '' : String(email).trim().toLowerCase();
  return v === '' ? null : v;
}

function normalizeStaffCode(code) {
  const v = code == null ? '' : String(code).trim();
  return v === '' ? null : v;
}

class Staff {
  static async getAll(filters = {}) {
    const pool = await poolPromise;
    const params = [];
    let query = 'SELECT id, name, email, staff_code, role, is_active, profile_image_url, created_user, updated_user, created_at, updated_at FROM lab_staff WHERE is_deleted = false';

    if (filters.role) {
      params.push(filters.role);
      query += ` AND role = $${params.length}`;
    }
    if (filters.name) {
      params.push(`%${filters.name}%`);
      query += ` AND (name ILIKE $${params.length} OR staff_code ILIKE $${params.length})`;
    }
    if (filters.is_active !== undefined) {
      params.push(filters.is_active === 'true' || filters.is_active === true);
      query += ` AND is_active = $${params.length}`;
    }

    const validSortFields = ['created_at', 'updated_at', 'name', 'email', 'staff_code', 'role'];
    const sortBy = validSortFields.includes(filters.sortBy) ? filters.sortBy : 'created_at';
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
    return result.rows;
  }

  static async getById(id) {
    const pool = await poolPromise;
    const result = await pool.query(
      'SELECT id, name, email, staff_code, role, is_active, profile_image_url, created_user, updated_user, created_at, updated_at FROM lab_staff WHERE id = $1 AND is_deleted = false',
      [id]
    );
    return result.rows[0];
  }

  static async getByEmail(email) {
    const em = normalizeEmail(email);
    if (!em) return undefined;
    const pool = await poolPromise;
    const result = await pool.query(
      'SELECT * FROM lab_staff WHERE lower(email) = $1 AND is_deleted = false',
      [em]
    );
    return result.rows[0];
  }

  static async getByStaffCode(staffCode) {
    const code = normalizeStaffCode(staffCode);
    if (!code) return undefined;
    const pool = await poolPromise;
    const result = await pool.query(
      'SELECT * FROM lab_staff WHERE lower(staff_code) = lower($1) AND is_deleted = false',
      [code]
    );
    return result.rows[0];
  }

  /** Login lookup: emails always contain "@", staff codes never do. */
  static async getByLoginId(identifier) {
    const id = identifier == null ? '' : String(identifier).trim();
    if (!id) return undefined;
    return id.includes('@') ? Staff.getByEmail(id) : Staff.getByStaffCode(id);
  }

  static async getPasswordHash(id) {
    const pool = await poolPromise;
    const result = await pool.query(
      'SELECT password_hash FROM lab_staff WHERE id = $1 AND is_deleted = false',
      [id]
    );
    return result.rows[0]?.password_hash || null;
  }

  static async create(data, createdBy = null) {
    const pool = await poolPromise;
    const hashedPassword = await bcrypt.hash(data.password_hash || data.password, 10);
    const result = await pool.query(
      `INSERT INTO lab_staff (id, name, email, staff_code, password_hash, role, is_active, created_user, updated_user, is_deleted)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, true, $6, $6, false)
       RETURNING id, name, email, staff_code, role, is_active, profile_image_url, created_user, updated_user, created_at, updated_at`,
      [data.name, normalizeEmail(data.email), normalizeStaffCode(data.staff_code), hashedPassword, data.role, createdBy]
    );
    return result.rows[0];
  }

  static async update(id, data, updatedBy = null) {
    const pool = await poolPromise;

    const params = [id, data.name, data.is_active, updatedBy];
    let emailFragment = '';
    let staffCodeFragment = '';
    let passwordFragment = '';
    let profileImageFragment = '';

    const newPassword = data.password || data.password_hash;
    if (newPassword) {
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      params.push(hashedPassword);
      passwordFragment = `, password_hash = $${params.length}`;
    }

    // `undefined` keeps the current value; empty string clears it (staff may have only a staff code).
    if (data.email !== undefined) {
      params.push(normalizeEmail(data.email));
      emailFragment = `, email = $${params.length}`;
    }

    if (data.staff_code !== undefined) {
      params.push(normalizeStaffCode(data.staff_code));
      staffCodeFragment = `, staff_code = $${params.length}`;
    }

    if (data.profile_image_url !== undefined) {
      params.push(data.profile_image_url);
      profileImageFragment = `, profile_image_url = $${params.length}`;
    }

    const result = await pool.query(
      `UPDATE lab_staff
       SET name = $2, is_active = $3, updated_user = $4, updated_at = now()
           ${emailFragment}
           ${staffCodeFragment}
           ${passwordFragment}
           ${profileImageFragment}
       WHERE id = $1 AND is_deleted = false
       RETURNING id, name, email, staff_code, role, is_active, profile_image_url, created_user, updated_user, created_at, updated_at`,
      params
    );
    return result.rows[0];
  }

  static async updateProfileImage(id, profileImageUrl, updatedBy = null) {
    const pool = await poolPromise;
    const result = await pool.query(
      `UPDATE lab_staff
       SET profile_image_url = $2, updated_user = $3, updated_at = now()
       WHERE id = $1 AND is_deleted = false
       RETURNING id, name, email, staff_code, role, is_active, profile_image_url, created_user, updated_user, created_at, updated_at`,
      [id, profileImageUrl, updatedBy]
    );
    return result.rows[0];
  }

  static async delete(id, updatedBy = null) {
    const pool = await poolPromise;
    const result = await pool.query(
      'UPDATE lab_staff SET is_deleted = true, updated_user = $2, updated_at = now() WHERE id = $1',
      [id, updatedBy]
    );
    return result.rowCount > 0;
  }

  static async updateFcmToken(id, fcmToken, updatedBy = null) {
    const pool = await poolPromise;
    const result = await pool.query(
      `UPDATE lab_staff
       SET fcm_token = $2, updated_user = $3, updated_at = now()
       WHERE id = $1 AND is_deleted = false`,
      [id, fcmToken, updatedBy]
    );
    return result.rowCount > 0;
  }

  static async updatePasswordByEmail(email, newPassword) {
    const pool = await poolPromise;
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const result = await pool.query(
      'UPDATE lab_staff SET password_hash = $2, updated_at = now() WHERE lower(email) = $1 AND is_deleted = false',
      [normalizeEmail(email), hashedPassword]
    );
    return result.rowCount > 0;
  }
}

Staff.normalizeEmail = normalizeEmail;
Staff.normalizeStaffCode = normalizeStaffCode;

module.exports = Staff;
