import 'package:flutter/material.dart';

import '../../theme/theme_extensions.dart';

/// Rounded input container that follows the active app theme.
class ThemedInputShell extends StatelessWidget {
  const ThemedInputShell({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: context.appExtras.surfaceContainer,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: context.subtleBorder),
      ),
      child: child,
    );
  }
}
