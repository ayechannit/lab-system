import 'package:flutter/material.dart';

/// Extra semantic colors not covered by [ColorScheme] defaults.
@immutable
class AppThemeExtras extends ThemeExtension<AppThemeExtras> {
  const AppThemeExtras({
    required this.surfaceContainer,
    required this.iconTileBackground,
    required this.navActiveBackground,
    required this.errorPanelBg,
    required this.errorPanelBorder,
    required this.errorPanelText,
    required this.ratingInactive,
    required this.heroGradientEnd,
  });

  final Color surfaceContainer;
  final Color iconTileBackground;
  final Color navActiveBackground;
  final Color errorPanelBg;
  final Color errorPanelBorder;
  final Color errorPanelText;
  final Color ratingInactive;
  final Color heroGradientEnd;

  @override
  AppThemeExtras copyWith({
    Color? surfaceContainer,
    Color? iconTileBackground,
    Color? navActiveBackground,
    Color? errorPanelBg,
    Color? errorPanelBorder,
    Color? errorPanelText,
    Color? ratingInactive,
    Color? heroGradientEnd,
  }) {
    return AppThemeExtras(
      surfaceContainer: surfaceContainer ?? this.surfaceContainer,
      iconTileBackground: iconTileBackground ?? this.iconTileBackground,
      navActiveBackground: navActiveBackground ?? this.navActiveBackground,
      errorPanelBg: errorPanelBg ?? this.errorPanelBg,
      errorPanelBorder: errorPanelBorder ?? this.errorPanelBorder,
      errorPanelText: errorPanelText ?? this.errorPanelText,
      ratingInactive: ratingInactive ?? this.ratingInactive,
      heroGradientEnd: heroGradientEnd ?? this.heroGradientEnd,
    );
  }

  @override
  AppThemeExtras lerp(ThemeExtension<AppThemeExtras>? other, double t) {
    if (other is! AppThemeExtras) return this;
    return AppThemeExtras(
      surfaceContainer: Color.lerp(surfaceContainer, other.surfaceContainer, t)!,
      iconTileBackground: Color.lerp(iconTileBackground, other.iconTileBackground, t)!,
      navActiveBackground: Color.lerp(navActiveBackground, other.navActiveBackground, t)!,
      errorPanelBg: Color.lerp(errorPanelBg, other.errorPanelBg, t)!,
      errorPanelBorder: Color.lerp(errorPanelBorder, other.errorPanelBorder, t)!,
      errorPanelText: Color.lerp(errorPanelText, other.errorPanelText, t)!,
      ratingInactive: Color.lerp(ratingInactive, other.ratingInactive, t)!,
      heroGradientEnd: Color.lerp(heroGradientEnd, other.heroGradientEnd, t)!,
    );
  }
}

extension AppThemeContext on BuildContext {
  ColorScheme get cs => Theme.of(this).colorScheme;

  AppThemeExtras get appExtras =>
      Theme.of(this).extension<AppThemeExtras>() ??
      const AppThemeExtras(
        surfaceContainer: Color(0xFFEDEDF8),
        iconTileBackground: Color(0xFFEAF1FF),
        navActiveBackground: Color(0xFFEAF1FF),
        errorPanelBg: Color(0xFFFEF2F2),
        errorPanelBorder: Color(0xFFFECACA),
        errorPanelText: Color(0xFF991B1B),
        ratingInactive: Color(0xFFC8CCE0),
        heroGradientEnd: Color(0xFF0052CC),
      );

  Color get cardFill => Theme.of(this).cardTheme.color ?? cs.surface;

  Color get subtleBorder => cs.outline.withValues(alpha: 0.4);
}
