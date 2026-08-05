import 'package:shared_preferences/shared_preferences.dart';

/// Persists JWT on device so sessions survive app restarts and page refresh.
abstract final class AuthSessionStorage {
  static const _tokenKey = 'lab_patient_access_token';
  static const _rememberKey = 'lab_patient_remember_me';
  static const _phoneKey = 'lab_patient_remembered_phone';

  static Future<void> saveSession({
    required String token,
    required bool remember,
    String? phone,
  }) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_rememberKey, remember);
    await prefs.setString(_tokenKey, token.trim());
    final trimmed = phone?.trim();
    if (remember && trimmed != null && trimmed.isNotEmpty) {
      await prefs.setString(_phoneKey, trimmed);
    } else {
      await prefs.remove(_phoneKey);
    }
  }

  static Future<String?> readAccessToken() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString(_tokenKey);
    if (token == null || token.trim().isEmpty) return null;
    return token.trim();
  }

  static Future<bool> readRememberPreference() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool(_rememberKey) ?? true;
  }

  static Future<String?> readRememberedPhone() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_phoneKey);
  }

  /// Drop token after expiry while keeping phone / remember preference for the login form.
  static Future<void> clearAccessToken() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_tokenKey);
  }

  static Future<void> clear() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_tokenKey);
    await prefs.remove(_rememberKey);
    await prefs.remove(_phoneKey);
  }
}
