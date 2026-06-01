import 'package:flutter/material.dart';

import '../../theme/app_colors.dart';
import '../../theme/theme_extensions.dart';

/// Shared filled input styling for forms (order, profile, modals).
abstract final class AppFieldDecoration {
  static const double radius = 12;
  static const BorderRadius borderRadius = BorderRadius.all(Radius.circular(radius));

  static const OutlineInputBorder _outline = OutlineInputBorder(
    borderRadius: borderRadius,
    borderSide: BorderSide(color: Colors.transparent, width: 1),
  );

  /// Soft filled fields: no heavy stroke at rest; primary ring on focus only.
  static InputDecoration build(
    BuildContext context, {
    String? hint,
    Widget? prefixIcon,
    Widget? suffixIcon,
    bool isDense = true,
  }) {
    final cs = context.cs;
    final fill = Theme.of(context).inputDecorationTheme.fillColor ?? context.appExtras.surfaceContainer;
    return InputDecoration(
      hintText: hint,
      hintStyle: TextStyle(color: cs.onSurfaceVariant.withValues(alpha: 0.72)),
      prefixIcon: prefixIcon,
      suffixIcon: suffixIcon,
      isDense: isDense,
      filled: true,
      fillColor: fill,
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
      border: _outline,
      enabledBorder: _outline,
      focusedBorder: OutlineInputBorder(
        borderRadius: borderRadius,
        borderSide: BorderSide(color: cs.primary.withValues(alpha: 0.85), width: 2),
      ),
      errorBorder: OutlineInputBorder(
        borderRadius: borderRadius,
        borderSide: BorderSide(color: AppColors.error.withValues(alpha: 0.8)),
      ),
      focusedErrorBorder: const OutlineInputBorder(
        borderRadius: borderRadius,
        borderSide: BorderSide(color: AppColors.error, width: 2),
      ),
    );
  }
}
