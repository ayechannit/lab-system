const { poolPromise } = require('../config/db');

class ServiceGeofence {
  static async getAll() {
    const pool = await poolPromise;
    const result = await pool.query(
      'SELECT *, created_user, updated_user FROM service_geofences WHERE is_deleted = false ORDER BY priority DESC, created_at DESC'
    );
    return result.rows;
  }

  static async getActive() {
    const pool = await poolPromise;
    const result = await pool.query(
      'SELECT *, created_user, updated_user FROM service_geofences WHERE is_active = true AND is_deleted = false ORDER BY priority DESC, created_at DESC'
    );
    return result.rows;
  }

  static async getById(id) {
    const pool = await poolPromise;
    const result = await pool.query(
      'SELECT *, created_user, updated_user FROM service_geofences WHERE id = $1 AND is_deleted = false',
      [id]
    );
    return result.rows[0];
  }

  static async create(data, createdBy = null) {
    const pool = await poolPromise;
    const result = await pool.query(
      `INSERT INTO service_geofences (id, name, west_longitude, east_longitude, north_latitude, south_latitude, service_fee_mmk, priority, is_active, is_deleted, created_user, updated_user, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, false, $9, $9, now(), now())
       RETURNING *`,
      [
        data.name,
        data.west_longitude,
        data.east_longitude,
        data.north_latitude,
        data.south_latitude,
        data.service_fee_mmk || 0,
        data.priority !== undefined ? data.priority : 1,
        data.is_active !== undefined ? data.is_active : true,
        createdBy,
      ]
    );
    return result.rows[0];
  }

  static async update(id, data, updatedBy = null) {
    const pool = await poolPromise;
    const result = await pool.query(
      `UPDATE service_geofences
       SET name = $2,
           west_longitude = $3,
           east_longitude = $4,
           north_latitude = $5,
           south_latitude = $6,
           service_fee_mmk = $7,
           priority = $8,
           is_active = $9,
           updated_user = $10,
           updated_at = now()
       WHERE id = $1 AND is_deleted = false
       RETURNING *`,
      [
        id,
        data.name,
        data.west_longitude,
        data.east_longitude,
        data.north_latitude,
        data.south_latitude,
        data.service_fee_mmk,
        data.priority,
        data.is_active !== undefined ? data.is_active : true,
        updatedBy,
      ]
    );
    return result.rows[0] ?? null;
  }

  static async delete(id, updatedBy = null) {
    const pool = await poolPromise;
    const result = await pool.query(
      'UPDATE service_geofences SET is_deleted = true, updated_user = $2, updated_at = now() WHERE id = $1',
      [id, updatedBy]
    );
    return result.rowCount > 0;
  }

  /**
   * Matches geographic coordinates to the highest priority active geofence
   */
  static async matchCoordinates(latitude, longitude) {
    const pool = await poolPromise;
    const result = await pool.query(
      `SELECT *, created_user, updated_user
       FROM service_geofences
       WHERE $1 >= south_latitude AND $1 <= north_latitude
         AND $2 >= west_longitude AND $2 <= east_longitude
         AND is_active = true
         AND is_deleted = false
       ORDER BY priority DESC, created_at DESC
       LIMIT 1`,
      [latitude, longitude]
    );
    return result.rows[0] ?? null;
  }
}

module.exports = ServiceGeofence;
