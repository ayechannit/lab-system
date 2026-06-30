const { sql, poolPromise } = require('../src/config/db');

async function run() {
  const pool = await poolPromise;
  console.log('--- LIVE DATABASE SCHEMA VERIFICATION ---');

  // 1. Verify material_fees rows
  try {
    const materialFeesResult = await pool.request().query('SELECT * FROM material_fees');
    console.log('\n[material_fees] Table Content:');
    console.table(materialFeesResult.recordset);
  } catch (err) {
    console.error('Error fetching material_fees:', err.message);
  }

  // 2. Verify service_geofences rows
  try {
    const geofencesResult = await pool.request().query('SELECT id, name, west_longitude, east_longitude, north_latitude, south_latitude, service_fee_mmk, priority FROM service_geofences');
    console.log('\n[service_geofences] Table Content:');
    console.table(geofencesResult.recordset);
  } catch (err) {
    console.error('Error fetching service_geofences:', err.message);
  }

  // 3. Verify columns of lab_orders
  try {
    const columnsResult = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'lab_orders'
        AND COLUMN_NAME IN ('material_fee_mmk', 'service_geofence_id', 'service_fee_mmk')
    `);
    console.log('\n[lab_orders] New Tracking Columns:');
    console.table(columnsResult.recordset);
  } catch (err) {
    console.error('Error fetching lab_orders columns:', err.message);
  }
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
