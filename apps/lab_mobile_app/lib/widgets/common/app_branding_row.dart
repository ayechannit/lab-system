import 'package:flutter/material.dart';

import '../../app/app_settings_scope.dart';
import '../../theme/theme_extensions.dart';
import 'app_brand_mark.dart';

/// Lab logo + name from server settings (admin System settings page).
class AppBrandingRow extends StatelessWidget {
  const AppBrandingRow({
    super.key,
    this.markSize = 32,
    this.iconSize = 16,
    this.borderRadius = 8,
    this.showShadow = true,
    this.titleStyle,
    this.spacing = 10,
  });

  final double markSize;
  final double iconSize;
  final double borderRadius;
  final bool showShadow;
  final TextStyle? titleStyle;
  final double spacing;

  @override
  Widget build(BuildContext context) {
    final settings = AppSettingsScope.maybeOf(context);
    final labName = settings?.labName ?? 'MedLab Smart';
    final logoUrl = settings?.logoUrl;

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        AppBrandMark(
          size: markSize,
          iconSize: iconSize,
          borderRadius: borderRadius,
          showShadow: showShadow,
          logoUrl: logoUrl,
        ),
        SizedBox(width: spacing),
        Flexible(
          child: Text(
            labName,
            overflow: TextOverflow.ellipsis,
            style: titleStyle ??
                Theme.of(context).textTheme.headlineSmall?.copyWith(
                      color: context.cs.primary,
                      fontWeight: FontWeight.w800,
                    ),
          ),
        ),
      ],
    );
  }
}
