const { poolPromise } = require('../config/db');

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
    const result = await pool.query(
      `SELECT ${TIER_SELECT} FROM membership_tiers WHERE is_deleted = false ORDER BY min_spend_mmk ASC`
    );
    return result.rows;
  }

  /** Active tiers for patient apps (public fields only, ordered by spend ladder). */
  static async getActive() {
    const pool = await poolPromise;
    const result = await pool.query(`
      SELECT id, name, min_spend_mmk, discount_percent
      FROM membership_tiers
      WHERE is_deleted = false AND is_active = true
      ORDER BY min_spend_mmk ASC
    `);
    return result.rows;
  }

  static async getById(id) {
    const pool = await poolPromise;
    const result = await pool.query(
      `SELECT ${TIER_SELECT} FROM membership_tiers WHERE id = $1 AND is_deleted = false`,
      [id]
    );
    return result.rows[0];
  }

  static async create(data, createdBy = null) {
    const pool = await poolPromise;
    const result = await pool.query(
      `INSERT INTO membership_tiers (id, name, min_spend_mmk, discount_percent, is_active, is_deleted, created_user, updated_user)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, false, $5, $5)
       RETURNING id, name, min_spend_mmk,
                 discount_percent, is_active, is_deleted,
                 created_user, updated_user, created_at, updated_at`,
      [
        data.name,
        data.min_spend_mmk,
        data.discount_percent,
        data.is_active !== undefined ? data.is_active : true,
        createdBy,
      ]
    );
    return result.rows[0];
  }

  static async update(id, data, updatedBy = null) {
    const pool = await poolPromise;
    const result = await pool.query(
      `UPDATE membership_tiers
       SET name = $2,
           min_spend_mmk = $3,
           discount_percent = $4,
           is_active = $5,
           updated_user = $6,
           updated_at = now()
       WHERE id = $1 AND is_deleted = false
       RETURNING id, name, min_spend_mmk,
                 discount_percent, is_active, is_deleted,
                 created_user, updated_user, created_at, updated_at`,
      [
        id,
        data.name,
        data.min_spend_mmk,
        data.discount_percent,
        data.is_active !== undefined ? data.is_active : true,
        updatedBy,
      ]
    );
    return result.rows[0];
  }

  static async delete(id, updatedBy = null) {
    const pool = await poolPromise;
    const result = await pool.query(
      'UPDATE membership_tiers SET is_deleted = true, updated_user = $2, updated_at = now() WHERE id = $1',
      [id, updatedBy]
    );
    return result.rowCount > 0;
  }
}

module.exports = MembershipTier;
