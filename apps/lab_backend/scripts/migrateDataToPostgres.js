/**
 * One-time data migration: copies every row from the source MSSQL database into
 * the target PostgreSQL database (created from postgres_schema.sql), preserving
 * primary keys so foreign keys stay intact.
 *
 * Prerequisites:
 *   1. node scripts/introspectMssqlSchema.js   (writes schema_dump.json — used
 *      here only to compute a safe table order from FK dependencies; it does
 *      NOT drive column mapping, since Postgres column names/types come from
 *      postgres_schema.sql, which was hand-reconciled against schema_dump.json)
 *   2. node scripts/applySchema.js             (creates empty tables in Postgres)
 *
 * Then run this script with BOTH the source (MSSQL) and target (PostgreSQL)
 * connection details set — kept under separate env var prefixes so this script
 * doesn't depend on which shape the app's own .env currently has:
 *
 *   Source (MSSQL):   SOURCE_DB_SERVER, SOURCE_DB_DATABASE, SOURCE_DB_USER,
 *                      SOURCE_DB_PASSWORD, SOURCE_DB_ENCRYPT,
 *                      SOURCE_DB_TRUST_SERVER_CERTIFICATE
 *                      (falls back to DB_SERVER / DB_DATABASE / DB_USER /
 *                      DB_PASSWORD / DB_ENCRYPT / DB_TRUST_SERVER_CERTIFICATE)
 *   Target (Postgres): TARGET_DB_HOST, TARGET_DB_PORT, TARGET_DB_DATABASE,
 *                      TARGET_DB_USER, TARGET_DB_PASSWORD, TARGET_DB_SSL,
 *                      TARGET_DB_SSL_REJECT_UNAUTHORIZED
 *
 * Usage:
 *   node scripts/migrateDataToPostgres.js            # migrates all tables
 *   node scripts/migrateDataToPostgres.js --dry-run   # counts rows only, no writes
 *   node scripts/migrateDataToPostgres.js --only=users,lab_staff
 */
const fs = require('fs');
const path = require('path');
const mssql = require('mssql');
const { Pool } = require('pg');
require('dotenv').config();

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const onlyArg = args.find(a => a.startsWith('--only='));
const onlyTables = onlyArg ? onlyArg.slice('--only='.length).split(',').map(s => s.trim()) : null;
const BATCH_SIZE = 500;

const sourceConfig = {
  user: process.env.SOURCE_DB_USER || process.env.DB_USER,
  password: process.env.SOURCE_DB_PASSWORD || process.env.DB_PASSWORD,
  server: process.env.SOURCE_DB_SERVER || process.env.DB_SERVER,
  database: process.env.SOURCE_DB_DATABASE || process.env.DB_DATABASE,
  options: {
    encrypt: (process.env.SOURCE_DB_ENCRYPT || process.env.DB_ENCRYPT) !== 'false',
    trustServerCertificate: (process.env.SOURCE_DB_TRUST_SERVER_CERTIFICATE || process.env.DB_TRUST_SERVER_CERTIFICATE) === 'true',
  },
};

const targetSsl = process.env.TARGET_DB_SSL === 'true'
  ? { rejectUnauthorized: process.env.TARGET_DB_SSL_REJECT_UNAUTHORIZED !== 'false' }
  : false;

const targetPool = new Pool({
  host: process.env.TARGET_DB_HOST,
  port: process.env.TARGET_DB_PORT ? Number(process.env.TARGET_DB_PORT) : 5432,
  user: process.env.TARGET_DB_USER,
  password: process.env.TARGET_DB_PASSWORD,
  database: process.env.TARGET_DB_DATABASE,
  ssl: targetSsl,
});

/** Kahn's algorithm: parents (referenced tables) before children (referencing tables). */
function topoSort(tables, fks) {
  const deps = new Map(tables.map(t => [t, new Set()]));
  for (const fk of fks) {
    if (fk.TABLE_NAME === fk.REF_TABLE_NAME) continue; // ignore self-referencing FKs
    if (deps.has(fk.TABLE_NAME) && deps.has(fk.REF_TABLE_NAME)) {
      deps.get(fk.TABLE_NAME).add(fk.REF_TABLE_NAME);
    }
  }

  const sorted = [];
  const visited = new Set();
  const visiting = new Set();

  function visit(table) {
    if (visited.has(table)) return;
    if (visiting.has(table)) return; // cycle guard — leave it, order isn't perfect but won't hang
    visiting.add(table);
    for (const dep of deps.get(table) || []) visit(dep);
    visiting.delete(table);
    visited.add(table);
    sorted.push(table);
  }

  for (const table of tables) visit(table);
  return sorted;
}

/** Convert a value coming out of mssql into something pg's driver accepts as-is. */
function coerceValue(value) {
  if (value === undefined) return null;
  if (Buffer.isBuffer(value)) return value; // bytea
  return value;
}

async function migrateTable(sourcePool, tableName, columnNames) {
  const countResult = await sourcePool.request().query(`SELECT COUNT(*) as count FROM [${tableName}]`);
  const total = countResult.recordset[0].count;
  console.log(`\n[${tableName}] ${total} row(s) in source.`);

  if (total === 0) return { table: tableName, migrated: 0 };
  if (dryRun) return { table: tableName, migrated: 0, skipped: true };

  const dataResult = await sourcePool.request().query(`SELECT * FROM [${tableName}]`);
  const rows = dataResult.recordset;

  const cols = columnNames && columnNames.length > 0
    ? columnNames
    : Object.keys(rows[0]);

  let migrated = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const valueRows = [];
    const params = [];
    for (const row of batch) {
      const placeholders = cols.map(col => {
        params.push(coerceValue(row[col]));
        return `$${params.length}`;
      });
      valueRows.push(`(${placeholders.join(', ')})`);
    }

    const quotedCols = cols.map(c => `"${c}"`).join(', ');
    const query = `INSERT INTO "${tableName}" (${quotedCols}) VALUES ${valueRows.join(', ')} ON CONFLICT DO NOTHING`;
    await targetPool.query(query, params);
    migrated += batch.length;
    console.log(`[${tableName}] ${migrated}/${rows.length} migrated...`);
  }

  return { table: tableName, migrated };
}

async function run() {
  const dumpPath = path.join(__dirname, '../schema_dump.json');
  if (!fs.existsSync(dumpPath)) {
    throw new Error(
      `${dumpPath} not found. Run "node scripts/introspectMssqlSchema.js" first to compute table order.`
    );
  }
  const dump = JSON.parse(fs.readFileSync(dumpPath, 'utf8'));

  console.log(`Connecting to source MSSQL at ${sourceConfig.server}/${sourceConfig.database}...`);
  const sourcePool = await mssql.connect(sourceConfig);

  console.log(`Connecting to target PostgreSQL at ${process.env.TARGET_DB_HOST}/${process.env.TARGET_DB_DATABASE}...`);
  await targetPool.query('SELECT 1');

  let orderedTables = topoSort(dump.tables, dump.fks);
  if (onlyTables) {
    orderedTables = orderedTables.filter(t => onlyTables.includes(t));
  }

  console.log(`\nMigration order (${orderedTables.length} tables):`, orderedTables.join(', '));
  if (dryRun) console.log('--dry-run: counting rows only, no writes will happen.\n');

  const results = [];
  for (const table of orderedTables) {
    const columnsForTable = dump.columns
      .filter(c => c.TABLE_NAME === table)
      .sort((a, b) => a.ORDINAL_POSITION - b.ORDINAL_POSITION)
      .map(c => c.COLUMN_NAME);

    try {
      const result = await migrateTable(sourcePool, table, columnsForTable);
      results.push(result);
    } catch (err) {
      console.error(`[${table}] FAILED:`, err.message);
      results.push({ table, error: err.message });
    }
  }

  console.log('\n--- Migration summary ---');
  console.table(results);

  await mssql.close();
  await targetPool.end();
}

run()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Fatal error during migration:', err);
    process.exit(1);
  });
