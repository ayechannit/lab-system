import 'package:flutter/material.dart';

import '../../theme/app_colors.dart';

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

OrderStatusStyle orderStatusStyleFor(String? rawStatus) {
  final status = (rawStatus ?? 'pending').trim().toLowerCase();
  switch (status) {
    case 'pending':
      return const OrderStatusStyle(
        label: 'Pending',
        foreground: AppColors.warningLow,
        background: Color(0x1FB45309),
      );
    case 'scheduled':
      return const OrderStatusStyle(
        label: 'Scheduled',
        foreground: AppColors.primaryLight,
        background: Color(0x1A0052CC),
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
      return const OrderStatusStyle(
        label: 'Completed',
        foreground: AppColors.accentGreen,
        background: Color(0x1F0D8A5B),
      );
    case 'delivered':
      return const OrderStatusStyle(
        label: 'Delivered',
        foreground: AppColors.accentGreen,
        background: Color(0x1F0D8A5B),
      );
    default:
      final label = status.isEmpty ? 'Unknown' : status[0].toUpperCase() + status.substring(1);
      return OrderStatusStyle(
        label: label.replaceAll('_', ' '),
        foreground: AppColors.onSurfaceVariant,
        background: const Color(0x1A434654),
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
    final style = orderStatusStyleFor(status);
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
