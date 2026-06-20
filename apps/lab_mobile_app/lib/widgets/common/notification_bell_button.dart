import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../app/session_scope.dart';

/// App bar bell with unread badge — opens the notifications inbox.
class NotificationBellButton extends StatelessWidget {
  const NotificationBellButton({super.key});

  @override
  Widget build(BuildContext context) {
    final session = SessionScope.of(context);
    return ListenableBuilder(
      listenable: session,
      builder: (context, _) {
        final unread = session.unreadNotificationCount;
        return Padding(
          padding: const EdgeInsets.only(right: 10, left: 4),
          child: IconButton(
            tooltip: unread > 0 ? '$unread unread notifications' : 'Notifications',
            onPressed: () => context.push('/notifications'),
            visualDensity: VisualDensity.standard,
            icon: Badge(
              isLabelVisible: unread > 0,
              label: Text(unread > 99 ? '99+' : '$unread'),
              backgroundColor: Theme.of(context).colorScheme.error,
              offset: const Offset(4, -4),
              child: const Icon(Icons.notifications_outlined),
            ),
          ),
        );
      },
    );
  }
}
