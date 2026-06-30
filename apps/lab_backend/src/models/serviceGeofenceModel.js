const { sql, poolPromise } = require('../config/db');

class ServiceGeofence {
  static async getAll() {
    const pool = await poolPromise;
    const result = await pool.request()
      .query('SELECT *, created_user, updated_user FROM service_geofences WHERE is_deleted = 0 ORDER BY priority DESC, created_at DESC');
    return result.recordset;
  }

  static async getActive() {
    const pool = await poolPromise;
    const result = await pool.request()
      .query('SELECT *, created_user, updated_user FROM service_geofences WHERE is_active = 1 AND is_deleted = 0 ORDER BY priority DESC, created_at DESC');
    return result.recordset;
  }

  static async getById(id) {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query('SELECT *, created_user, updated_user FROM service_geofences WHERE id = @id AND is_deleted = 0');
    return result.recordset[0];
  }

  static async create(data, createdBy = null) {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('name', sql.NVarChar, data.name)
      .input('west_longitude', sql.Decimal(18, 15), data.west_longitude)
      .input('east_longitude', sql.Decimal(18, 15), data.east_longitude)
      .input('north_latitude', sql.Decimal(18, 15), data.north_latitude)
      .input('south_latitude', sql.Decimal(18, 15), data.south_latitude)
      .input('service_fee_mmk', sql.Decimal(18, 2), data.service_fee_mmk || 0)
      .input('priority', sql.Int, data.priority !== undefined ? data.priority : 1)
      .input('is_active', sql.Bit, data.is_active !== undefined ? data.is_active : 1)
      .input('created_user', sql.UniqueIdentifier, createdBy)
      .query(`
        INSERT INTO service_geofences (id, name, west_longitude, east_longitude, north_latitude, south_latitude, service_fee_mmk, priority, is_active, is_deleted, created_user, updated_user, created_at, updated_at)
        OUTPUT INSERTED.*
        VALUES (NEWID(), @name, @west_longitude, @east_longitude, @north_latitude, @south_latitude, @service_fee_mmk, @priority, @is_active, 0, @created_user, @created_user, GETDATE(), GETDATE())
      `);
    return result.recordset[0];
  }

  static async update(id, data, updatedBy = null) {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .input('name', sql.NVarChar, data.name)
      .input('west_longitude', sql.Decimal(18, 15), data.west_longitude)
      .input('east_longitude', sql.Decimal(18, 15), data.east_longitude)
      .input('north_latitude', sql.Decimal(18, 15), data.north_latitude)
      .input('south_latitude', sql.Decimal(18, 15), data.south_latitude)
      .input('service_fee_mmk', sql.Decimal(18, 2), data.service_fee_mmk)
      .input('priority', sql.Int, data.priority)
      .input('is_active', sql.Bit, data.is_active !== undefined ? data.is_active : 1)
      .input('updated_user', sql.UniqueIdentifier, updatedBy)
      .query(`
        UPDATE service_geofences 
        SET name = @name, 
            west_longitude = @west_longitude, 
            east_longitude = @east_longitude, 
            north_latitude = @north_latitude, 
            south_latitude = @south_latitude, 
            service_fee_mmk = @service_fee_mmk, 
            priority = @priority,
            is_active = @is_active, 
            updated_user = @updated_user, 
            updated_at = GETDATE()
        OUTPUT INSERTED.*
        WHERE id = @id AND is_deleted = 0
      `);
    return result.recordset[0] ?? null;
  }

  static async delete(id, updatedBy = null) {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .input('updated_user', sql.UniqueIdentifier, updatedBy)
      .query('UPDATE service_geofences SET is_deleted = 1, updated_user = @updated_user, updated_at = GETDATE() WHERE id = @id');
    return result.rowsAffected[0] > 0;
  }

  /**
   * Matches geographic coordinates to the highest priority active geofence
   */
  static async matchCoordinates(latitude, longitude) {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('latitude', sql.Float, latitude)
      .input('longitude', sql.Float, longitude)
      .query(`
        SELECT TOP 1 *, created_user, updated_user 
        FROM service_geofences
        WHERE @latitude >= south_latitude AND @latitude <= north_latitude
          AND @longitude >= west_longitude AND @longitude <= east_longitude
          AND is_active = 1 
          AND is_deleted = 0
        ORDER BY priority DESC, created_at DESC
      `);
    return result.recordset[0] ?? null;
  }
}

module.exports = ServiceGeofence;
