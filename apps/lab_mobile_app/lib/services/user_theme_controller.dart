import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../theme/app_theme_presets.dart';

const _themeKey = 'user_theme_preset';

/// Personal theme choice stored on device (overrides server default after user picks).
class UserThemeController extends ChangeNotifier {
  UserThemeController() {
    _load();
  }

  AppThemePresetId? _override;
  bool _ready = false;

  AppThemePresetId? get override => _override;
  bool get ready => _ready;

  AppThemePresetId effectivePreset(AppThemePresetId serverDefault) {
    return _override ?? serverDefault;
  }

  Future<void> _load() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final saved = prefs.getString(_themeKey);
      _override = _parsePreset(saved);
    } catch (_) {
      _override = null;
    } finally {
      _ready = true;
      notifyListeners();
    }
  }

  Future<void> setPreset(AppThemePresetId preset) async {
    _override = preset;
    notifyListeners();
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_themeKey, preset.name);
    } catch (_) {
      /* ignore */
    }
  }

  static AppThemePresetId? _parsePreset(String? value) {
    switch (value) {
      case 'light':
        return AppThemePresetId.light;
      case 'dark':
        return AppThemePresetId.dark;
      case 'idhc':
        return AppThemePresetId.idhc;
      default:
        return null;
    }
  }
}
