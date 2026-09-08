const { poolPromise } = require('../src/config/db');

async function run() {
  console.log('Connecting to PostgreSQL Database...');
  const pool = await poolPromise;

  // 1. Get all base tables
  console.log('Fetching database tables...');
  const tablesResult = await pool.query(`
    SELECT table_schema, table_name
    FROM information_schema.tables
    WHERE table_type = 'BASE TABLE' AND table_schema = 'public'
  `);

  const allTables = tablesResult.rows.map(row => ({
    schema: row.table_schema,
    name: row.table_name,
    fullName: `"${row.table_schema}"."${row.table_name}"`
  }));

  const tablesToKeep = ['users', 'lab_staff', 'theme_settings', 'ai_configs', 'ai_prompts', 'lab_test_catalog'];
  const tablesToTruncate = allTables.filter(t => !tablesToKeep.includes(t.name.toLowerCase()));

  console.log(`Found ${allTables.length} total base tables.`);
  console.log('Tables to KEEP:', tablesToKeep.join(', '));
  console.log('Tables to TRUNCATE:', tablesToTruncate.map(t => t.name).join(', '));

  if (tablesToTruncate.length === 0) {
    console.log('No tables to truncate.');
    return;
  }

  // TRUNCATE ... CASCADE handles FK dependencies in one atomic step, so there's no
  // need to disable/re-enable constraints the way MSSQL's NOCHECK dance required.
  console.log('\nTruncating target tables...');
  for (const table of tablesToTruncate) {
    try {
      await pool.query(`TRUNCATE TABLE ${table.fullName} CASCADE`);
      console.log(`Successfully truncated ${table.fullName}`);
    } catch (err) {
      console.error(`Error truncating ${table.fullName}:`, err.message);
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
