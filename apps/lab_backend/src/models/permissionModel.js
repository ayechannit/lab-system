const { poolPromise } = require('../config/db');

/** Staff roles that can be granted per-module permissions. `admin` is intentionally excluded — it always has full access, hardcoded, so a bad edit here can never lock every admin out. */
const CONFIGURABLE_ROLES = ['manager', 'reception', 'lab_technician', 'collector'];

/** Every module the admin_web sidebar exposes. Keys match the route path segment. */
const MODULES = [
  'orders',
  'lab-tests',
  'staff',
  'users',
  'collections',
  'results',
  'ratings',
  'referral-fees',
  'discounts',
  'service-geofences',
  'advertisements',
  'loyalty',
  'membership-tiers',
  'system-settings',
  'reports',
];

/** Default matrix used to seed the table and as a fallback if a (role, module) row is missing. */
const DEFAULTS = {
  manager: MODULES.filter((m) => !['staff', 'system-settings'].includes(m)),
  reception: MODULES.filter((m) => !['staff', 'system-settings', 'reports'].includes(m)),
  lab_technician: MODULES.filter((m) => !['staff', 'users', 'system-settings', 'reports'].includes(m)),
  collector: MODULES.filter((m) => !['staff', 'users', 'system-settings', 'reports'].includes(m)),
};

class Permission {
  static get MODULES() {
    return MODULES;
  }

  static get CONFIGURABLE_ROLES() {
    return CONFIGURABLE_ROLES;
  }

  /** Full matrix for the Permissions admin page: { [role]: { [module_key]: boolean } }. `admin` is always all-true. */
  static async getMatrix() {
    const pool = await poolPromise;
    const result = await pool.query('SELECT role, module_key, is_allowed FROM role_permissions');

    const matrix = {};
    for (const role of CONFIGURABLE_ROLES) {
      matrix[role] = {};
      for (const moduleKey of MODULES) {
        matrix[role][moduleKey] = DEFAULTS[role].includes(moduleKey);
      }
    }
    for (const row of result.rows) {
      if (matrix[row.role] && MODULES.includes(row.module_key)) {
        matrix[row.role][row.module_key] = !!row.is_allowed;
      }
    }
    matrix.admin = {};
    for (const moduleKey of MODULES) matrix.admin[moduleKey] = true;
    return matrix;
  }

  /** Allowed module keys for a single role — used by `modulePermission()` and `GET /api/permissions/me`. */
  static async getAllowedModulesForRole(role) {
    if (role === 'admin') return [...MODULES];
    if (!CONFIGURABLE_ROLES.includes(role)) return [];

    const pool = await poolPromise;
    const result = await pool.query(
      'SELECT module_key, is_allowed FROM role_permissions WHERE role = $1',
      [role]
    );

    const overrides = new Map(result.rows.map((r) => [r.module_key, !!r.is_allowed]));
    return MODULES.filter((moduleKey) =>
      overrides.has(moduleKey) ? overrides.get(moduleKey) : DEFAULTS[role].includes(moduleKey),
    );
  }

  static async isRoleAllowed(role, moduleKey) {
    if (role === 'admin') return true;
    const allowed = await Permission.getAllowedModulesForRole(role);
    return allowed.includes(moduleKey);
  }

  /** Bulk upsert `{ role, module_key, is_allowed }` entries. Entries for `admin` or unknown module keys are ignored. */
  static async setMatrix(entries, updatedBy = null) {
    const pool = await poolPromise;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const entry of entries) {
        if (!CONFIGURABLE_ROLES.includes(entry.role) || !MODULES.includes(entry.module_key)) continue;
        await client.query(
          `INSERT INTO role_permissions (id, role, module_key, is_allowed, updated_user)
           VALUES (gen_random_uuid(), $1, $2, $3, $4)
           ON CONFLICT (role, module_key) DO UPDATE SET
             is_allowed = EXCLUDED.is_allowed,
             updated_user = EXCLUDED.updated_user,
             updated_at = now()`,
          [entry.role, entry.module_key, !!entry.is_allowed, updatedBy]
        );
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
    return Permission.getMatrix();
  }
}

module.exports = Permission;
