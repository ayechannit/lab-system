import 'package:flutter/material.dart';

import '../models/lab_system_settings.dart';
import 'app_settings_theme.dart';

/// Default light theme (used before settings load or in tests).
ThemeData buildAppTheme() {
  return buildAppThemeForSettings(LabSystemSettings.defaults(), brightness: Brightness.light);
}
