import 'package:flutter/material.dart';

import '../../app/session_scope.dart';
import '../../theme/app_colors.dart';
import '../../widgets/common/section_card.dart';
import '../../widgets/common/status_timeline.dart';

class OrderTrackingScreen extends StatelessWidget {
  const OrderTrackingScreen({super.key});

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
              automaticallyImplyLeading: false,
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
                    style: Theme.of(context).textTheme.bodyLarge?.copyWith(color: AppColors.onSurfaceVariant),
                  ),
                ],
              ),
            ),
          );
        }
        return Scaffold(
          appBar: AppBar(
            automaticallyImplyLeading: false,
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
                        const SizedBox(height: 6),
                        Text('Status: ${order.backendStatus}', style: Theme.of(context).textTheme.bodySmall),
                      ],
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                Card(
                  child: ListTile(
                    leading: Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        color: AppColors.primary.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Icon(Icons.local_shipping_outlined, color: AppColors.primary),
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
                        color: AppColors.primary.withValues(alpha: 0.1),
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
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: AppColors.onSurfaceVariant),
                  ),
                  const SizedBox(height: 8),
                  FilledButton(
                    onPressed: session.busy
                        ? null
                        : () async {
                            try {
                              await session.acceptProposedSchedule();
                              if (!context.mounted) return;
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(content: Text('Schedule confirmed.')),
                              );
                            } catch (e) {
                              if (!context.mounted) return;
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(content: Text('$e')),
                              );
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
                        color: AppColors.primary,
                      ),
                ),
                const SizedBox(height: 12),
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: StatusTimeline(steps: order.timeline),
                  ),
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: () {},
                        icon: const Icon(Icons.support_agent),
                        label: const Text('Help Center'),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: () {},
                        icon: const Icon(Icons.description_outlined),
                        label: const Text('Lab Details'),
                      ),
                    ),
                  ],
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
