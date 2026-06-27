import 'package:flutter/material.dart';

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

OrderStatusStyle orderStatusStyleFor(String? rawStatus, ColorScheme cs) {
  final status = (rawStatus ?? 'pending').trim().toLowerCase();
  switch (status) {
    case 'pending':
      return OrderStatusStyle(
        label: 'Pending',
        foreground: const Color(0xFFB45309),
        background: const Color(0xFFB45309).withValues(alpha: 0.12),
      );
    case 'scheduled':
      return OrderStatusStyle(
        label: 'Scheduled',
        foreground: cs.primary,
        background: cs.primary.withValues(alpha: 0.1),
      );
    case 'collecting':
      return const OrderStatusStyle(
        label: 'Collecting',
        foreground: Color(0xFF0E7490),
        background: Color(0x1A0E7490),
      );
    case 'running':
      return const OrderStatusStyle(
        label: 'Running',
        foreground: Color(0xFF5B5BD6),
        background: Color(0x1A5B5BD6),
      );
    case 'completed':
    case 'delivered':
      return OrderStatusStyle(
        label: status == 'completed' ? 'Completed' : 'Delivered',
        foreground: cs.secondary,
        background: cs.secondary.withValues(alpha: 0.12),
      );
    default:
      final label = status.isEmpty ? 'Unknown' : status[0].toUpperCase() + status.substring(1);
      return OrderStatusStyle(
        label: label.replaceAll('_', ' '),
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
    final style = orderStatusStyleFor(status, context.cs);
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
