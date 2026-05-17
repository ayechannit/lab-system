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
const { sql, poolPromise } = require('../src/config/db');

const name = process.env.STAFF_SEED_NAME || 'Myat Thiha';
const email = process.env.STAFF_SEED_EMAIL || 'myatthiha.ucsy@gmail.com';
const plainPassword = process.env.STAFF_SEED_PASSWORD || '12345678';
const role = process.env.STAFF_SEED_ROLE || 'admin';
const isActive =
  process.env.STAFF_SEED_ACTIVE === undefined
    ? true
    : process.env.STAFF_SEED_ACTIVE === '1' || process.env.STAFF_SEED_ACTIVE === 'true';

async function main() {
  const allowed = new Set(['admin', 'lab_technician', 'reception', 'manager']);
  if (!allowed.has(role)) {
    throw new Error(`Invalid role "${role}". Use one of: ${[...allowed].join(', ')}`);
  }

  const hashed = await bcrypt.hash(plainPassword, 10);
  const pool = await poolPromise;

  const found = await pool
    .request()
    .input('email', sql.VarChar, email)
    .query(
      'SELECT id, is_deleted FROM lab_staff WHERE email = @email',
    );

  if (found.recordset.length > 0) {
    const { id, is_deleted: wasDeleted } = found.recordset[0];
    await pool
      .request()
      .input('id', sql.UniqueIdentifier, id)
      .input('name', sql.VarChar, name)
      .input('password_hash', sql.VarChar, hashed)
      .input('role', sql.VarChar, role)
      .input('is_active', sql.Bit, isActive ? 1 : 0)
      .input('is_deleted', sql.Bit, 0)
      .query(
        `UPDATE lab_staff
         SET name = @name,
             password_hash = @password_hash,
             role = @role,
             is_active = @is_active,
             is_deleted = @is_deleted,
             updated_at = GETDATE()
         WHERE id = @id`,
      );
    console.log(
      wasDeleted
        ? `Reactivated and updated staff: ${email} (${role})`
        : `Updated staff: ${email} (${role})`,
    );
  } else {
    await pool
      .request()
      .input('name', sql.VarChar, name)
      .input('email', sql.VarChar, email)
      .input('password_hash', sql.VarChar, hashed)
      .input('role', sql.VarChar, role)
      .input('is_active', sql.Bit, isActive ? 1 : 0)
      .query(
        `INSERT INTO lab_staff (id, name, email, password_hash, role, is_active, created_user, updated_user, is_deleted)
         VALUES (NEWID(), @name, @email, @password_hash, @role, @is_active, NULL, NULL, 0)`,
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
