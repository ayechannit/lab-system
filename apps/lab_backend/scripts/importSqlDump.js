/**
 * One-time data migration: parses an SSMS-generated "Schema and data" (or
 * "Data only") .sql dump of the source MSSQL database and loads its INSERT
 * data into the target PostgreSQL database (schema already created via
 * postgres_schema.sql / applySchema.js).
 *
 * Why this exists instead of a live MSSQL connection: the production MSSQL
 * host (47.130.116.245) is not reliably reachable from this dev machine, so
 * the data was exported by hand via SSMS's Generate Scripts wizard on a
 * machine that does have access, then copied here as a .sql file.
 *
 * The dump uses standard SSMS conventions this parser understands:
 *   - Batches separated by standalone "GO" lines
 *   - `INSERT [dbo].[table] ([col], ...) VALUES (val, ...)` (no "INTO")
 *   - `N'...'` string literals with '' as the escaped quote
 *   - `CAST(x AS SomeType(...))` wrapping (unwrapped, inner literal kept)
 *   - `[bracketed]` identifiers
 * Column types are read from the dump's own CREATE TABLE statements so bit
 * columns (MSSQL has no real boolean literal) convert 0/1 -> false/true
 * correctly for Postgres.
 *
 * Usage (from apps/lab_backend), reading the target from TARGET_DB_* in .env:
 *   node scripts/importSqlDump.js --file="D:\path\to\dump.sql" --dry-run
 *   node scripts/importSqlDump.js --file="D:\path\to\dump.sql"
 *
 * --dry-run only parses and prints row counts per table; no DB connection,
 * no writes. Without it, the script TRUNCATEs every table in the target
 * database (this is meant for the initial one-time load onto an empty
 * Postgres target) and then inserts every parsed row in FK-safe order.
 */
const fs = require('fs');
const { Pool } = require('pg');
require('dotenv').config();

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const fileArg = args.find(a => a.startsWith('--file='));
const filePath = fileArg ? fileArg.slice('--file='.length).replace(/^"|"$/g, '') : null;

if (!filePath) {
  console.error('Usage: node scripts/importSqlDump.js --file=<path-to-ssms-dump.sql> [--dry-run]');
  process.exit(1);
}

const TSQL_TYPE_CATEGORY = {
  uniqueidentifier: 'uuid',
  nvarchar: 'text', varchar: 'text', nchar: 'text', char: 'text', text: 'text', ntext: 'text',
  bit: 'boolean',
  datetime2: 'timestamp', datetime: 'timestamp', smalldatetime: 'timestamp', date: 'timestamp',
  decimal: 'numeric', numeric: 'numeric', money: 'numeric', smallmoney: 'numeric',
  int: 'int', bigint: 'int', smallint: 'int', tinyint: 'int',
  float: 'float', real: 'float',
};

// FK-safe insert order, derived from the dump's own FOREIGN KEY constraints
// (parents before children). Tables not listed have no dependents/dependencies.
const TABLE_ORDER = [
  'users', 'lab_staff', 'lab_test_catalog', 'service_geofences', 'material_fees',
  'membership_tiers', 'point_settings', 'point_redemption_settings', 'role_permissions',
  'ai_configs', 'ai_prompts', 'theme_settings', 'advertisements', 'notifications',
  'conversation_history', 'point_transactions', 'lab_orders', 'test_referral_fees',
  'test_specific_discounts', 'lab_order_items', 'order_schedules', 'order_status_logs',
  'payments', 'order_ratings', 'lab_results', 'ai_quality_checks',
];

function parseSchema(sql) {
  const typeMap = {};
  const tableRe = /CREATE TABLE \[dbo\]\.\[(\w+)\]\(([\s\S]*?)\r?\n\) ON \[PRIMARY\]/g;
  let m;
  while ((m = tableRe.exec(sql))) {
    const table = m[1];
    const cols = {};
    for (const line of m[2].split(/\r?\n/)) {
      const colMatch = /^\t\[(\w+)\]\s+\[(\w+)\]/.exec(line);
      if (colMatch) {
        cols[colMatch[1]] = TSQL_TYPE_CATEGORY[colMatch[2].toLowerCase()] || 'text';
      }
    }
    typeMap[table] = cols;
  }
  return typeMap;
}

/** Split a comma-separated arg list, respecting parens and '...'-quoted strings (which may span lines). */
function splitArgs(str) {
  const args = [];
  let depth = 0;
  let inStr = false;
  let cur = '';
  for (let i = 0; i < str.length; i++) {
    const c = str[i];
    if (inStr) {
      cur += c;
      if (c === "'") {
        if (str[i + 1] === "'") { cur += "'"; i++; } else inStr = false;
      }
      continue;
    }
    if (c === "'") { inStr = true; cur += c; continue; }
    if (c === '(') { depth++; cur += c; continue; }
    if (c === ')') { depth--; cur += c; continue; }
    if (c === ',' && depth === 0) { args.push(cur); cur = ''; continue; }
    cur += c;
  }
  if (cur.trim() !== '') args.push(cur);
  return args.map(a => a.trim());
}

function convertValue(raw, category) {
  raw = raw.trim();
  if (/^NULL$/i.test(raw)) return null;

  const castMatch = /^CAST\(([\s\S]*)\s+AS\s+[\w.]+(?:\([^)]*\))?\)$/i.exec(raw);
  if (castMatch) raw = castMatch[1].trim();

  if (category === 'boolean') return raw === '1';

  let s = raw;
  if (/^N'/i.test(s)) s = s.slice(1);
  if (s.startsWith("'") && s.endsWith("'")) s = s.slice(1, -1).replace(/''/g, "'");

  if (category === 'timestamp') {
    // MSSQL datetime2(7) has 7 fractional digits; Postgres timestamptz caps at 6 (microseconds).
    return s.replace(/(\.\d{6})\d+/, '$1');
  }
  return s; // uuid/text/numeric/int/float pass through as text; pg casts per target column
}

function parseInserts(sql, typeMap) {
  const rowsByTable = {};
  const batches = sql.split(/^GO\r?$/m);
  for (const batchRaw of batches) {
    const batch = batchRaw.trim();
    if (!batch.startsWith('INSERT [dbo].[')) continue;

    const m = /^INSERT \[dbo\]\.\[(\w+)\]\s*\(([^)]*)\)\s*VALUES\s*\(([\s\S]*)\)\s*$/.exec(batch);
    if (!m) {
      console.warn('Could not parse INSERT statement (skipped):', batch.slice(0, 120));
      continue;
    }
    const [, table, colListRaw, valuesRaw] = m;
    const cols = colListRaw.split(',').map(c => c.trim().replace(/^\[|\]$/g, ''));
    const rawValues = splitArgs(valuesRaw);
    if (rawValues.length !== cols.length) {
      console.warn(`Column/value count mismatch in ${table} (skipped): ${cols.length} cols vs ${rawValues.length} values`);
      continue;
    }
    const types = typeMap[table] || {};
    const values = rawValues.map((raw, i) => convertValue(raw, types[cols[i]] || 'text'));

    if (!rowsByTable[table]) rowsByTable[table] = { cols, rows: [] };
    rowsByTable[table].rows.push(values);
  }
  return rowsByTable;
}

async function run() {
  const sql = fs.readFileSync(filePath, 'utf8');
  const typeMap = parseSchema(sql);
  const rowsByTable = parseInserts(sql, typeMap);

  console.log('Parsed row counts:');
  for (const [table, { rows }] of Object.entries(rowsByTable)) {
    console.log(`  ${table}: ${rows.length}`);
  }
  const leftover = Object.keys(rowsByTable).filter(t => !TABLE_ORDER.includes(t));
  if (leftover.length > 0) {
    console.warn('\nWARNING: tables found in dump but not in TABLE_ORDER (would be skipped):', leftover.join(', '));
  }

  if (dryRun) {
    console.log('\n--dry-run: no database connection made, no writes performed.');
    return;
  }

  const targetSsl = process.env.TARGET_DB_SSL === 'true'
    ? { rejectUnauthorized: process.env.TARGET_DB_SSL_REJECT_UNAUTHORIZED !== 'false' }
    : false;

  const pool = new Pool({
    host: process.env.TARGET_DB_HOST,
    port: process.env.TARGET_DB_PORT ? Number(process.env.TARGET_DB_PORT) : 5432,
    user: process.env.TARGET_DB_USER,
    password: process.env.TARGET_DB_PASSWORD,
    database: process.env.TARGET_DB_DATABASE,
    ssl: targetSsl,
  });

  console.log(`\nConnecting to target PostgreSQL at ${process.env.TARGET_DB_HOST}/${process.env.TARGET_DB_DATABASE}...`);
  await pool.query('SELECT 1');

  console.log('Truncating all target tables for a clean import...');
  const allTables = (await pool.query(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`
  )).rows.map(r => r.table_name);
  if (allTables.length > 0) {
    await pool.query(`TRUNCATE TABLE ${allTables.map(t => `"${t}"`).join(', ')} CASCADE`);
  }

  const results = [];
  for (const table of TABLE_ORDER) {
    const data = rowsByTable[table];
    if (!data || data.rows.length === 0) continue;

    const { cols, rows } = data;
    const quotedCols = cols.map(c => `"${c}"`).join(', ');
    let inserted = 0;
    for (const row of rows) {
      const placeholders = row.map((_, i) => `$${i + 1}`).join(', ');
      try {
        await pool.query(`INSERT INTO "${table}" (${quotedCols}) VALUES (${placeholders})`, row);
        inserted++;
      } catch (err) {
        console.error(`[${table}] row failed:`, err.message);
      }
    }
    console.log(`[${table}] inserted ${inserted}/${rows.length}`);
    results.push({ table, inserted, total: rows.length });
  }

  console.log('\n--- Import summary ---');
  console.table(results);

  await pool.end();
}

run().catch(err => {
  console.error('Fatal error during import:', err);
  process.exit(1);
});
