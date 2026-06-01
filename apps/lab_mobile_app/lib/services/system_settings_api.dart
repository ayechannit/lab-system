import 'dart:convert';

import 'package:http/http.dart' as http;

import '../models/lab_system_settings.dart';

class SystemSettingsApi {
  SystemSettingsApi({required String baseUrl}) : _base = _normalizeBase(baseUrl);

  final String _base;

  static String _normalizeBase(String b) {
    var s = b.trim();
    while (s.endsWith('/')) {
      s = s.substring(0, s.length - 1);
    }
    return s;
  }

  Future<LabSystemSettings> fetchSettings() async {
    final uri = Uri.parse('$_base/api/system-settings');
    final res = await http.get(uri, headers: {'Accept': 'application/json'});
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw Exception('Could not load lab settings (${res.statusCode})');
    }
    final decoded = jsonDecode(res.body);
    LabSystemSettings settings;
    if (decoded is Map<String, dynamic>) {
      settings = LabSystemSettings.fromJson(decoded);
    } else if (decoded is Map) {
      settings = LabSystemSettings.fromJson(Map<String, dynamic>.from(decoded));
    } else {
      return LabSystemSettings.defaults();
    }
    return settings.copyWith(logoUrl: resolveLogoDisplayUrl(settings.logoUrl, apiBase: _base));
  }

  /// Same rules as admin web: `/uploads/...` paths need the API origin.
  static String? resolveLogoDisplayUrl(String? logoUrl, {required String apiBase}) {
    final u = (logoUrl ?? '').trim();
    if (u.isEmpty) return null;
    if (u.startsWith('data:') || u.startsWith('http://') || u.startsWith('https://')) return u;
    if (u.startsWith('/')) return '$apiBase$u';
    return u;
  }
}
