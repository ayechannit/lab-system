import 'dart:convert';

import 'package:http/http.dart' as http;

/// OSM Nominatim (no API key). Use sparingly; include a stable User-Agent per their policy.
class NominatimGeocode {
  NominatimGeocode._();

  static const _userAgent = 'MedLabSmartMobile/1.0 (lab_patient_app)';

  static Future<String?> reverse(double lat, double lng) async {
    if (!lat.isFinite || !lng.isFinite) return null;
    final uri = Uri.parse('https://nominatim.openstreetmap.org/reverse').replace(
      queryParameters: <String, String>{
        'format': 'json',
        'lat': '$lat',
        'lon': '$lng',
      },
    );
    final res = await http.get(
      uri,
      headers: const {
        'Accept': 'application/json',
        'Accept-Language': 'en',
        'User-Agent': _userAgent,
      },
    );
    if (res.statusCode < 200 || res.statusCode >= 300) return null;
    try {
      final data = jsonDecode(res.body);
      if (data is! Map<String, dynamic>) return null;
      final line = data['display_name'];
      if (line is! String) return null;
      final t = line.trim();
      return t.isEmpty ? null : t;
    } catch (_) {
      return null;
    }
  }

  /// Forward search: free-text query → first hit coordinates (optional helper).
  static Future<({double lat, double lng, String? displayName})?> search(String query) async {
    final q = query.trim();
    if (q.length < 4) return null;
    final uri = Uri.parse('https://nominatim.openstreetmap.org/search').replace(
      queryParameters: <String, String>{
        'format': 'json',
        'limit': '1',
        'q': q,
      },
    );
    final res = await http.get(
      uri,
      headers: const {
        'Accept': 'application/json',
        'Accept-Language': 'en',
        'User-Agent': _userAgent,
      },
    );
    if (res.statusCode < 200 || res.statusCode >= 300) return null;
    try {
      final data = jsonDecode(res.body);
      if (data is! List || data.isEmpty) return null;
      final row = data.first;
      if (row is! Map<String, dynamic>) return null;
      final lat = double.tryParse('${row['lat'] ?? ''}');
      final lon = double.tryParse('${row['lon'] ?? ''}');
      if (lat == null || lon == null) return null;
      if (!lat.isFinite || !lon.isFinite) return null;
      final dn = row['display_name'];
      final displayName = dn is String && dn.trim().isNotEmpty ? dn.trim() : null;
      return (lat: lat, lng: lon, displayName: displayName);
    } catch (_) {
      return null;
    }
  }
}
