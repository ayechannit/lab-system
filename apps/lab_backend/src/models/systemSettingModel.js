const { sql, poolPromise } = require('../config/db');

const FIXED_LAB_NAME = 'International Diagnostic & Healthcare Center';

const THEME_PRESETS = {
  light: {
    mode: 'light',
    primary_color: '#003d9b',
    secondary_color: '#0d8a5b',
    custom_colors: null,
  },
  dark: {
    mode: 'dark',
    primary_color: '#6b9fff',
    secondary_color: '#34d399',
    custom_colors: null,
  },
  idhc: {
    mode: 'idhc',
    primary_color: '#e03a2c',
    secondary_color: '#f4b12a',
    custom_colors: null,
  },
};

class SystemSetting {
  static normalizeThemeMode(mode) {
    if (mode === 'dark') return 'dark';
    if (mode === 'idhc') return 'idhc';
    return 'light';
  }

  static lockBranding(data) {
    return {
      ...data,
      lab_name: FIXED_LAB_NAME,
      logo_url: null,
    };
  }

  static applyThemePreset(data) {
    const themeId = this.normalizeThemeMode(data?.mode);
    const preset = THEME_PRESETS[themeId];
    return this.lockBranding({
      ...data,
      mode: preset.mode,
      primary_color: preset.primary_color,
      secondary_color: preset.secondary_color,
      custom_colors: null,
    });
  }

  static toUpdatePayload(row) {
    return {
      lab_name: row.lab_name,
      mode: row.mode,
      logo_url: row.logo_url,
      primary_color: row.primary_color,
      secondary_color: row.secondary_color,
      custom_colors: row.custom_colors,
      latitude: row.latitude,
      longitude: row.longitude,
      address: row.address,
      contact_phone: row.contact_phone,
      contact_email: row.contact_email,
    };
  }

  static defaultUpdatePayload(overrides = {}) {
    return this.lockBranding({
      mode: 'light',
      primary_color: '#003d9b',
      secondary_color: '#0d8a5b',
      custom_colors: null,
      latitude: null,
      longitude: null,
      address: null,
      contact_phone: null,
      contact_email: null,
      ...overrides,
    });
  }

  static async getSettings() {
    const pool = await poolPromise;
    const request = pool.request();
    const result = await request.query('SELECT TOP 1 * FROM theme_settings');
    return result.recordset[0];
  }

  static async updateSettings(data, updatedBy = null) {
    const themed = this.applyThemePreset(data);
    const pool = await poolPromise;
    const request = pool.request();
    
    // Get existing settings first to see if we need to insert or update
    const existing = await this.getSettings();

    request.input('lab_name', sql.NVarChar(255), themed.lab_name);
    request.input('mode', sql.NVarChar(20), themed.mode);
    request.input('logo_url', sql.NVarChar(2048), themed.logo_url);
    request.input('primary_color', sql.NVarChar(50), themed.primary_color);
    request.input('secondary_color', sql.NVarChar(50), themed.secondary_color);
    request.input('custom_colors', sql.NVarChar(sql.MAX), themed.custom_colors);
    request.input('latitude', sql.Float, themed.latitude);
    request.input('longitude', sql.Float, themed.longitude);
    request.input('address', sql.NVarChar(sql.MAX), themed.address);
    request.input('contact_phone', sql.NVarChar(50), themed.contact_phone);
    request.input('contact_email', sql.NVarChar(255), themed.contact_email);
    request.input('updated_user', sql.UniqueIdentifier, updatedBy);

    if (existing) {
      request.input('id', sql.UniqueIdentifier, existing.id);
      const query = `
        UPDATE theme_settings
        SET lab_name = @lab_name, mode = @mode, logo_url = @logo_url, primary_color = @primary_color,
            secondary_color = @secondary_color, custom_colors = @custom_colors, latitude = @latitude, longitude = @longitude,
            address = @address, contact_phone = @contact_phone, contact_email = @contact_email,
            updated_user = @updated_user, updated_at = GETDATE()
        OUTPUT INSERTED.*
        WHERE id = @id
      `;
      const result = await request.query(query);
      return result.recordset[0];
    } else {
      const query = `
        INSERT INTO theme_settings (lab_name, mode, logo_url, primary_color, secondary_color, custom_colors, latitude, longitude, address, contact_phone, contact_email, updated_user)
        OUTPUT INSERTED.*
        VALUES (@lab_name, @mode, @logo_url, @primary_color, @secondary_color, @custom_colors, @latitude, @longitude, @address, @contact_phone, @contact_email, @updated_user)
      `;
      const result = await request.query(query);
      return result.recordset[0];
    }
  }
}

module.exports = SystemSetting;
