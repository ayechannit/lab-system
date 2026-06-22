const { sql, poolPromise } = require('../config/db');

class PasswordReset {
  /**
   * Create a new password reset entry, clearing any old codes for the same email.
   * @param {string} email 
   * @param {string} token - The 6-digit reset PIN code
   * @param {string} userType - 'user' or 'staff'
   */
  static async create(email, token, userType) {
    const pool = await poolPromise;
    
    // 1. Delete previous pending codes for this email to prevent spam/clashing
    await pool.request()
      .input('email', sql.NVarChar(255), email)
      .query('DELETE FROM password_resets WHERE email = @email');

    // 2. Insert new reset code expiring in 15 minutes
    const result = await pool.request()
      .input('email', sql.NVarChar(255), email)
      .input('token', sql.NVarChar(100), token)
      .input('user_type', sql.NVarChar(50), userType)
      .query(`
        INSERT INTO password_resets (id, email, token, user_type, expires_at, created_at)
        VALUES (NEWID(), @email, @token, @user_type, DATEADD(minute, 15, GETDATE()), GETDATE())
      `);
    return result.rowsAffected[0] > 0;
  }

  /**
   * Verify if a reset code is valid and not expired.
   * @param {string} email 
   * @param {string} token 
   */
  static async verify(email, token) {
    const pool = await poolPromise;
    const queryResult = await pool.request()
      .input('email', sql.NVarChar(255), email)
      .input('token', sql.NVarChar(100), token)
      .query(`
        SELECT TOP 1 email, token, user_type, expires_at 
        FROM password_resets 
        WHERE email = @email AND token = @token AND expires_at > GETDATE()
      `);
    return queryResult.recordset[0] || null;
  }

  /**
   * Clear all codes for a specific email.
   * @param {string} email 
   */
  static async deleteByEmail(email) {
    const pool = await poolPromise;
    await pool.request()
      .input('email', sql.NVarChar(255), email)
      .query('DELETE FROM password_resets WHERE email = @email');
  }
}

module.exports = PasswordReset;
