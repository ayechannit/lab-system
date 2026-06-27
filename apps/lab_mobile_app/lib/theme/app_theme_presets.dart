import 'package:flutter/material.dart';

/// Matches admin web `AppThemeId` / backend `theme_settings.mode`.
enum AppThemePresetId { light, dark, idhc }

AppThemePresetId normalizeThemePresetId(String? mode) {
  switch ((mode ?? 'light').toLowerCase()) {
    case 'dark':
      return AppThemePresetId.dark;
    case 'idhc':
      return AppThemePresetId.idhc;
    default:
      return AppThemePresetId.light;
  }
}

/// Semantic surface tokens per preset (aligned with admin `THEME_PRESETS` CSS).
class ThemeSurfacePalette {
  const ThemeSurfacePalette({
    required this.surface,
    required this.onSurface,
    required this.onSurfaceVariant,
    required this.outline,
    required this.surfaceContainer,
    required this.cardColor,
    required this.iconTileBackground,
    required this.navActiveBackground,
    required this.errorPanelBg,
    required this.errorPanelBorder,
    required this.errorPanelText,
    required this.ratingInactive,
    required this.defaultPrimary,
    required this.defaultSecondary,
    required this.primaryLight,
  });

  final Color surface;
  final Color onSurface;
  final Color onSurfaceVariant;
  final Color outline;
  final Color surfaceContainer;
  final Color cardColor;
  final Color iconTileBackground;
  final Color navActiveBackground;
  final Color errorPanelBg;
  final Color errorPanelBorder;
  final Color errorPanelText;
  final Color ratingInactive;
  final Color defaultPrimary;
  final Color defaultSecondary;
  final Color primaryLight;
}

ThemeSurfacePalette surfacePaletteFor(AppThemePresetId preset) {
  switch (preset) {
    case AppThemePresetId.dark:
      return const ThemeSurfacePalette(
        surface: Color(0xFF0F1419),
        onSurface: Color(0xFFD1D9E6),
        onSurfaceVariant: Color(0xFF94A3B8),
        outline: Color(0xFF2A3341),
        surfaceContainer: Color(0xFF151B26),
        cardColor: Color(0xFF1A2332),
        iconTileBackground: Color(0xFF243044),
        navActiveBackground: Color(0xFF243044),
        errorPanelBg: Color(0xFF450A0A),
        errorPanelBorder: Color(0xFF7F1D1D),
        errorPanelText: Color(0xFFFECACA),
        ratingInactive: Color(0xFF475569),
        defaultPrimary: Color(0xFF6B9FFF),
        defaultSecondary: Color(0xFF34D399),
        primaryLight: Color(0xFF8BB4FF),
      );
    case AppThemePresetId.idhc:
      return const ThemeSurfacePalette(
        surface: Color(0xFFFBF6F0),
        onSurface: Color(0xFF241712),
        onSurfaceVariant: Color(0xFF6B5A50),
        outline: Color(0xFFE7D8CC),
        surfaceContainer: Color(0xFFFAF3EB),
        cardColor: Color(0xFFFFFFFF),
        iconTileBackground: Color(0xFFFDF1EC),
        navActiveBackground: Color(0xFFFCE6BC),
        errorPanelBg: Color(0xFFFEF2F2),
        errorPanelBorder: Color(0xFFFECACA),
        errorPanelText: Color(0xFF991B1B),
        ratingInactive: Color(0xFFD4C4B8),
        defaultPrimary: Color(0xFFE03A2C),
        defaultSecondary: Color(0xFFF4B12A),
        primaryLight: Color(0xFFC72A1E),
      );
    case AppThemePresetId.light:
      return const ThemeSurfacePalette(
        surface: Color(0xFFFAF8FF),
        onSurface: Color(0xFF191B23),
        onSurfaceVariant: Color(0xFF434654),
        outline: Color(0xFFC3C6D6),
        surfaceContainer: Color(0xFFEDEDF8),
        cardColor: Color(0xFFFFFFFF),
        iconTileBackground: Color(0xFFEAF1FF),
        navActiveBackground: Color(0xFFEAF1FF),
        errorPanelBg: Color(0xFFFEF2F2),
        errorPanelBorder: Color(0xFFFECACA),
        errorPanelText: Color(0xFF991B1B),
        ratingInactive: Color(0xFFC8CCE0),
        defaultPrimary: Color(0xFF003D9B),
        defaultSecondary: Color(0xFF0D8A5B),
        primaryLight: Color(0xFF0052CC),
      );
  }
}

String themePresetLabel(AppThemePresetId preset) {
  switch (preset) {
    case AppThemePresetId.dark:
      return 'Dark theme';
    case AppThemePresetId.idhc:
      return 'IDHC theme';
    case AppThemePresetId.light:
      return 'Light theme';
  }
}
