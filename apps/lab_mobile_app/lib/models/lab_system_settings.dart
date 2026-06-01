/// Lab-wide settings from `GET /api/system-settings` (configured in admin web).
class LabSystemSettings {
  const LabSystemSettings({
    this.id,
    required this.labName,
    required this.isDarkTheme,
    this.logoUrl,
    this.primaryColorHex,
    this.secondaryColorHex,
    this.address,
    this.contactPhone,
    this.contactEmail,
    this.latitude,
    this.longitude,
  });

  final String? id;
  final String labName;
  final bool isDarkTheme;
  final String? logoUrl;
  final String? primaryColorHex;
  final String? secondaryColorHex;
  final String? address;
  final String? contactPhone;
  final String? contactEmail;
  final double? latitude;
  final double? longitude;

  factory LabSystemSettings.fromJson(Map<String, dynamic>? json) {
    if (json == null) return LabSystemSettings.defaults();
    final mode = (json['mode'] ?? 'light').toString().toLowerCase();
    return LabSystemSettings(
      id: json['id']?.toString(),
      labName: (json['lab_name'] ?? 'MedLab Smart').toString().trim().isEmpty
          ? 'MedLab Smart'
          : json['lab_name'].toString().trim(),
      isDarkTheme: mode == 'dark',
      logoUrl: _nullableString(json['logo_url']),
      primaryColorHex: _nullableString(json['primary_color']),
      secondaryColorHex: _nullableString(json['secondary_color']),
      address: _nullableString(json['address']),
      contactPhone: _nullableString(json['contact_phone']),
      contactEmail: _nullableString(json['contact_email']),
      latitude: _toDouble(json['latitude']),
      longitude: _toDouble(json['longitude']),
    );
  }

  factory LabSystemSettings.defaults() => const LabSystemSettings(
        labName: 'MedLab Smart',
        isDarkTheme: false,
      );

  LabSystemSettings copyWith({
    String? id,
    String? labName,
    bool? isDarkTheme,
    String? logoUrl,
    String? primaryColorHex,
    String? secondaryColorHex,
    String? address,
    String? contactPhone,
    String? contactEmail,
    double? latitude,
    double? longitude,
  }) {
    return LabSystemSettings(
      id: id ?? this.id,
      labName: labName ?? this.labName,
      isDarkTheme: isDarkTheme ?? this.isDarkTheme,
      logoUrl: logoUrl ?? this.logoUrl,
      primaryColorHex: primaryColorHex ?? this.primaryColorHex,
      secondaryColorHex: secondaryColorHex ?? this.secondaryColorHex,
      address: address ?? this.address,
      contactPhone: contactPhone ?? this.contactPhone,
      contactEmail: contactEmail ?? this.contactEmail,
      latitude: latitude ?? this.latitude,
      longitude: longitude ?? this.longitude,
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
