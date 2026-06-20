import 'dart:convert';

import 'package:flutter/material.dart';

import '../models/app_notification.dart';

enum NotificationTone { order, status, result, payment, rating, account, general }

class NotificationVisual {
  const NotificationVisual({
    required this.icon,
    required this.tone,
    required this.label,
  });

  final IconData icon;
  final NotificationTone tone;
  final String label;
}

Map<String, dynamic>? parseNotificationPayload(String? raw) {
  if (raw == null || raw.trim().isEmpty) return null;
  try {
    final parsed = jsonDecode(raw);
    if (parsed is Map<String, dynamic>) return parsed;
    if (parsed is Map) return Map<String, dynamic>.from(parsed);
  } catch (_) {
    return null;
  }
  return null;
}

NotificationVisual notificationVisual(AppNotification notification) {
  final payload = parseNotificationPayload(notification.dataPayload);
  final event = '${payload?['event'] ?? ''}'.toLowerCase();
  final title = notification.title.toLowerCase();

  if (event.contains('order') || title.contains('order')) {
    if (title.contains('result') || event.contains('result')) {
      return const NotificationVisual(
        icon: Icons.biotech_outlined,
        tone: NotificationTone.result,
        label: 'Lab result',
      );
    }
    if (title.contains('status')) {
      return const NotificationVisual(
        icon: Icons.sync_rounded,
        tone: NotificationTone.status,
        label: 'Status update',
      );
    }
    return const NotificationVisual(
      icon: Icons.receipt_long_outlined,
      tone: NotificationTone.order,
      label: 'Order',
    );
  }
  if (title.contains('payment') || event.contains('payment')) {
    return const NotificationVisual(
      icon: Icons.payments_outlined,
      tone: NotificationTone.payment,
      label: 'Payment',
    );
  }
  if (title.contains('rating') || event.contains('rating')) {
    return const NotificationVisual(
      icon: Icons.star_outline_rounded,
      tone: NotificationTone.rating,
      label: 'Feedback',
    );
  }
  if (title.contains('approved') || title.contains('account') || event.contains('approve')) {
    return const NotificationVisual(
      icon: Icons.verified_user_outlined,
      tone: NotificationTone.account,
      label: 'Account',
    );
  }
  if (title.contains('schedule') || title.contains('collection') || event.contains('schedule')) {
    return const NotificationVisual(
      icon: Icons.local_shipping_outlined,
      tone: NotificationTone.status,
      label: 'Collection',
    );
  }
  if (title.contains('point') || title.contains('loyalty') || event.contains('point')) {
    return const NotificationVisual(
      icon: Icons.card_giftcard_outlined,
      tone: NotificationTone.general,
      label: 'Loyalty',
    );
  }
  return const NotificationVisual(
    icon: Icons.notifications_none_rounded,
    tone: NotificationTone.general,
    label: 'Alert',
  );
}

String? notificationRoute(AppNotification notification) {
  final payload = parseNotificationPayload(notification.dataPayload);
  final event = '${payload?['event'] ?? ''}'.toLowerCase();
  final title = notification.title.toLowerCase();

  if (title.contains('rating') || event.contains('rating')) return '/rating-feedback';
  if (title.contains('result') || event.contains('result') || event.contains('results_ready')) {
    return '/lab-results';
  }
  if (title.contains('point') || title.contains('loyalty') || event.contains('point')) {
    return '/loyalty';
  }
  if (title.contains('schedule') || title.contains('collection') || event.contains('schedule')) {
    return '/order-tracking';
  }
  if (payload?['order_id'] != null) return '/orders';
  if (title.contains('order') || event.contains('order')) return '/orders';
  return '/home';
}

Color notificationToneColor(NotificationTone tone, ColorScheme cs) {
  switch (tone) {
    case NotificationTone.order:
      return cs.primary;
    case NotificationTone.status:
      return const Color(0xFF0E7490);
    case NotificationTone.result:
      return const Color(0xFF047857);
    case NotificationTone.payment:
      return const Color(0xFFB45309);
    case NotificationTone.rating:
      return const Color(0xFFCA8A04);
    case NotificationTone.account:
      return const Color(0xFF6D28D9);
    case NotificationTone.general:
      return cs.onSurfaceVariant;
  }
}

String notificationTimeAgo(DateTime date) {
  final diff = DateTime.now().difference(date);
  if (diff.isNegative) return 'Just now';
  if (diff.inMinutes < 1) return 'Just now';
  if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
  if (diff.inHours < 24) return '${diff.inHours}h ago';
  if (diff.inDays < 7) return '${diff.inDays}d ago';
  return '${_month(date.month)} ${date.day}';
}

String _month(int m) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  if (m < 1 || m > 12) return '';
  return months[m - 1];
}

String notificationGroupLabel(DateTime date) {
  final now = DateTime.now();
  final today = DateTime(now.year, now.month, now.day);
  final day = DateTime(date.year, date.month, date.day);
  final diff = today.difference(day).inDays;
  if (diff == 0) return 'Today';
  if (diff == 1) return 'Yesterday';
  if (diff < 7) return 'This week';
  return 'Earlier';
}

List<({String label, List<AppNotification> items})> groupNotifications(
  List<AppNotification> notifications,
) {
  final order = ['Today', 'Yesterday', 'This week', 'Earlier'];
  final buckets = <String, List<AppNotification>>{};
  for (final n in notifications) {
    final label = notificationGroupLabel(n.createdAt);
    buckets.putIfAbsent(label, () => []).add(n);
  }
  return [
    for (final label in order)
      if (buckets[label]?.isNotEmpty ?? false) (label: label, items: buckets[label]!),
  ];
}
