/**
 * Read-only introspection of the source MSSQL database's live schema. Writes
 * schema_dump.json (tables, columns, primary keys, foreign keys, unique
 * constraints, non-PK indexes, check constraints, row counts) so that
 * migrateDataToPostgres.js can migrate every table in dependency order without
 * a hardcoded table list, and so postgres_schema.sql can be reconciled against
 * the real production schema before the final cutover.
 *
 * This script only runs SELECT statements against INFORMATION_SCHEMA / sys.*
 * catalog views — it never modifies the source database.
 *
 * Usage (from apps/lab_backend), reading connection details from the SOURCE_DB_*
 * env vars (kept separate from the app's own DB_* vars, which describe the
 * PostgreSQL target once cut over):
 *   SOURCE_DB_SERVER=... SOURCE_DB_DATABASE=... SOURCE_DB_USER=... SOURCE_DB_PASSWORD=... \
 *     node scripts/introspectMssqlSchema.js
 *
 * Falls back to DB_SERVER / DB_DATABASE / DB_USER / DB_PASSWORD / DB_ENCRYPT /
 * DB_TRUST_SERVER_CERTIFICATE (the pre-migration .env shape) when the SOURCE_DB_*
 * vars aren't set, so it also works unmodified against the current .env today.
 */
const sql = require('mssql');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const dbConfig = {
  user: process.env.SOURCE_DB_USER || process.env.DB_USER,
  password: process.env.SOURCE_DB_PASSWORD || process.env.DB_PASSWORD,
  server: process.env.SOURCE_DB_SERVER || process.env.DB_SERVER,
  database: process.env.SOURCE_DB_DATABASE || process.env.DB_DATABASE,
  options: {
    encrypt: (process.env.SOURCE_DB_ENCRYPT || process.env.DB_ENCRYPT) !== 'false',
    trustServerCertificate: (process.env.SOURCE_DB_TRUST_SERVER_CERTIFICATE || process.env.DB_TRUST_SERVER_CERTIFICATE) === 'true',
  },
};

async function run() {
  console.log(`Connecting to source MSSQL at ${dbConfig.server}/${dbConfig.database}...`);
  const pool = await sql.connect(dbConfig);

  const tables = (await pool.request().query(`
    SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME
  `)).recordset.map(r => r.TABLE_NAME);

  const columns = (await pool.request().query(`
    SELECT c.TABLE_NAME, c.COLUMN_NAME, c.ORDINAL_POSITION, c.DATA_TYPE,
           c.CHARACTER_MAXIMUM_LENGTH, c.NUMERIC_PRECISION, c.NUMERIC_SCALE,
           c.IS_NULLABLE, c.COLUMN_DEFAULT
    FROM INFORMATION_SCHEMA.COLUMNS c
    JOIN INFORMATION_SCHEMA.TABLES t ON t.TABLE_NAME = c.TABLE_NAME
    WHERE t.TABLE_TYPE = 'BASE TABLE'
    ORDER BY c.TABLE_NAME, c.ORDINAL_POSITION
  `)).recordset;

  const pks = (await pool.request().query(`
    SELECT tc.TABLE_NAME, kcu.COLUMN_NAME, kcu.ORDINAL_POSITION
    FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
    JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
      ON tc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME AND tc.TABLE_NAME = kcu.TABLE_NAME
    WHERE tc.CONSTRAINT_TYPE = 'PRIMARY KEY'
    ORDER BY tc.TABLE_NAME, kcu.ORDINAL_POSITION
  `)).recordset;

  const fks = (await pool.request().query(`
    SELECT
      fk.name AS FK_NAME,
      tp.name AS TABLE_NAME,
      cp.name AS COLUMN_NAME,
      tr.name AS REF_TABLE_NAME,
      cr.name AS REF_COLUMN_NAME
    FROM sys.foreign_keys fk
    JOIN sys.foreign_key_columns fkc ON fkc.constraint_object_id = fk.object_id
    JOIN sys.tables tp ON tp.object_id = fkc.parent_object_id
    JOIN sys.columns cp ON cp.object_id = fkc.parent_object_id AND cp.column_id = fkc.parent_column_id
    JOIN sys.tables tr ON tr.object_id = fkc.referenced_object_id
    JOIN sys.columns cr ON cr.object_id = fkc.referenced_object_id AND cr.column_id = fkc.referenced_column_id
    ORDER BY tp.name
  `)).recordset;

  const uniques = (await pool.request().query(`
    SELECT tc.TABLE_NAME, tc.CONSTRAINT_NAME, kcu.COLUMN_NAME, kcu.ORDINAL_POSITION
    FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
    JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
      ON tc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME AND tc.TABLE_NAME = kcu.TABLE_NAME
    WHERE tc.CONSTRAINT_TYPE = 'UNIQUE'
    ORDER BY tc.TABLE_NAME, kcu.ORDINAL_POSITION
  `)).recordset;

  const indexes = (await pool.request().query(`
    SELECT
      t.name AS TABLE_NAME,
      i.name AS INDEX_NAME,
      i.is_unique,
      i.filter_definition,
      c.name AS COLUMN_NAME,
      ic.key_ordinal
    FROM sys.indexes i
    JOIN sys.tables t ON t.object_id = i.object_id
    JOIN sys.index_columns ic ON ic.object_id = i.object_id AND ic.index_id = i.index_id
    JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
    WHERE i.is_primary_key = 0 AND i.type > 0 AND i.name IS NOT NULL
    ORDER BY t.name, i.name, ic.key_ordinal
  `)).recordset;

  const checks = (await pool.request().query(`
    SELECT t.name AS TABLE_NAME, cc.name AS CONSTRAINT_NAME, cc.definition
    FROM sys.check_constraints cc
    JOIN sys.tables t ON t.object_id = cc.parent_object_id
    ORDER BY t.name
  `)).recordset;

  const rowCounts = (await pool.request().query(`
    SELECT t.name AS TABLE_NAME, p.rows AS ROW_COUNT
    FROM sys.tables t
    JOIN sys.partitions p ON p.object_id = t.object_id AND p.index_id IN (0,1)
    ORDER BY t.name
  `)).recordset;

  const outPath = path.join(__dirname, '../schema_dump.json');
  fs.writeFileSync(
    outPath,
    JSON.stringify({ tables, columns, pks, fks, uniques, indexes, checks, rowCounts }, null, 2)
  );
  console.log(`Wrote ${outPath} with ${tables.length} tables.`);
  await sql.close();
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
