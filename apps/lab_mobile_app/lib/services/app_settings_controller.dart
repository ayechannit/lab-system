import 'package:flutter/material.dart';

import '../models/lab_system_settings.dart';
import 'system_settings_api.dart';

/// Loads lab branding/theme from the backend (same source as admin System settings).
class AppSettingsController extends ChangeNotifier {
  AppSettingsController({required String baseUrl})
      : _api = SystemSettingsApi(baseUrl: baseUrl);

  final SystemSettingsApi _api;

  LabSystemSettings _settings = LabSystemSettings.defaults();
  bool _loading = false;
  String? _loadError;

  LabSystemSettings get settings => _settings;
  bool get loading => _loading;
  String? get loadError => _loadError;

  String get labName => _settings.labName;
  String? get logoUrl => _settings.logoUrl;
  String? get uiLocale => _settings.uiLocale;
  ThemeMode get themeMode => _settings.isDarkTheme ? ThemeMode.dark : ThemeMode.light;

  Future<void> load() async {
    _loading = true;
    _loadError = null;
    notifyListeners();
    try {
      _settings = await _api.fetchSettings();
      _loadError = null;
    } catch (e) {
      _loadError = e.toString();
      _settings = LabSystemSettings.defaults();
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  Future<void> refresh() => load();
}
