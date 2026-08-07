const { sql, poolPromise } = require('../config/db');
const bcrypt = require('bcryptjs');

/** Tier columns resolved from loyalty points (DB column still named min_spend_mmk). */
const USER_TIER_SELECT = `
  (SELECT TOP 1 mt.discount_percent FROM membership_tiers mt
   WHERE mt.is_active = 1 AND mt.is_deleted = 0
     AND mt.min_spend_mmk <= ISNULL(u.total_points, 0)
   ORDER BY mt.min_spend_mmk DESC) AS tier_discount_percent,
  (SELECT TOP 1 mt.name FROM membership_tiers mt
   WHERE mt.is_active = 1 AND mt.is_deleted = 0
     AND mt.min_spend_mmk <= ISNULL(u.total_points, 0)
   ORDER BY mt.min_spend_mmk DESC) AS tier_name`;

class User {
  static async getAll(filters = {}) {
    const pool = await poolPromise;
    const request = pool.request();
    let query = `SELECT u.id, u.name, u.phone, u.address, u.latitude, u.longitude, u.total_points, u.total_spent_mmk, u.profile_image_url, u.created_user, u.updated_user, u.created_at, u.updated_at,
      ${USER_TIER_SELECT}
      FROM users u WHERE u.is_deleted = 0`;

    if (filters.name) {
      query += ' AND u.name LIKE @name';
      request.input('name', sql.VarChar, `%${filters.name}%`);
    }
    if (filters.phone) {
      query += ' AND u.phone LIKE @phone';
      request.input('phone', sql.VarChar, `%${filters.phone}%`);
    }

    const validSortFields = ['created_at', 'updated_at', 'name', 'total_points'];
    const sortBy = validSortFields.includes(filters.sortBy) ? filters.sortBy : 'created_at';
    const sortOrder = filters.sortOrder === 'ASC' || filters.sortOrder === 'asc' ? 'ASC' : 'DESC';
    query += ` ORDER BY ${sortBy} ${sortOrder}`;

    if (filters.page && filters.limit) {
      const page = parseInt(filters.page, 10);
      const limit = parseInt(filters.limit, 10);
      const offset = (page - 1) * limit;
      query += ' OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY';
      request.input('offset', sql.Int, offset);
      request.input('limit', sql.Int, limit);
    }

    const result = await request.query(query);
    return result.recordset;
  }

  static async getById(id) {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query(`SELECT u.id, u.name, u.phone, u.address, u.latitude, u.longitude, u.total_points, u.total_spent_mmk, u.profile_image_url, u.created_user, u.updated_user, u.created_at, u.updated_at,
        ${USER_TIER_SELECT}
        FROM users u WHERE u.id = @id AND u.is_deleted = 0`);
    return result.recordset[0];
  }

  static async getByPhone(phone) {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('phone', sql.VarChar, phone)
      .query(`SELECT u.*,
        ${USER_TIER_SELECT}
        FROM users u WHERE u.phone = @phone AND u.is_deleted = 0`);
    return result.recordset[0];
  }

  static async create(data, createdBy = null) {
    const pool = await poolPromise;
    const hashedPassword = await bcrypt.hash(data.password_hash || data.password, 10);

    const result = await pool.request()
      .input('name', sql.VarChar, data.name)
      .input('phone', sql.VarChar, data.phone)
      .input('password_hash', sql.VarChar, hashedPassword)
      .input('address', sql.Text, data.address)
      .input('latitude', sql.Float, data.latitude)
      .input('longitude', sql.Float, data.longitude)
      .input('created_user', sql.UniqueIdentifier, createdBy)
      .query(`
        INSERT INTO users (id, name, phone, password_hash, address, latitude, longitude, total_points, total_spent_mmk, created_user, updated_user, is_deleted)
        OUTPUT INSERTED.id
        VALUES (NEWID(), @name, @phone, @password_hash, @address, @latitude, @longitude, 0, 0, @created_user, @created_user, 0)
      `);
    return this.getById(result.recordset[0].id);
  }

  static async update(id, data, updatedBy = null) {
    const pool = await poolPromise;

    let passwordFragment = '';
    const request = pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .input('name', sql.VarChar, data.name)
      .input('phone', sql.VarChar, data.phone)
      .input('address', sql.Text, data.address)
      .input('latitude', sql.Float, data.latitude)
      .input('longitude', sql.Float, data.longitude)
      .input('updated_user', sql.UniqueIdentifier, updatedBy);

    const newPassword = data.password || data.password_hash;
    if (newPassword) {
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      passwordFragment = ', password_hash = @password_hash';
      request.input('password_hash', sql.VarChar, hashedPassword);
    }

    const result = await request.query(`
      UPDATE users
      SET name = @name, phone = @phone,
          address = @address, latitude = @latitude, longitude = @longitude,
          updated_user = @updated_user, updated_at = GETDATE()
          ${passwordFragment}
      WHERE id = @id AND is_deleted = 0
    `);
    if (!result.rowsAffected[0]) return undefined;
    return this.getById(id);
  }

  static async updateProfileImage(id, profileImageUrl, updatedBy = null) {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .input('profile_image_url', sql.NVarChar(500), profileImageUrl)
      .input('updated_user', sql.UniqueIdentifier, updatedBy)
      .query(`
        UPDATE users
        SET profile_image_url = @profile_image_url, updated_user = @updated_user, updated_at = GETDATE()
        WHERE id = @id AND is_deleted = 0
      `);
    if (!result.rowsAffected[0]) return undefined;
    return this.getById(id);
  }

  static async addPoints(id, pointsToAdd, updatedBy = null, transactionType = 'earn', description = null, referenceId = null) {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .input('points', sql.Int, pointsToAdd)
      .input('updated_user', sql.UniqueIdentifier, updatedBy)
      .query(`
        UPDATE users
        SET total_points = total_points + @points, updated_user = @updated_user, updated_at = GETDATE()
        WHERE id = @id AND is_deleted = 0
      `);

    if (!result.rowsAffected[0]) return undefined;

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
    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .input('amount', sql.Decimal(18, 2), amountMmk)
      .input('updated_user', sql.UniqueIdentifier, updatedBy)
      .query(`
        UPDATE users
        SET total_spent_mmk = ISNULL(total_spent_mmk, 0) + @amount,
            updated_user = @updated_user, updated_at = GETDATE()
        WHERE id = @id AND is_deleted = 0
      `);
    if (!result.rowsAffected[0]) return undefined;
    return this.getById(id);
  }

  static async delete(id, updatedBy = null) {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .input('updated_user', sql.UniqueIdentifier, updatedBy)
      .query('UPDATE users SET is_deleted = 1, updated_user = @updated_user, updated_at = GETDATE() WHERE id = @id');
    return result.rowsAffected[0] > 0;
  }

  static async updateFcmToken(id, fcmToken, updatedBy = null) {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .input('fcm_token', sql.NVarChar(500), fcmToken)
      .input('updated_user', sql.UniqueIdentifier, updatedBy)
      .query(`
        UPDATE users 
        SET fcm_token = @fcm_token, updated_user = @updated_user, updated_at = GETDATE()
        WHERE id = @id AND is_deleted = 0
      `);
    return result.rowsAffected[0] > 0;
  }

}

module.exports = User;


