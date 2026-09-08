/**
 * Upsert a lab_staff row using DB env from .env (no HTTP / JWT).
 * Password is bcrypt-hashed the same way as Staff.create().
 *
 * Usage (from apps/lab_backend):
 *   node scripts/insertStaff.js
 *
 * Optional env overrides:
 *   STAFF_SEED_NAME STAFF_SEED_EMAIL STAFF_SEED_PASSWORD STAFF_SEED_ROLE STAFF_SEED_ACTIVE
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { poolPromise } = require('../src/config/db');

const name = process.env.STAFF_SEED_NAME || 'Myat Thiha';
const email = process.env.STAFF_SEED_EMAIL || 'myatthiha.ucsy@gmail.com';
const plainPassword = process.env.STAFF_SEED_PASSWORD || '12345678';
const role = process.env.STAFF_SEED_ROLE || 'admin';
const isActive =
  process.env.STAFF_SEED_ACTIVE === undefined
    ? true
    : process.env.STAFF_SEED_ACTIVE === '1' || process.env.STAFF_SEED_ACTIVE === 'true';

async function main() {
  const allowed = new Set(['admin', 'lab_technician', 'reception', 'manager', 'collector']);
  if (!allowed.has(role)) {
    throw new Error(`Invalid role "${role}". Use one of: ${[...allowed].join(', ')}`);
  }

  const hashed = await bcrypt.hash(plainPassword, 10);
  const pool = await poolPromise;

  const found = await pool.query(
    'SELECT id, is_deleted FROM lab_staff WHERE email = $1',
    [email]
  );

  if (found.rows.length > 0) {
    const { id, is_deleted: wasDeleted } = found.rows[0];
    await pool.query(
      `UPDATE lab_staff
       SET name = $2,
           password_hash = $3,
           role = $4,
           is_active = $5,
           is_deleted = false,
           updated_at = now()
       WHERE id = $1`,
      [id, name, hashed, role, isActive]
    );
    console.log(
      wasDeleted
        ? `Reactivated and updated staff: ${email} (${role})`
        : `Updated staff: ${email} (${role})`,
    );
  } else {
    await pool.query(
      `INSERT INTO lab_staff (id, name, email, password_hash, role, is_active, created_user, updated_user, is_deleted)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NULL, NULL, false)`,
      [name, email, hashed, role, isActive]
    );
    console.log(`Inserted staff: ${email} (${role})`);
  }

  console.log('Done. Sign in at admin web with staff login using this email and password.');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
