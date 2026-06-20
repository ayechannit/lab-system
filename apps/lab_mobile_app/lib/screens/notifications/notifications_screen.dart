import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../app/session_scope.dart';
import '../../models/app_notification.dart';
import '../../theme/theme_extensions.dart';
import '../../utils/notification_utils.dart';
import '../../widgets/common/app_surface_card.dart';

enum _InboxFilter { all, unread }

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  _InboxFilter _filter = _InboxFilter.all;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      SessionScope.of(context).refreshNotifications();
    });
  }

  Future<void> _onRefresh() => SessionScope.of(context).refreshNotifications();

  Future<void> _onTap(AppNotification notification) async {
    final session = SessionScope.of(context);
    final route = await session.openNotification(notification);
    if (!mounted || route == null) return;
    context.go(route);
  }

  @override
  Widget build(BuildContext context) {
    final session = SessionScope.of(context);
    return ListenableBuilder(
      listenable: session,
      builder: (context, _) {
        final cs = context.cs;
        final all = session.notifications;
        final unreadCount = session.unreadNotificationCount;
        final filtered = _filter == _InboxFilter.unread
            ? all.where((n) => !n.isRead).toList()
            : all;
        final groups = groupNotifications(filtered);
        final loading = session.notificationsLoading && all.isEmpty;

        return Scaffold(
          appBar: AppBar(
            title: const Text('Notifications'),
            actions: [
              if (unreadCount > 0)
                TextButton(
                  onPressed: session.busy ? null : () => session.markAllNotificationsRead(),
                  child: const Text('Mark all read'),
                ),
            ],
          ),
          body: RefreshIndicator(
            onRefresh: _onRefresh,
            child: loading
                ? ListView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    children: const [
                      SizedBox(height: 120),
                      Center(child: CircularProgressIndicator()),
                    ],
                  )
                : CustomScrollView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    slivers: [
                      SliverToBoxAdapter(
                        child: Padding(
                          padding: const EdgeInsets.fromLTRB(20, 12, 20, 8),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                unreadCount > 0
                                    ? '$unreadCount unread update${unreadCount == 1 ? '' : 's'}'
                                    : 'You are all caught up',
                                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                      color: unreadCount > 0 ? cs.primary : cs.onSurfaceVariant,
                                      fontWeight: FontWeight.w600,
                                    ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                'Lab updates about orders, results, and your account.',
                                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                      color: cs.onSurfaceVariant,
                                    ),
                              ),
                              const SizedBox(height: 14),
                              SegmentedButton<_InboxFilter>(
                                segments: const [
                                  ButtonSegment(value: _InboxFilter.all, label: Text('All')),
                                  ButtonSegment(value: _InboxFilter.unread, label: Text('Unread')),
                                ],
                                selected: {_filter},
                                onSelectionChanged: (value) {
                                  setState(() => _filter = value.first);
                                },
                              ),
                            ],
                          ),
                        ),
                      ),
                      if (session.notificationsError != null && all.isEmpty)
                        SliverToBoxAdapter(
                          child: Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
                            child: _EmptyState(
                              icon: Icons.cloud_off_outlined,
                              title: 'Could not load notifications',
                              subtitle: session.notificationsError!,
                              actionLabel: 'Try again',
                              onAction: _onRefresh,
                            ),
                          ),
                        )
                      else if (filtered.isEmpty)
                        SliverFillRemaining(
                          hasScrollBody: false,
                          child: Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 20),
                            child: _EmptyState(
                              icon: _filter == _InboxFilter.unread
                                  ? Icons.mark_email_read_outlined
                                  : Icons.notifications_none_outlined,
                              title: _filter == _InboxFilter.unread
                                  ? 'No unread notifications'
                                  : 'No notifications yet',
                              subtitle: _filter == _InboxFilter.unread
                                  ? 'New lab updates will appear here.'
                                  : 'When the lab sends updates, they will show up in this inbox.',
                            ),
                          ),
                        )
                      else
                        for (final group in groups) ...[
                          SliverToBoxAdapter(
                            child: Padding(
                              padding: const EdgeInsets.fromLTRB(20, 16, 20, 8),
                              child: Text(
                                group.label,
                                style: Theme.of(context).textTheme.labelLarge?.copyWith(
                                      color: cs.onSurfaceVariant,
                                      fontWeight: FontWeight.w700,
                                      letterSpacing: 0.4,
                                    ),
                              ),
                            ),
                          ),
                          SliverPadding(
                            padding: const EdgeInsets.symmetric(horizontal: 20),
                            sliver: SliverList.separated(
                              itemCount: group.items.length,
                              separatorBuilder: (_, __) => const SizedBox(height: 10),
                              itemBuilder: (context, index) {
                                final item = group.items[index];
                                return _NotificationTile(
                                  notification: item,
                                  onTap: () => _onTap(item),
                                );
                              },
                            ),
                          ),
                        ],
                      const SliverToBoxAdapter(child: SizedBox(height: 24)),
                    ],
                  ),
          ),
        );
      },
    );
  }
}

class _NotificationTile extends StatelessWidget {
  const _NotificationTile({
    required this.notification,
    required this.onTap,
  });

  final AppNotification notification;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final cs = context.cs;
    final visual = notificationVisual(notification);
    final toneColor = notificationToneColor(visual.tone, cs);
    final unread = !notification.isRead;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        child: AppSurfaceCard(
          padding: const EdgeInsets.all(14),
          border: unread
              ? Border.all(color: cs.primary.withValues(alpha: 0.45), width: 1.2)
              : null,
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: toneColor.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(visual.icon, color: toneColor, size: 22),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            notification.title,
                            style: Theme.of(context).textTheme.titleSmall?.copyWith(
                                  fontWeight: unread ? FontWeight.w700 : FontWeight.w600,
                                ),
                          ),
                        ),
                        if (unread)
                          Container(
                            width: 8,
                            height: 8,
                            margin: const EdgeInsets.only(left: 8, top: 4),
                            decoration: BoxDecoration(
                              color: cs.primary,
                              shape: BoxShape.circle,
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      notification.body,
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            color: cs.onSurfaceVariant,
                            height: 1.35,
                          ),
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: toneColor.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(999),
                          ),
                          child: Text(
                            visual.label,
                            style: Theme.of(context).textTheme.labelSmall?.copyWith(
                                  color: toneColor,
                                  fontWeight: FontWeight.w600,
                                ),
                          ),
                        ),
                        const Spacer(),
                        Text(
                          notificationTimeAgo(notification.createdAt),
                          style: Theme.of(context).textTheme.labelSmall?.copyWith(
                                color: cs.onSurfaceVariant,
                              ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState({
    required this.icon,
    required this.title,
    required this.subtitle,
    this.actionLabel,
    this.onAction,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final String? actionLabel;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) {
    final cs = context.cs;
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Icon(icon, size: 52, color: cs.onSurfaceVariant.withValues(alpha: 0.7)),
        const SizedBox(height: 14),
        Text(
          title,
          textAlign: TextAlign.center,
          style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600),
        ),
        const SizedBox(height: 6),
        Text(
          subtitle,
          textAlign: TextAlign.center,
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: cs.onSurfaceVariant),
        ),
        if (actionLabel != null && onAction != null) ...[
          const SizedBox(height: 16),
          FilledButton.tonal(onPressed: onAction, child: Text(actionLabel!)),
        ],
      ],
    );
  }
}
