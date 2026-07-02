import '../theme/app_theme_presets.dart';

/// Lab-wide settings from `GET /api/system-settings` (configured in admin web).
class LabSystemSettings {
  const LabSystemSettings({
    this.id,
    required this.labName,
    required this.themePreset,
    this.logoUrl,
    this.primaryColorHex,
    this.secondaryColorHex,
    this.address,
    this.contactPhone,
    this.contactEmail,
    this.latitude,
    this.longitude,
    this.uiLocale,
  });

  final String? id;
  final String labName;
  final AppThemePresetId themePreset;
  final String? logoUrl;
  final String? primaryColorHex;
  final String? secondaryColorHex;
  final String? address;
  final String? contactPhone;
  final String? contactEmail;
  final double? latitude;
  final double? longitude;
  final String? uiLocale;

  bool get isDarkTheme => themePreset == AppThemePresetId.dark;

  factory LabSystemSettings.fromJson(Map<String, dynamic>? json) {
    if (json == null) return LabSystemSettings.defaults();
    final mode = (json['mode'] ?? 'light').toString();
    return LabSystemSettings(
      id: json['id']?.toString(),
      labName: (json['lab_name'] ?? 'International Diagnostic & Healthcare Center').toString().trim().isEmpty
          ? 'International Diagnostic & Healthcare Center'
          : json['lab_name'].toString().trim(),
      themePreset: normalizeThemePresetId(mode),
      logoUrl: _nullableString(json['logo_url']),
      primaryColorHex: _nullableString(json['primary_color']),
      secondaryColorHex: _nullableString(json['secondary_color']),
      address: _nullableString(json['address']),
      contactPhone: _nullableString(json['contact_phone']),
      contactEmail: _nullableString(json['contact_email']),
      latitude: _toDouble(json['latitude']),
      longitude: _toDouble(json['longitude']),
      uiLocale: _normalizeUiLocale(json['ui_locale']),
    );
  }

  static String? _normalizeUiLocale(dynamic v) {
    final code = v?.toString().trim().toLowerCase();
    if (code == 'my') return 'my';
    if (code == 'en') return 'en';
    return null;
  }

  factory LabSystemSettings.defaults() => const LabSystemSettings(
        labName: 'International Diagnostic & Healthcare Center',
        themePreset: AppThemePresetId.idhc,
        uiLocale: 'my',
      );

  LabSystemSettings copyWith({
    String? id,
    String? labName,
    AppThemePresetId? themePreset,
    String? logoUrl,
    String? primaryColorHex,
    String? secondaryColorHex,
    String? address,
    String? contactPhone,
    String? contactEmail,
    double? latitude,
    double? longitude,
    String? uiLocale,
  }) {
    return LabSystemSettings(
      id: id ?? this.id,
      labName: labName ?? this.labName,
      themePreset: themePreset ?? this.themePreset,
      logoUrl: logoUrl ?? this.logoUrl,
      primaryColorHex: primaryColorHex ?? this.primaryColorHex,
      secondaryColorHex: secondaryColorHex ?? this.secondaryColorHex,
      address: address ?? this.address,
      contactPhone: contactPhone ?? this.contactPhone,
      contactEmail: contactEmail ?? this.contactEmail,
      latitude: latitude ?? this.latitude,
      longitude: longitude ?? this.longitude,
      uiLocale: uiLocale ?? this.uiLocale,
    );
  }

  static String? _nullableString(dynamic v) {
    if (v == null) return null;
    final s = v.toString().trim();
    return s.isEmpty ? null : s;
  }

  static double? _toDouble(dynamic v) {
    if (v == null || v == '') return null;
    if (v is num) return v.toDouble();
    return double.tryParse(v.toString());
  }
}
