import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

const _localeKey = 'app_locale';
const _localeUserChosenKey = 'app_locale_user_chosen';

/// Supported app locales (`en`, `my`). Defaults to Myanmar unless the user picks English.
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
      final userChosen = prefs.getBool(_localeUserChosenKey) ?? false;
      final saved = prefs.getString(_localeKey);
      if (userChosen && (saved == 'my' || saved == 'en')) {
        _locale = Locale(saved!);
      } else {
        _locale = const Locale('my');
        if (saved != null) {
          await prefs.remove(_localeKey);
        }
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
      await prefs.setBool(_localeUserChosenKey, true);
      await prefs.setString(_localeKey, next.languageCode);
    } catch (_) {
      /* ignore */
    }
  }

  Future<void> setEnglish() => setLocale(const Locale('en'));

  Future<void> setMyanmar() => setLocale(const Locale('my'));
}
