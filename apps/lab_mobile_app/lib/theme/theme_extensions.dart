import 'package:flutter/material.dart';

/// Extra semantic colors not covered by [ColorScheme] defaults.
@immutable
class AppThemeExtras extends ThemeExtension<AppThemeExtras> {
  const AppThemeExtras({
    required this.surfaceContainer,
    required this.iconTileBackground,
    required this.navActiveBackground,
  });

  final Color surfaceContainer;
  final Color iconTileBackground;
  final Color navActiveBackground;

  @override
  AppThemeExtras copyWith({
    Color? surfaceContainer,
    Color? iconTileBackground,
    Color? navActiveBackground,
  }) {
    return AppThemeExtras(
      surfaceContainer: surfaceContainer ?? this.surfaceContainer,
      iconTileBackground: iconTileBackground ?? this.iconTileBackground,
      navActiveBackground: navActiveBackground ?? this.navActiveBackground,
    );
  }

  @override
  AppThemeExtras lerp(ThemeExtension<AppThemeExtras>? other, double t) {
    if (other is! AppThemeExtras) return this;
    return AppThemeExtras(
      surfaceContainer: Color.lerp(surfaceContainer, other.surfaceContainer, t)!,
      iconTileBackground: Color.lerp(iconTileBackground, other.iconTileBackground, t)!,
      navActiveBackground: Color.lerp(navActiveBackground, other.navActiveBackground, t)!,
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
      );

  Color get cardFill => Theme.of(this).cardTheme.color ?? cs.surface;
}
