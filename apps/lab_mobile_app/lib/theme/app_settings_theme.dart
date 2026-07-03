import 'package:flutter/material.dart';

import '../models/lab_system_settings.dart';
import 'app_colors.dart';
import 'app_theme_presets.dart';
import 'theme_extensions.dart';

Color? colorFromHex(String? hex, {Color? fallback}) {
  if (hex == null || hex.trim().isEmpty) return fallback;
  var h = hex.trim();
  if (h.startsWith('#')) h = h.substring(1);
  if (h.length == 6) h = 'FF$h';
  if (h.length != 8) return fallback;
  final value = int.tryParse(h, radix: 16);
  if (value == null) return fallback;
  return Color(value);
}

/// Themes aligned with admin web `theme_settings` presets (light / dark / IDHC).
/// Page backgrounds use a fixed light/dark layout palette; the selected preset
/// only drives brand colors (primary, secondary, nav accents).
ThemeData buildAppThemeForSettings(LabSystemSettings settings, {required Brightness brightness}) {
  final isDark = brightness == Brightness.dark;
  final brandPreset = isDark ? AppThemePresetId.dark : settings.themePreset;
  final brandPalette = surfacePaletteFor(brandPreset);
  final layoutPalette = isDark
      ? surfacePaletteFor(AppThemePresetId.dark)
      : surfacePaletteFor(AppThemePresetId.light);

  // Brand colors always follow the active preset — server hex values are ignored
  // so user/server theme selection (Light / Dark / IDHC) updates buttons & links.
  final primary = brandPalette.defaultPrimary;
  final primaryLight = brandPalette.primaryLight;
  final accentGreen = brandPalette.defaultSecondary;

  final surface = layoutPalette.surface;
  final onSurface = layoutPalette.onSurface;
  final onSurfaceVariant = layoutPalette.onSurfaceVariant;
  final outline = layoutPalette.outline;
  final surfaceContainer = layoutPalette.surfaceContainer;
  final cardColor = layoutPalette.cardColor;
  final iconTileBackground =
      isDark ? primary.withValues(alpha: 0.18) : brandPalette.iconTileBackground;
  final navActiveBackground =
      isDark ? primary.withValues(alpha: 0.22) : brandPalette.navActiveBackground;
  final errorPanelBg = layoutPalette.errorPanelBg;
  final errorPanelBorder = layoutPalette.errorPanelBorder;
  final errorPanelText = layoutPalette.errorPanelText;
  final ratingInactive = layoutPalette.ratingInactive;

  return ThemeData(
    useMaterial3: true,
    brightness: brightness,
    fontFamily: 'Inter',
    colorScheme: ColorScheme(
      brightness: brightness,
      primary: primary,
      onPrimary: Colors.white,
      secondary: accentGreen,
      onSecondary: Colors.white,
      surface: surface,
      onSurface: onSurface,
      surfaceContainer: surfaceContainer,
      outline: outline,
      onSurfaceVariant: onSurfaceVariant,
      error: AppColors.error,
      onError: Colors.white,
    ),
    scaffoldBackgroundColor: surface,
    textTheme: TextTheme(
      headlineLarge: TextStyle(
        fontFamily: 'Manrope',
        fontSize: 30,
        height: 38 / 30,
        fontWeight: FontWeight.w700,
        color: onSurface,
      ),
      headlineMedium: TextStyle(
        fontFamily: 'Manrope',
        fontSize: 24,
        height: 32 / 24,
        fontWeight: FontWeight.w700,
        color: onSurface,
      ),
      headlineSmall: TextStyle(
        fontFamily: 'Manrope',
        fontSize: 20,
        height: 28 / 20,
        fontWeight: FontWeight.w600,
        color: onSurface,
      ),
      titleMedium: TextStyle(
        fontFamily: 'Manrope',
        fontSize: 16,
        fontWeight: FontWeight.w700,
        color: onSurface,
      ),
      bodyLarge: TextStyle(fontSize: 16, height: 24 / 16, fontWeight: FontWeight.w400, color: onSurface),
      bodyMedium: TextStyle(fontSize: 14, height: 20 / 14, fontWeight: FontWeight.w400, color: onSurface),
      labelLarge: TextStyle(fontSize: 14, height: 20 / 14, fontWeight: FontWeight.w600, color: onSurface),
      labelSmall: TextStyle(fontSize: 12, height: 16 / 12, fontWeight: FontWeight.w500, color: onSurfaceVariant),
    ),
    appBarTheme: AppBarTheme(
      centerTitle: false,
      elevation: 0,
      scrolledUnderElevation: 0.5,
      backgroundColor: surface,
      foregroundColor: onSurface,
    ),
    cardTheme: CardThemeData(
      color: cardColor,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(color: outline.withValues(alpha: 0.85), width: 0.6),
      ),
      margin: EdgeInsets.zero,
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: surfaceContainer,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: Colors.transparent, width: 1.5),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: Colors.transparent, width: 1.5),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: primaryLight, width: 2),
      ),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: primary,
        foregroundColor: Colors.white,
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
    ),
    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(foregroundColor: primary),
    ),
    checkboxTheme: CheckboxThemeData(
      fillColor: WidgetStateProperty.resolveWith((states) {
        if (states.contains(WidgetState.selected)) return primary;
        return null;
      }),
      checkColor: WidgetStateProperty.all(Colors.white),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: onSurface,
        backgroundColor: surfaceContainer,
        side: BorderSide(color: outline.withValues(alpha: 0.45)),
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
    ),
    dividerTheme: DividerThemeData(
      color: outline.withValues(alpha: 0.35),
      thickness: 1,
      space: 1,
    ),
    menuTheme: MenuThemeData(
      style: MenuStyle(
        backgroundColor: WidgetStateProperty.all(cardColor),
        elevation: WidgetStateProperty.all(3),
        shadowColor: WidgetStateProperty.all(onSurface.withValues(alpha: 0.12)),
        shape: WidgetStateProperty.all(
          RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ),
        side: WidgetStateProperty.all(
          BorderSide(color: outline.withValues(alpha: 0.35)),
        ),
      ),
    ),
    dropdownMenuTheme: DropdownMenuThemeData(
      menuStyle: MenuStyle(
        backgroundColor: WidgetStateProperty.all(cardColor),
        elevation: WidgetStateProperty.all(3),
        shape: WidgetStateProperty.all(
          RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ),
        side: WidgetStateProperty.all(
          BorderSide(color: outline.withValues(alpha: 0.35)),
        ),
      ),
    ),
    bottomNavigationBarTheme: BottomNavigationBarThemeData(
      backgroundColor: cardColor,
      selectedItemColor: primary,
      unselectedItemColor: onSurfaceVariant,
    ),
    snackBarTheme: SnackBarThemeData(
      elevation: 0,
      backgroundColor: Colors.transparent,
      behavior: SnackBarBehavior.floating,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      contentTextStyle: TextStyle(color: onSurface, fontWeight: FontWeight.w500),
    ),
    extensions: [
      AppThemeExtras(
        surfaceContainer: surfaceContainer,
        iconTileBackground: iconTileBackground,
        navActiveBackground: navActiveBackground,
        errorPanelBg: errorPanelBg,
        errorPanelBorder: errorPanelBorder,
        errorPanelText: errorPanelText,
        ratingInactive: ratingInactive,
        heroGradientEnd: primaryLight,
      ),
    ],
  );
}
