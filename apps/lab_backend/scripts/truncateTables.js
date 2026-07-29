const { poolPromise } = require('../src/config/db');

async function run() {
  console.log('Connecting to MSSQL Database...');
  const pool = await poolPromise;

  // 1. Get all base tables
  console.log('Fetching database tables...');
  const tablesResult = await pool.request().query(`
    SELECT TABLE_SCHEMA, TABLE_NAME 
    FROM INFORMATION_SCHEMA.TABLES 
    WHERE TABLE_TYPE = 'BASE TABLE' AND TABLE_NAME != 'sysdiagrams'
  `);

  const allTables = tablesResult.recordset.map(row => ({
    schema: row.TABLE_SCHEMA,
    name: row.TABLE_NAME,
    fullName: `[${row.TABLE_SCHEMA}].[${row.TABLE_NAME}]`
  }));

  const tablesToKeep = ['users', 'lab_staff', 'theme_settings','ai_configs','ai_prompts','lab-test-catalog'];
  const tablesToTruncate = allTables.filter(t => !tablesToKeep.includes(t.name.toLowerCase()));

  console.log(`Found ${allTables.length} total base tables.`);
  console.log('Tables to KEEP:', tablesToKeep.join(', '));
  console.log('Tables to TRUNCATE:', tablesToTruncate.map(t => t.name).join(', '));

  if (tablesToTruncate.length === 0) {
    console.log('No tables to truncate.');
    return;
  }

  // 2. Disable constraints on ALL base tables to avoid FK errors during delete
  console.log('\nDisabling foreign key constraints on all tables...');
  for (const table of allTables) {
    try {
      await pool.request().query(`ALTER TABLE ${table.fullName} NOCHECK CONSTRAINT ALL`);
    } catch (err) {
      console.warn(`Warning: Could not disable constraints on table ${table.fullName}:`, err.message);
    }
  }

  // 3. Delete all records from specified tables
  console.log('\nDeleting records from target tables...');
  for (const table of tablesToTruncate) {
    try {
      const result = await pool.request().query(`DELETE FROM ${table.fullName}`);
      console.log(`Successfully deleted data from ${table.fullName}`);
    } catch (err) {
      console.error(`Error deleting from ${table.fullName}:`, err.message);
    }
  }

  // 4. Re-enable constraints on ALL base tables
  console.log('\nRe-enabling foreign key constraints on all tables...');
  for (const table of allTables) {
    try {
      await pool.request().query(`ALTER TABLE ${table.fullName} CHECK CONSTRAINT ALL`);
    } catch (err) {
      console.warn(`Warning: Could not re-enable constraints on table ${table.fullName}:`, err.message);
    }
  }

  console.log('\nTable cleanup operation completed!');
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('An error occurred during table truncation:', err);
    process.exit(1);
  });
