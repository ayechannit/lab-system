// Adds lab_staff.staff_code so staff without an email can sign in with a staff code.
// Usage: node scripts/addStaffCode.js
const { poolPromise } = require('../src/config/db');

async function run() {
  const pool = await poolPromise;
  await pool.query('ALTER TABLE lab_staff ADD COLUMN IF NOT EXISTS staff_code varchar(50)');
  await pool.query('ALTER TABLE lab_staff ALTER COLUMN email DROP NOT NULL');
  await pool.query(
    `CREATE UNIQUE INDEX IF NOT EXISTS uq_lab_staff_staff_code
     ON lab_staff (lower(staff_code)) WHERE is_deleted = false AND staff_code IS NOT NULL`
  );
  console.log('lab_staff.staff_code is ready.');
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Error adding staff_code:', err);
    process.exit(1);
  });
