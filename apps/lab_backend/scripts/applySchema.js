const fs = require('fs');
const path = require('path');
const { poolPromise } = require('../src/config/db');

async function run() {
  const schemaPath = path.join(__dirname, '../schema.sql');
  if (!fs.existsSync(schemaPath)) {
    throw new Error(`schema.sql not found at ${schemaPath}`);
  }

  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  console.log('Connecting to MSSQL...');
  const pool = await poolPromise;

  console.log('Applying database schema from schema.sql...');
  
  // Executing the schema SQL directly
  await pool.request().query(schemaSql);
  
  console.log('Database schema applied successfully!');
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Error applying schema:', err);
    process.exit(1);
  });
