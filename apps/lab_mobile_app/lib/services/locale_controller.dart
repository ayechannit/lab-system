import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

const _localeKey = 'app_locale';

/// Supported app locales (`en`, `my`).
class LocaleController extends ChangeNotifier {
  LocaleController() {
    _load();
  }

  Locale _locale = const Locale('my');
  bool _ready = false;

  Locale get locale => _locale;
  bool get ready => _ready;

  Future<void> _load() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final saved = prefs.getString(_localeKey);
      if (saved == 'my') {
        _locale = const Locale('my');
      } else if (saved == 'en') {
        _locale = const Locale('en');
      } else {
        _locale = const Locale('my');
      }
    } catch (_) {
      /* keep default */
    } finally {
      _ready = true;
      notifyListeners();
    }
  }

  Future<void> setLocale(Locale next) async {
    if (next.languageCode != 'en' && next.languageCode != 'my') return;
    _locale = Locale(next.languageCode);
    notifyListeners();
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_localeKey, next.languageCode);
    } catch (_) {
      /* ignore */
    }
  }

  Future<void> setEnglish() => setLocale(const Locale('en'));

  Future<void> setMyanmar() => setLocale(const Locale('my'));

  /// Apply org-wide locale from system settings (mobile app default language).
  Future<void> applyOrgLocale(String? code) async {
    if (code != 'en' && code != 'my') return;
    final next = Locale(code!);
    if (_locale.languageCode == next.languageCode) return;
    _locale = next;
    notifyListeners();
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_localeKey, next.languageCode);
    } catch (_) {
      /* ignore */
    }
  }
}
