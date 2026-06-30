const { sql, poolPromise } = require('../src/config/db');

async function run() {
  const pool = await poolPromise;
  console.log('Connected to Database. Starting Database migrations...');

  // ==========================================
  // 1. MATERIAL FEES MIGRATION
  // ==========================================
  console.log('Checking material_fees configuration table...');
  
  // Create table if not exists
  await pool.request().query(`
    IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[material_fees]') AND type in (N'U'))
    BEGIN
      CREATE TABLE material_fees (
          id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
          name NVARCHAR(255) NOT NULL,
          amount_mmk DECIMAL(18, 2) NOT NULL,
          is_active BIT DEFAULT 1,
          created_user UNIQUEIDENTIFIER,
          updated_user UNIQUEIDENTIFIER,
          is_deleted BIT DEFAULT 0,
          created_at DATETIME2 DEFAULT GETDATE(),
          updated_at DATETIME2 DEFAULT GETDATE()
      );
    END
  `);
  console.log('Checked material_fees table (ensured exists).');

  // Create index if not exists
  await pool.request().query(`
    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_MaterialFees_Active' AND object_id = OBJECT_ID('material_fees'))
    BEGIN
      CREATE INDEX IX_MaterialFees_Active ON material_fees(is_active, is_deleted);
    END
  `);
  console.log('Checked IX_MaterialFees_Active index (ensured exists).');

  // Seed default if empty
  const countResult = await pool.request().query('SELECT COUNT(*) as count FROM material_fees');
  if (countResult.recordset[0].count === 0) {
    await pool.request().query(`
      INSERT INTO material_fees (name, amount_mmk, is_active)
      VALUES ('Standard Material Fee', 1000.00, 1);
    `);
    console.log('Seeded standard material fee.');
  } else {
    console.log('material_fees already seeded.');
  }

  console.log('Checking material_fee_mmk column on lab_orders table...');
  const checkMaterialColumn = await pool.request().query(`
    SELECT COLUMN_NAME 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'lab_orders' AND COLUMN_NAME = 'material_fee_mmk'
  `);

  if (checkMaterialColumn.recordset.length === 0) {
    console.log('Adding material_fee_mmk column to lab_orders...');
    await pool.request().query(`
      ALTER TABLE lab_orders ADD material_fee_mmk DECIMAL(18, 2) NOT NULL DEFAULT 0;
    `);
    console.log('Added material_fee_mmk column successfully!');
  } else {
    console.log('material_fee_mmk column already exists on lab_orders table.');
  }


  // ==========================================
  // 2. CARDINAL GEOFENCING MIGRATION
  // ==========================================
  console.log('Checking service_geofences configuration table...');
  await pool.request().query(`
    IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[service_geofences]') AND type in (N'U'))
    BEGIN
      CREATE TABLE service_geofences (
          id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
          name NVARCHAR(255) NOT NULL,
          west_longitude DECIMAL(18, 15) NOT NULL,
          east_longitude DECIMAL(18, 15) NOT NULL,
          north_latitude DECIMAL(18, 15) NOT NULL,
          south_latitude DECIMAL(18, 15) NOT NULL,
          service_fee_mmk DECIMAL(18, 2) NOT NULL DEFAULT 0,
          priority INT NOT NULL DEFAULT 1,
          is_active BIT DEFAULT 1,
          created_user UNIQUEIDENTIFIER,
          updated_user UNIQUEIDENTIFIER,
          is_deleted BIT DEFAULT 0,
          created_at DATETIME2 DEFAULT GETDATE(),
          updated_at DATETIME2 DEFAULT GETDATE()
      );
    END
  `);
  console.log('Checked service_geofences table (ensured exists).');

  // Create index if not exists
  await pool.request().query(`
    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_ServiceGeofences_Active' AND object_id = OBJECT_ID('service_geofences'))
    BEGIN
      CREATE INDEX IX_ServiceGeofences_Active ON service_geofences(is_active, is_deleted);
    END
  `);
  console.log('Checked IX_ServiceGeofences_Active index (ensured exists).');

  // Seed default if empty
  const countGeofences = await pool.request().query('SELECT COUNT(*) as count FROM service_geofences');
  if (countGeofences.recordset[0].count === 0) {
    await pool.request().query(`
      INSERT INTO service_geofences (name, west_longitude, east_longitude, north_latitude, south_latitude, service_fee_mmk, priority)
      VALUES 
      ('Downtown Zone', 96.140000000000000, 96.180000000000000, 16.800000000000000, 16.760000000000000, 1500.00, 2),
      ('Extended City Zone', 96.100000000000000, 96.220000000000000, 16.880000000000000, 16.700000000000000, 3000.00, 1);
    `);
    console.log('Seeded initial custom zones successfully!');
  } else {
    console.log('service_geofences already seeded.');
  }

  console.log('Checking geofence tracking columns on lab_orders table...');
  const checkGeofenceColumn = await pool.request().query(`
    SELECT COLUMN_NAME 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'lab_orders' AND COLUMN_NAME = 'service_geofence_id'
  `);

  if (checkGeofenceColumn.recordset.length === 0) {
    console.log('Adding service_geofence_id and service_fee_mmk columns to lab_orders...');
    await pool.request().query(`
      ALTER TABLE lab_orders ADD service_geofence_id UNIQUEIDENTIFIER NULL FOREIGN KEY REFERENCES service_geofences(id);
      ALTER TABLE lab_orders ADD service_fee_mmk DECIMAL(18, 2) NOT NULL DEFAULT 0;
    `);
    console.log('Added geofence tracking columns successfully!');
  } else {
    console.log('Geofence tracking columns already exist on lab_orders table.');
  }

  console.log('All migrations completed successfully!');
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Error during migrations:', err);
    process.exit(1);
  });
