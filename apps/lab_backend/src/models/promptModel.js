const { sql, poolPromise } = require('../config/db');

class Prompt {
  static async getAll() {
    const pool = await poolPromise;
    const request = pool.request();
    const query = 'SELECT * FROM ai_prompts WHERE is_deleted = 0 ORDER BY created_at DESC';
    const result = await request.query(query);
    return result.recordset;
  }

  static async getById(id) {
    const pool = await poolPromise;
    const request = pool.request();
    request.input('id', sql.UniqueIdentifier, id);
    const result = await request.query('SELECT * FROM ai_prompts WHERE id = @id AND is_deleted = 0');
    return result.recordset[0];
  }

  static async create(data, createdBy = null) {
    const pool = await poolPromise;
    const request = pool.request();
    request.input('name', sql.NVarChar(255), data.name);
    request.input('prompt_text', sql.NVarChar(sql.MAX), data.prompt_text);
    request.input('created_user', sql.UniqueIdentifier, createdBy);

    const query = `
      INSERT INTO ai_prompts (name, prompt_text, created_user, updated_user)
      OUTPUT INSERTED.*
      VALUES (@name, @prompt_text, @created_user, @created_user)
    `;
    const result = await request.query(query);
    return result.recordset[0];
  }

  static async update(id, data, updatedBy = null) {
    const pool = await poolPromise;
    const request = pool.request();
    request.input('id', sql.UniqueIdentifier, id);
    request.input('name', sql.NVarChar(255), data.name);
    request.input('prompt_text', sql.NVarChar(sql.MAX), data.prompt_text);
    request.input('updated_user', sql.UniqueIdentifier, updatedBy);

    const query = `
      UPDATE ai_prompts
      SET name = @name, prompt_text = @prompt_text,
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
      UPDATE ai_prompts 
      SET is_deleted = 1, updated_user = @updated_user, updated_at = GETDATE() 
      WHERE id = @id
    `;
    const result = await request.query(query);
    return result.rowsAffected[0] > 0;
  }
}

module.exports = Prompt;
