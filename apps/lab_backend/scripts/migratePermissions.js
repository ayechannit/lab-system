const { poolPromise } = require('../src/config/db');
const Permission = require('../src/models/permissionModel');

async function run() {
  const pool = await poolPromise;
  console.log('Connected to Database. Checking role_permissions table...');

  await pool.request().query(`
    IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[role_permissions]') AND type in (N'U'))
    BEGIN
      CREATE TABLE role_permissions (
          id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
          role NVARCHAR(20) NOT NULL CHECK (role IN ('manager', 'reception', 'lab_technician', 'collector')),
          module_key NVARCHAR(50) NOT NULL,
          is_allowed BIT NOT NULL DEFAULT 0,
          updated_user UNIQUEIDENTIFIER,
          updated_at DATETIME2 DEFAULT GETDATE(),
          CONSTRAINT UQ_RolePermissions_Role_Module UNIQUE (role, module_key)
      );
    END
  `);
  console.log('Checked role_permissions table (ensured exists).');

  const countResult = await pool.request().query('SELECT COUNT(*) as count FROM role_permissions');
  if (countResult.recordset[0].count > 0) {
    console.log('role_permissions already seeded — leaving existing rows untouched.');
    process.exit(0);
    return;
  }

  const entries = [];
  for (const role of Permission.CONFIGURABLE_ROLES) {
    for (const moduleKey of Permission.MODULES) {
      const allowed = (await Permission.getAllowedModulesForRole(role)).includes(moduleKey);
      entries.push({ role, module_key: moduleKey, is_allowed: allowed });
    }
  }
  await Permission.setMatrix(entries, null);
  console.log(`Seeded default role_permissions matrix (${entries.length} rows).`);
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Error during permissions migration:', err);
    process.exit(1);
  });
