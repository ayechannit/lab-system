const { sql, poolPromise } = require('../config/db');

class AiConfig {
  static async getAll() {
    const pool = await poolPromise;
    const request = pool.request();
    const query = 'SELECT * FROM ai_configs WHERE is_deleted = 0 ORDER BY created_at DESC';
    const result = await request.query(query);
    return result.recordset;
  }

  static async getById(id) {
    const pool = await poolPromise;
    const request = pool.request();
    request.input('id', sql.UniqueIdentifier, id);
    const result = await request.query('SELECT * FROM ai_configs WHERE id = @id AND is_deleted = 0');
    return result.recordset[0];
  }

  static async create(data, createdBy = null) {
    const pool = await poolPromise;
    const request = pool.request();
    request.input('model_name', sql.NVarChar(255), data.model_name);
    request.input('api_key', sql.NVarChar(sql.MAX), data.api_key);
    request.input('type', sql.NVarChar(50), data.type);
    request.input('created_user', sql.UniqueIdentifier, createdBy);

    const query = `
      INSERT INTO ai_configs (model_name, api_key, type, created_user, updated_user)
      OUTPUT INSERTED.*
      VALUES (@model_name, @api_key, @type, @created_user, @created_user)
    `;
    const result = await request.query(query);
    return result.recordset[0];
  }

  static async update(id, data, updatedBy = null) {
    const pool = await poolPromise;
    const request = pool.request();
    request.input('id', sql.UniqueIdentifier, id);
    request.input('model_name', sql.NVarChar(255), data.model_name);
    request.input('api_key', sql.NVarChar(sql.MAX), data.api_key);
    request.input('type', sql.NVarChar(50), data.type);
    request.input('updated_user', sql.UniqueIdentifier, updatedBy);

    const query = `
      UPDATE ai_configs
      SET model_name = @model_name, api_key = @api_key, type = @type,
          updated_user = @updated_user, updated_at = GETDATE()
      OUTPUT INSERTED.*
      WHERE id = @id AND is_deleted = 0
    `;
    const result = await request.query(query);
    return result.recordset[0];
  }

  static async delete(id, updatedBy = null) {
    const pool = await poolPromise;
    const request = pool.request();
    request.input('id', sql.UniqueIdentifier, id);
    request.input('updated_user', sql.UniqueIdentifier, updatedBy);
    
    const query = `
      UPDATE ai_configs 
      SET is_deleted = 1, updated_user = @updated_user, updated_at = GETDATE() 
      WHERE id = @id
    `;
    const result = await request.query(query);
    return result.rowsAffected[0] > 0;
  }
}

module.exports = AiConfig;
