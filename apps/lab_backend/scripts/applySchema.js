const fs = require('fs');
const path = require('path');
const { poolPromise } = require('../src/config/db');

async function run() {
  const schemaPath = path.join(__dirname, '../postgres_schema.sql');
  if (!fs.existsSync(schemaPath)) {
    throw new Error(`postgres_schema.sql not found at ${schemaPath}`);
  }

  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  console.log('Connecting to PostgreSQL...');
  const pool = await poolPromise;

  console.log('Applying database schema from postgres_schema.sql...');

  // Executing the schema SQL directly
  await pool.query(schemaSql);

  console.log('Database schema applied successfully!');
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Error applying schema:', err);
    process.exit(1);
  });
