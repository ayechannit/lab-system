const sql = require('mssql');
require('dotenv').config();

function isIpAddress(host) {
  if (!host) return false;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return true;
  return host.includes(':');
}

const server = process.env.DB_SERVER;
const encrypt = process.env.DB_ENCRYPT !== 'false';
const trustServerCertificate =
  process.env.DB_TRUST_SERVER_CERTIFICATE === 'true';

const options = {
  encrypt,
  trustServerCertificate,
};

// Node.js 20+ rejects an IP as TLS servername; tedious defaults to DB_SERVER.
const tlsServerName = process.env.DB_TLS_SERVER_NAME;
if (tlsServerName) {
  options.serverName = tlsServerName;
} else if (encrypt && isIpAddress(server)) {
  options.serverName = 'sqlserver';
  if (!trustServerCertificate) {
    console.warn(
      'DB_SERVER is an IP address: set DB_TLS_SERVER_NAME to the certificate hostname ' +
        'and/or DB_TRUST_SERVER_CERTIFICATE=true for encrypted connections.',
    );
  }
}

const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server,
  database: process.env.DB_DATABASE,
  options,
};

const poolPromise = new sql.ConnectionPool(dbConfig)
  .connect()
  .then((pool) => {
    console.log('Connected to MSSQL');
    return pool;
  })
  .catch((err) => {
    console.error('Database Connection Failed! Bad Config: ', err);
    throw err;
  });

module.exports = {
  sql,
  poolPromise,
};
