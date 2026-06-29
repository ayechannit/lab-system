import 'package:flutter/material.dart';

import '../../l10n/app_localizations.dart';
import '../../l10n/order_l10n.dart';
import '../../theme/theme_extensions.dart';

/// Visual treatment for lab order pipeline statuses (aligned with admin badge semantics).
class OrderStatusStyle {
  const OrderStatusStyle({
    required this.label,
    required this.foreground,
    required this.background,
  });

  final String label;
  final Color foreground;
  final Color background;
}

OrderStatusStyle orderStatusStyleFor(String? rawStatus, ColorScheme cs, AppLocalizations l10n) {
  final status = (rawStatus ?? 'pending').trim().toLowerCase();
  final label = localizedOrderStatusLabel(rawStatus, l10n);
  switch (status) {
    case 'pending':
      return OrderStatusStyle(
        label: label,
        foreground: const Color(0xFFB45309),
        background: const Color(0xFFB45309).withValues(alpha: 0.12),
      );
    case 'scheduled':
      return OrderStatusStyle(
        label: label,
        foreground: cs.primary,
        background: cs.primary.withValues(alpha: 0.1),
      );
    case 'collecting':
      return OrderStatusStyle(
        label: label,
        foreground: const Color(0xFF0E7490),
        background: const Color(0x1A0E7490),
      );
    case 'running':
      return OrderStatusStyle(
        label: label,
        foreground: const Color(0xFF5B5BD6),
        background: const Color(0x1A5B5BD6),
      );
    case 'completed':
    case 'delivered':
      return OrderStatusStyle(
        label: label,
        foreground: cs.secondary,
        background: cs.secondary.withValues(alpha: 0.12),
      );
    default:
      return OrderStatusStyle(
        label: label,
        foreground: cs.onSurfaceVariant,
        background: cs.onSurfaceVariant.withValues(alpha: 0.1),
      );
  }
}

class OrderStatusChip extends StatelessWidget {
  const OrderStatusChip({
    super.key,
    required this.status,
    this.compact = true,
  });

  final String? status;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final style = orderStatusStyleFor(status, context.cs, l10n);
    return Container(
      padding: EdgeInsets.symmetric(horizontal: compact ? 8 : 10, vertical: compact ? 4 : 5),
      decoration: BoxDecoration(
        color: style.background,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: style.foreground.withValues(alpha: 0.22)),
      ),
      child: Text(
        style.label,
        style: Theme.of(context).textTheme.labelSmall?.copyWith(
              color: style.foreground,
              fontWeight: FontWeight.w700,
              letterSpacing: 0.1,
            ),
      ),
    );
  }
}
