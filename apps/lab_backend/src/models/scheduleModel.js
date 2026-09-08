const { poolPromise } = require('../config/db');

/** Accept ISO strings, Date, or empty; return null for nullable timestamp columns. */
function toSqlDateTime2(value) {
  if (value === undefined || value === null || value === '') return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

class Schedule {
  static async getByOrderId(orderId) {
    const pool = await poolPromise;
    const result = await pool.query(
      `SELECT s.*,
              COALESCE(
                (SELECT profile_image_url FROM lab_staff WHERE id = o.collector_id AND is_deleted = false LIMIT 1),
                (SELECT profile_image_url FROM lab_staff WHERE name = s.collecting_person AND is_deleted = false LIMIT 1)
              ) AS profile_image_url
       FROM order_schedules s
       LEFT JOIN lab_orders o ON s.order_id = o.id
       WHERE s.order_id = $1`,
      [orderId]
    );

    const schedule = result.rows[0] || null;
    if (schedule && schedule.profile_image_url) {
      const StorageService = require('../utils/storageService');
      schedule.profile_image_url = await StorageService.getFileUrl(schedule.profile_image_url);
    }
    return schedule;
  }

  static async upsert(data, updatedBy = null) {
    const pool = await poolPromise;
    const result = await pool.query(
      `INSERT INTO order_schedules (id, order_id, collecting_person, collection_time, running_time, report_out_time, accepted_by_user, created_user, updated_user)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $7)
       ON CONFLICT (order_id) DO UPDATE SET
         collecting_person = EXCLUDED.collecting_person,
         collection_time = EXCLUDED.collection_time,
         running_time = EXCLUDED.running_time,
         report_out_time = EXCLUDED.report_out_time,
         accepted_by_user = EXCLUDED.accepted_by_user,
         updated_user = EXCLUDED.updated_user,
         updated_at = now()
       RETURNING *`,
      [
        data.order_id,
        data.collecting_person || null,
        toSqlDateTime2(data.collection_time),
        toSqlDateTime2(data.running_time),
        toSqlDateTime2(data.report_out_time),
        !!data.accepted_by_user,
        updatedBy,
      ]
    );
    return result.rows[0];
  }

  static async bulkUpsert(schedulesArray, updatedBy = null) {
    const results = [];
    for (const data of schedulesArray) {
      const res = await this.upsert(data, updatedBy);
      results.push(res);
    }
    return results;
  }
}

module.exports = Schedule;
