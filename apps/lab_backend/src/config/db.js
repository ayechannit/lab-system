const { Pool } = require('pg');
require('dotenv').config();

const useSsl = process.env.DB_SSL === 'true';
const ssl = useSsl
  ? { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false' }
  : false;

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  ssl,
  // The app runs as a Vercel serverless function talking to Supabase's pgbouncer
  // transaction pooler (port 6543). Each function instance handles requests
  // ~one at a time, so a large per-instance pool just eats pgbouncer's shared
  // connection budget across concurrent instances. Keep it small, recycle idle
  // clients fast, and fail fast instead of hanging forever when exhausted.
  max: process.env.DB_POOL_MAX ? Number(process.env.DB_POOL_MAX) : 5,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 10000,
  allowExitOnIdle: true,
});

const poolPromise = pool
  .connect()
  .then((client) => {
    client.release();
    console.log('Connected to PostgreSQL');
    return pool;
  })
  .catch((err) => {
    console.error('Database Connection Failed! Bad Config: ', err);
    throw err;
  });

// Every real caller does `const pool = await poolPromise` inside a try/catch
// (see any controller), so rejections are still handled there. But at module
// load nothing has attached a handler yet, and a transient connect hiccup
// (finite connectionTimeoutMillis now makes this a rejection, not a hang)
// would otherwise surface as an unhandled rejection and crash the whole
// process before a single request arrives. Swallow it here so it doesn't.
poolPromise.catch(() => {});

module.exports = {
  pool,
  poolPromise,
};
