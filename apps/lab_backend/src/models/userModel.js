const { poolPromise } = require('../config/db');
const bcrypt = require('bcryptjs');

/** Tier columns resolved from lifetime spend, independent of redeemable loyalty points. */
const USER_TIER_SELECT = `
  (SELECT mt.discount_percent FROM membership_tiers mt
   WHERE mt.is_active = true AND mt.is_deleted = false
     AND mt.min_spend_mmk <= COALESCE(u.total_spent_mmk, 0)
   ORDER BY mt.min_spend_mmk DESC LIMIT 1) AS tier_discount_percent,
  (SELECT mt.name FROM membership_tiers mt
   WHERE mt.is_active = true AND mt.is_deleted = false
     AND mt.min_spend_mmk <= COALESCE(u.total_spent_mmk, 0)
   ORDER BY mt.min_spend_mmk DESC LIMIT 1) AS tier_name`;

class User {
  static async getAll(filters = {}) {
    const pool = await poolPromise;
    const params = [];
    let query = `SELECT u.id, u.name, u.phone, u.address, u.latitude, u.longitude, u.total_points, u.total_spent_mmk, u.profile_image_url, u.created_user, u.updated_user, u.created_at, u.updated_at,
      ${USER_TIER_SELECT}
      FROM users u WHERE u.is_deleted = false`;

    if (filters.name) {
      params.push(`%${filters.name}%`);
      query += ` AND u.name ILIKE $${params.length}`;
    }
    if (filters.phone) {
      params.push(`%${filters.phone}%`);
      query += ` AND u.phone ILIKE $${params.length}`;
    }
    if (filters.search) {
      params.push(`%${filters.search}%`);
      query += ` AND (u.name ILIKE $${params.length} OR u.phone ILIKE $${params.length} OR u.id::text ILIKE $${params.length})`;
    }

    const validSortFields = ['created_at', 'updated_at', 'name', 'total_points'];
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
      `SELECT u.id, u.name, u.phone, u.address, u.latitude, u.longitude, u.total_points, u.total_spent_mmk, u.profile_image_url, u.created_user, u.updated_user, u.created_at, u.updated_at,
        ${USER_TIER_SELECT}
        FROM users u WHERE u.id = $1 AND u.is_deleted = false`,
      [id]
    );
    return result.rows[0];
  }

  static async getByPhone(phone) {
    const pool = await poolPromise;
    const result = await pool.query(
      `SELECT u.*,
        ${USER_TIER_SELECT}
        FROM users u WHERE u.phone = $1 AND u.is_deleted = false`,
      [phone]
    );
    return result.rows[0];
  }

  static async create(data, createdBy = null) {
    const pool = await poolPromise;
    const hashedPassword = await bcrypt.hash(data.password_hash || data.password, 10);

    const result = await pool.query(
      `INSERT INTO users (id, name, phone, password_hash, address, latitude, longitude, total_points, total_spent_mmk, created_user, updated_user, is_deleted)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, 0, 0, $7, $7, false)
       RETURNING id`,
      [data.name, data.phone, hashedPassword, data.address, data.latitude, data.longitude, createdBy]
    );
    return this.getById(result.rows[0].id);
  }

  static async update(id, data, updatedBy = null) {
    const pool = await poolPromise;

    const params = [id, data.name, data.phone, data.address, data.latitude, data.longitude, updatedBy];
    let passwordFragment = '';

    const newPassword = data.password || data.password_hash;
    if (newPassword) {
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      params.push(hashedPassword);
      passwordFragment = `, password_hash = $${params.length}`;
    }

    const result = await pool.query(
      `UPDATE users
       SET name = $2, phone = $3,
           address = $4, latitude = $5, longitude = $6,
           updated_user = $7, updated_at = now()
           ${passwordFragment}
       WHERE id = $1 AND is_deleted = false`,
      params
    );
    if (!result.rowCount) return undefined;
    return this.getById(id);
  }

  static async updateProfileImage(id, profileImageUrl, updatedBy = null) {
    const pool = await poolPromise;
    const result = await pool.query(
      `UPDATE users
       SET profile_image_url = $2, updated_user = $3, updated_at = now()
       WHERE id = $1 AND is_deleted = false`,
      [id, profileImageUrl, updatedBy]
    );
    if (!result.rowCount) return undefined;
    return this.getById(id);
  }

  static async addPoints(id, pointsToAdd, updatedBy = null, transactionType = 'earn', description = null, referenceId = null) {
    const pool = await poolPromise;
    const result = await pool.query(
      `UPDATE users
       SET total_points = total_points + $2, updated_user = $3, updated_at = now()
       WHERE id = $1 AND is_deleted = false`,
      [id, pointsToAdd, updatedBy]
    );

    if (!result.rowCount) return undefined;

    const PointTransaction = require('./pointTransactionModel');
    await PointTransaction.create({
      user_id: id,
      points: pointsToAdd,
      transaction_type: transactionType,
      description: description || `Points adjustment: ${pointsToAdd >= 0 ? '+' : ''}${pointsToAdd}`,
      reference_id: referenceId,
      created_user: updatedBy
    });

    return this.getById(id);
  }

  static async addSpend(id, amountMmk, updatedBy = null) {
    const pool = await poolPromise;
    const result = await pool.query(
      `UPDATE users
       SET total_spent_mmk = COALESCE(total_spent_mmk, 0) + $2,
           updated_user = $3, updated_at = now()
       WHERE id = $1 AND is_deleted = false`,
      [id, amountMmk, updatedBy]
    );
    if (!result.rowCount) return undefined;
    return this.getById(id);
  }

  static async delete(id, updatedBy = null) {
    const pool = await poolPromise;
    const result = await pool.query(
      'UPDATE users SET is_deleted = true, updated_user = $2, updated_at = now() WHERE id = $1',
      [id, updatedBy]
    );
    return result.rowCount > 0;
  }

  static async updateFcmToken(id, fcmToken, updatedBy = null) {
    const pool = await poolPromise;
    const result = await pool.query(
      `UPDATE users
       SET fcm_token = $2, updated_user = $3, updated_at = now()
       WHERE id = $1 AND is_deleted = false`,
      [id, fcmToken, updatedBy]
    );
    return result.rowCount > 0;
  }

}

module.exports = User;
