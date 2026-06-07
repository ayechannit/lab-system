const { poolPromise } = require('./src/config/db');

async function run() {
  const pool = await poolPromise;
  
  // 1. Discover and drop check constraints on users.role
  const findUsersCk = await pool.request().query(`
    SELECT cc.name 
    FROM sys.check_constraints cc
    JOIN sys.columns c ON cc.parent_column_id = c.column_id AND cc.parent_object_id = c.object_id
    WHERE OBJECT_NAME(cc.parent_object_id) = 'users' AND c.name = 'role'
  `);
  
  for (const row of findUsersCk.recordset) {
    console.log(`Dropping constraint ${row.name} from users`);
    try {
      await pool.request().query(`ALTER TABLE users DROP CONSTRAINT ${row.name}`);
    } catch (err) {
      console.warn(`Could not drop ${row.name}:`, err.message);
    }
  }
  
  // 2. Add new check constraint on users.role
  console.log('Adding new constraint to users.role');
  await pool.request().query(`
    ALTER TABLE users ADD CONSTRAINT CK_Users_Role CHECK (role IN ('clinic', 'doctor', 'patient', 'phlebotomist'))
  `);

  // 3. Discover and drop check constraints on test_specific_discounts.role
  const findDiscountsCk = await pool.request().query(`
    SELECT cc.name 
    FROM sys.check_constraints cc
    JOIN sys.columns c ON cc.parent_column_id = c.column_id AND cc.parent_object_id = c.object_id
    WHERE OBJECT_NAME(cc.parent_object_id) = 'test_specific_discounts' AND c.name = 'role'
  `);
  
  for (const row of findDiscountsCk.recordset) {
    console.log(`Dropping constraint ${row.name} from test_specific_discounts`);
    try {
      await pool.request().query(`ALTER TABLE test_specific_discounts DROP CONSTRAINT ${row.name}`);
    } catch (err) {
      console.warn(`Could not drop ${row.name}:`, err.message);
    }
  }
  
  // 4. Add new check constraint on test_specific_discounts.role
  console.log('Adding new constraint to test_specific_discounts.role');
  await pool.request().query(`
    ALTER TABLE test_specific_discounts ADD CONSTRAINT CK_Test_Specific_Discounts_Role CHECK (role IN ('clinic', 'doctor', 'patient', 'phlebotomist'))
  `);

  console.log('Database constraints updated successfully!');
}

run()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error updating database constraints:', err);
    process.exit(1);
  });
