import 'package:flutter/material.dart';

import '../models/lab_system_settings.dart';
import 'app_colors.dart';
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

/// Light/dark themes aligned with admin web `theme_settings` presets.
ThemeData buildAppThemeForSettings(LabSystemSettings settings, {required Brightness brightness}) {
  final isDark = brightness == Brightness.dark;
  final primary = colorFromHex(settings.primaryColorHex, fallback: isDark ? const Color(0xFF6B9FFF) : AppColors.primary)!;
  final primaryLight = isDark ? const Color(0xFF8BB4FF) : AppColors.primaryLight;
  final accentGreen = colorFromHex(settings.secondaryColorHex, fallback: isDark ? const Color(0xFF34D399) : AppColors.accentGreen)!;

  final surface = isDark ? const Color(0xFF0F1419) : AppColors.surface;
  final onSurface = isDark ? const Color(0xFFD1D9E6) : AppColors.onSurface;
  final onSurfaceVariant = isDark ? const Color(0xFF94A3B8) : AppColors.onSurfaceVariant;
  final outline = isDark ? const Color(0xFF2A3341) : AppColors.outline;
  final surfaceContainer = isDark ? const Color(0xFF151B26) : AppColors.surfaceContainer;
  final cardColor = isDark ? const Color(0xFF1A2332) : Colors.white;
  final iconTileBackground =
      isDark ? primary.withValues(alpha: 0.18) : const Color(0xFFEAF1FF);
  final navActiveBackground =
      isDark ? primary.withValues(alpha: 0.22) : const Color(0xFFEAF1FF);

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
        color: isDark ? const Color(0xFFF1F5F9) : AppColors.onSurface,
      ),
      headlineMedium: TextStyle(
        fontFamily: 'Manrope',
        fontSize: 24,
        height: 32 / 24,
        fontWeight: FontWeight.w700,
        color: isDark ? const Color(0xFFF1F5F9) : AppColors.onSurface,
      ),
      headlineSmall: TextStyle(
        fontFamily: 'Manrope',
        fontSize: 20,
        height: 28 / 20,
        fontWeight: FontWeight.w600,
        color: isDark ? const Color(0xFFF1F5F9) : AppColors.onSurface,
      ),
      titleMedium: TextStyle(
        fontFamily: 'Manrope',
        fontSize: 16,
        fontWeight: FontWeight.w700,
        color: isDark ? const Color(0xFFF1F5F9) : AppColors.onSurface,
      ),
      bodyLarge: TextStyle(fontSize: 16, height: 24 / 16, fontWeight: FontWeight.w400, color: onSurface),
      bodyMedium: TextStyle(fontSize: 14, height: 20 / 14, fontWeight: FontWeight.w400, color: onSurface),
      labelLarge: TextStyle(fontSize: 14, height: 20 / 14, fontWeight: FontWeight.w600, color: onSurface),
      labelSmall: TextStyle(fontSize: 12, height: 16 / 12, fontWeight: FontWeight.w500, color: onSurfaceVariant),
    ),
    appBarTheme: AppBarTheme(
      centerTitle: true,
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
    extensions: [
      AppThemeExtras(
        surfaceContainer: surfaceContainer,
        iconTileBackground: iconTileBackground,
        navActiveBackground: navActiveBackground,
      ),
    ],
  );
}
