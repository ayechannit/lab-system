const { poolPromise } = require('../config/db');

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
  static normalizeUiLocale(value) {
    return value === 'en' ? 'en' : 'my';
  }

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
      ui_locale: this.normalizeUiLocale(row.ui_locale),
    };
  }

  static defaultUpdatePayload(overrides = {}) {
    return this.lockBranding({
      mode: 'idhc',
      primary_color: '#e03a2c',
      secondary_color: '#f4b12a',
      custom_colors: null,
      latitude: null,
      longitude: null,
      address: null,
      contact_phone: null,
      contact_email: null,
      ui_locale: 'my',
      ...overrides,
    });
  }

  static formatSettingsRow(row) {
    if (!row) return null;
    return {
      ...row,
      ui_locale: this.normalizeUiLocale(row.ui_locale),
    };
  }

  static async getSettings() {
    const pool = await poolPromise;
    const result = await pool.query('SELECT * FROM theme_settings LIMIT 1');
    return this.formatSettingsRow(result.rows[0]);
  }

  static async updateSettings(data, updatedBy = null) {
    const existing = await this.getSettings();
    const themed = this.applyThemePreset(data);
    const uiLocale =
      data?.ui_locale != null
        ? this.normalizeUiLocale(data.ui_locale)
        : existing?.ui_locale
          ? this.normalizeUiLocale(existing.ui_locale)
          : 'my';
    const pool = await poolPromise;

    const params = [
      themed.lab_name,
      themed.mode,
      themed.logo_url,
      themed.primary_color,
      themed.secondary_color,
      themed.custom_colors,
      themed.latitude,
      themed.longitude,
      themed.address,
      themed.contact_phone,
      themed.contact_email,
      uiLocale,
      updatedBy,
    ];

    if (existing) {
      params.push(existing.id);
      const result = await pool.query(
        `UPDATE theme_settings
         SET lab_name = $1, mode = $2, logo_url = $3, primary_color = $4,
             secondary_color = $5, custom_colors = $6, latitude = $7, longitude = $8,
             address = $9, contact_phone = $10, contact_email = $11,
             ui_locale = $12,
             updated_user = $13, updated_at = now()
         WHERE id = $14
         RETURNING *`,
        params
      );
      return this.formatSettingsRow(result.rows[0]);
    } else {
      const result = await pool.query(
        `INSERT INTO theme_settings (lab_name, mode, logo_url, primary_color, secondary_color, custom_colors, latitude, longitude, address, contact_phone, contact_email, ui_locale, updated_user)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         RETURNING *`,
        params
      );
      return this.formatSettingsRow(result.rows[0]);
    }
  }

  static async updateUiLocale(locale, updatedBy = null) {
    const existing = await this.getSettings();
    const uiLocale = this.normalizeUiLocale(locale);
    if (!existing) {
      return this.updateSettings({ ...this.defaultUpdatePayload(), ui_locale: uiLocale }, updatedBy);
    }
    return this.updateSettings({ ...this.toUpdatePayload(existing), ui_locale: uiLocale }, updatedBy);
  }
}

module.exports = SystemSetting;
