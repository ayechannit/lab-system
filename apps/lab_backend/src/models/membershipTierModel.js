const { sql, poolPromise } = require('../config/db');

/**
 * Membership tiers are qualified by lifetime spend (`min_spend_mmk`, MMK).
 * This is independent of the redeemable loyalty-points balance (`users.total_points`).
 */
const TIER_SELECT = `
  id, name,
  min_spend_mmk,
  discount_percent, is_active, is_deleted,
  created_user, updated_user, created_at, updated_at
`;

class MembershipTier {
  static async getAll() {
    const pool = await poolPromise;
    const result = await pool.request()
      .query(`SELECT ${TIER_SELECT} FROM membership_tiers WHERE is_deleted = 0 ORDER BY min_spend_mmk ASC`);
    return result.recordset;
  }

  /** Active tiers for patient apps (public fields only, ordered by spend ladder). */
  static async getActive() {
    const pool = await poolPromise;
    const result = await pool.request()
      .query(`
        SELECT id, name, min_spend_mmk, discount_percent
        FROM membership_tiers
        WHERE is_deleted = 0 AND is_active = 1
        ORDER BY min_spend_mmk ASC
      `);
    return result.recordset;
  }

  static async getById(id) {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query(`SELECT ${TIER_SELECT} FROM membership_tiers WHERE id = @id AND is_deleted = 0`);
    return result.recordset[0];
  }

  static async create(data, createdBy = null) {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('name', sql.VarChar, data.name)
      .input('min_spend_mmk', sql.Decimal(18, 2), data.min_spend_mmk)
      .input('discount_percent', sql.Decimal(5, 2), data.discount_percent)
      .input('is_active', sql.Bit, data.is_active !== undefined ? data.is_active : 1)
      .input('created_user', sql.UniqueIdentifier, createdBy)
      .query(`
        INSERT INTO membership_tiers (id, name, min_spend_mmk, discount_percent, is_active, is_deleted, created_user, updated_user)
        OUTPUT INSERTED.id, INSERTED.name, INSERTED.min_spend_mmk,
               INSERTED.discount_percent, INSERTED.is_active, INSERTED.is_deleted,
               INSERTED.created_user, INSERTED.updated_user, INSERTED.created_at, INSERTED.updated_at
        VALUES (NEWID(), @name, @min_spend_mmk, @discount_percent, @is_active, 0, @created_user, @created_user)
      `);
    return result.recordset[0];
  }

  static async update(id, data, updatedBy = null) {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .input('name', sql.VarChar, data.name)
      .input('min_spend_mmk', sql.Decimal(18, 2), data.min_spend_mmk)
      .input('discount_percent', sql.Decimal(5, 2), data.discount_percent)
      .input('is_active', sql.Bit, data.is_active !== undefined ? data.is_active : 1)
      .input('updated_user', sql.UniqueIdentifier, updatedBy)
      .query(`
        UPDATE membership_tiers
        SET name = @name,
            min_spend_mmk = @min_spend_mmk,
            discount_percent = @discount_percent,
            is_active = @is_active,
            updated_user = @updated_user,
            updated_at = GETDATE()
        OUTPUT INSERTED.id, INSERTED.name, INSERTED.min_spend_mmk,
               INSERTED.discount_percent, INSERTED.is_active, INSERTED.is_deleted,
               INSERTED.created_user, INSERTED.updated_user, INSERTED.created_at, INSERTED.updated_at
        WHERE id = @id AND is_deleted = 0
      `);
    return result.recordset[0];
  }

  static async delete(id, updatedBy = null) {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .input('updated_user', sql.UniqueIdentifier, updatedBy)
      .query('UPDATE membership_tiers SET is_deleted = 1, updated_user = @updated_user, updated_at = GETDATE() WHERE id = @id');
    return result.rowsAffected[0] > 0;
  }
}

module.exports = MembershipTier;
