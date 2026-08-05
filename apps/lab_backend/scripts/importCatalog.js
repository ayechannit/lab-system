const fs = require('fs');
const path = require('path');
const { sql, poolPromise } = require('../src/config/db');

async function run() {
  const jsonPath = path.join(__dirname, '../../../parsed_tests.json');
  if (!fs.existsSync(jsonPath)) {
    throw new Error(`parsed_tests.json not found at ${jsonPath}. Please run parse_excel_to_json.py first.`);
  }

  const testsData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  console.log(`Loaded ${testsData.length} tests from JSON.`);

  console.log('Connecting to MSSQL Database...');
  const pool = await poolPromise;

  // 1. Double check / empty catalog first to ensure clean import
  console.log('Clearing existing entries in lab_test_catalog...');
  try {
    // Temporarily disable foreign keys referring to lab_test_catalog if any
    await pool.request().query('ALTER TABLE lab_order_items NOCHECK CONSTRAINT ALL');
    await pool.request().query('ALTER TABLE test_referral_fees NOCHECK CONSTRAINT ALL');
    
    await pool.request().query('DELETE FROM lab_test_catalog');
    console.log('Existing catalog data cleared successfully!');
  } catch (err) {
    console.error('Error clearing existing catalog:', err.message);
  }

  // 2. Insert new tests
  console.log('\nInserting new tests into lab_test_catalog...');
  let count = 0;
  for (const test of testsData) {
    try {
      await pool.request()
        .input('test_name', sql.NVarChar, test.test_name)
        .input('test_code', sql.VarChar, test.test_code)
        .input('description', sql.NVarChar, test.description)
        .input('base_price_mmk', sql.Decimal(18, 2), test.base_price_mmk)
        .input('category', sql.NVarChar, test.category)
        .input('is_package', sql.Bit, test.is_package ? 1 : 0)
        .query(`
          INSERT INTO lab_test_catalog (
            id, test_name, test_code, description, base_price_mmk, category, is_package, package_items, is_active, is_deleted, created_at, updated_at
          ) VALUES (
            NEWID(), @test_name, @test_code, @description, @base_price_mmk, @category, @is_package, NULL, 1, 0, GETDATE(), GETDATE()
          )
        `);
      count++;
      if (count % 50 === 0) {
        console.log(`Inserted ${count}/${testsData.length} tests...`);
      }
    } catch (err) {
      console.error(`Error inserting test [${test.test_code}] "${test.test_name}":`, err.message);
    }
  }

  // 3. Re-enable foreign key constraints
  console.log('\nRe-enabling foreign key constraints...');
  try {
    await pool.request().query('ALTER TABLE lab_order_items CHECK CONSTRAINT ALL');
    await pool.request().query('ALTER TABLE test_referral_fees CHECK CONSTRAINT ALL');
  } catch (err) {
    console.warn('Warning: Could not re-enable some constraints:', err.message);
  }

  console.log(`\nImport complete! Successfully inserted ${count} tests into lab_test_catalog.`);
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('An error occurred during catalog import:', err);
    process.exit(1);
  });
