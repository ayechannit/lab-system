// Adds per-test lab-complete / release tracking to lab_order_items and backfills existing orders.
// Usage: node scripts/addPerTestProgress.js
const { poolPromise } = require('../src/config/db');

async function run() {
  const pool = await poolPromise;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('ALTER TABLE lab_order_items ADD COLUMN IF NOT EXISTS lab_completed_at timestamptz');
    await client.query('ALTER TABLE lab_order_items ADD COLUMN IF NOT EXISTS lab_completed_by uuid REFERENCES lab_staff (id)');
    await client.query('ALTER TABLE lab_order_items ADD COLUMN IF NOT EXISTS released_at timestamptz');
    await client.query('ALTER TABLE lab_order_items ADD COLUMN IF NOT EXISTS released_by uuid REFERENCES lab_staff (id)');

    // Orders already past the lab keep their meaning: every test is lab-complete,
    // and every test on a delivered order counts as released.
    const completed = await client.query(
      `UPDATE lab_order_items oi
       SET lab_completed_at = COALESCE(oi.updated_at, o.updated_at)
       FROM lab_orders o
       WHERE oi.order_id = o.id AND o.status IN ('completed', 'delivered') AND oi.lab_completed_at IS NULL`
    );
    const released = await client.query(
      `UPDATE lab_order_items oi
       SET released_at = o.updated_at
       FROM lab_orders o
       WHERE oi.order_id = o.id AND o.status = 'delivered' AND oi.released_at IS NULL`
    );
    await client.query('COMMIT');
    console.log(`Backfilled lab_completed_at on ${completed.rowCount} tests, released_at on ${released.rowCount} tests.`);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Error adding per-test progress columns:', err);
    process.exit(1);
  });
