import 'package:flutter/material.dart';

import '../../theme/theme_extensions.dart';

/// Rounded panel that follows light/dark [CardTheme] colors.
class AppSurfaceCard extends StatelessWidget {
  const AppSurfaceCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
    this.borderRadius = 14,
    this.border,
  });

  final Widget child;
  final EdgeInsetsGeometry padding;
  final double borderRadius;
  final BoxBorder? border;

  @override
  Widget build(BuildContext context) {
    final cs = context.cs;
    return Container(
      padding: padding,
      decoration: BoxDecoration(
        color: context.cardFill,
        borderRadius: BorderRadius.circular(borderRadius),
        border: border ?? Border.all(color: cs.outline.withValues(alpha: 0.35)),
      ),
      child: child,
    );
  }
}
