import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../app/session_scope.dart';
import '../../theme/theme_extensions.dart';
import '../../widgets/common/app_toast.dart';
import '../../widgets/common/order_status_chip.dart';
import '../../widgets/common/section_card.dart';
import '../../widgets/common/status_timeline.dart';

class OrderTrackingScreen extends StatelessWidget {
  const OrderTrackingScreen({super.key});

  void _goBack(BuildContext context) {
    if (context.canPop()) {
      context.pop();
      return;
    }
    context.go('/orders');
  }

  @override
  Widget build(BuildContext context) {
    final session = SessionScope.of(context);
    return ListenableBuilder(
      listenable: session,
      builder: (context, _) {
        final order = session.trackingOrder;
        if (order == null) {
          return Scaffold(
            appBar: AppBar(
              leading: IconButton(
                icon: const Icon(Icons.arrow_back),
                tooltip: 'Back',
                onPressed: () => _goBack(context),
              ),
              title: const Text('Order tracking'),
            ),
            body: RefreshIndicator(
              onRefresh: () => session.refreshTracking(),
              child: ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(24),
                children: [
                  SizedBox(height: MediaQuery.sizeOf(context).height * 0.25),
                  Text(
                    'No active orders yet. Place an order to see collection times and status from the lab.',
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.bodyLarge?.copyWith(color: context.cs.onSurfaceVariant),
                  ),
                ],
              ),
            ),
          );
        }
        return Scaffold(
          appBar: AppBar(
            leading: IconButton(
              icon: const Icon(Icons.arrow_back),
              tooltip: 'Back',
              onPressed: () => _goBack(context),
            ),
            title: const Text('Order tracking'),
          ),
          body: RefreshIndicator(
            onRefresh: () => session.refreshTracking(),
            child: ListView(
              padding: const EdgeInsets.all(20),
              children: [
                SectionCard(
                  title: 'Order ID: ${order.id}',
                  subtitle: order.createdAtLabel,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('${order.patientName} · ${order.testType}', style: Theme.of(context).textTheme.bodyLarge),
                      const SizedBox(height: 6),
                      Text('Address: ${order.address.line}'),
                      if (order.backendStatus != null) ...[
                        const SizedBox(height: 8),
                        OrderStatusChip(status: order.backendStatus, compact: false),
                      ],
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                Card(
                  child: ListTile(
                    leading: _CollectorAvatar(
                      name: order.collectorName,
                      imageUrl: order.collectorProfileImageUrl,
                    ),
                    title: const Text('Lab schedule'),
                    subtitle: Text(
                      'Collector: ${order.collectorName ?? 'Pending'}\n'
                      'Collection: ${_dt(order.collectionAcceptedAt)}\n'
                      'Running: ${_dt(order.runningAt)}\n'
                      'Report out: ${_dt(order.reportOutAt)}',
                    ),
                    trailing: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: context.cs.primary.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(999),
                      ),
                      child: Text(order.isReportReady ? 'Completed' : 'In progress'),
                    ),
                  ),
                ),
                if (order.canConfirmSchedule) ...[
                  const SizedBox(height: 12),
                  Text(
                    'The lab proposed a collection schedule. Confirm so the collector can proceed.',
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: context.cs.onSurfaceVariant),
                  ),
                  const SizedBox(height: 8),
                  FilledButton(
                    onPressed: session.busy
                        ? null
                        : () async {
                            try {
                              await session.acceptProposedSchedule();
                              if (!context.mounted) return;
                              AppToast.successInShell(
                                context,
                                'The collector can proceed with your sample.',
                                title: 'Schedule confirmed',
                              );
                            } catch (e) {
                              if (!context.mounted) return;
                              AppToast.errorInShell(context, '$e');
                            }
                          },
                    child: Text(session.busy ? 'Saving…' : 'Confirm collection schedule'),
                  ),
                ],
                const SizedBox(height: 12),
                Text(
                  'Status',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w700,
                        color: context.cs.primary,
                      ),
                ),
                const SizedBox(height: 12),
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: StatusTimeline(steps: order.timeline),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  String _dt(DateTime? dt) {
    if (dt == null) return 'Pending';
    return '${dt.year}-${dt.month.toString().padLeft(2, '0')}-${dt.day.toString().padLeft(2, '0')} '
        '${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
  }
}

class _CollectorAvatar extends StatelessWidget {
  const _CollectorAvatar({
    required this.name,
    required this.imageUrl,
  });

  final String? name;
  final String? imageUrl;

  @override
  Widget build(BuildContext context) {
    final cs = context.cs;
    final initial = (name?.trim().isNotEmpty ?? false) ? name!.trim()[0].toUpperCase() : '?';
    final url = imageUrl?.trim();
    return Container(
      width: 40,
      height: 40,
      decoration: BoxDecoration(
        color: cs.primary.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(10),
      ),
      clipBehavior: Clip.antiAlias,
      child: url != null && url.isNotEmpty
          ? Image.network(
              url,
              fit: BoxFit.cover,
              errorBuilder: (_, __, ___) => Center(
                child: Text(
                  initial,
                  style: TextStyle(color: cs.primary, fontWeight: FontWeight.w700),
                ),
              ),
            )
          : Center(
              child: name?.trim().isNotEmpty ?? false
                  ? Text(
                      initial,
                      style: TextStyle(color: cs.primary, fontWeight: FontWeight.w700),
                    )
                  : Icon(Icons.local_shipping_outlined, color: cs.primary),
            ),
    );
  }
}
