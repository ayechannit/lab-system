import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../app/session_scope.dart';
import '../../models/lab_order.dart';
import '../../models/rating.dart';
import '../../theme/app_colors.dart';
import '../../theme/theme_extensions.dart';
import '../../widgets/common/app_branding_row.dart';
import '../../widgets/common/order_rating_bar.dart';
import '../../widgets/common/order_status_chip.dart';
import '../../widgets/navigation/lab_main_bottom_nav.dart';

class OrdersListScreen extends StatefulWidget {
  const OrdersListScreen({super.key});

  @override
  State<OrdersListScreen> createState() => _OrdersListScreenState();
}

class _OrdersListScreenState extends State<OrdersListScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      final session = SessionScope.of(context);
      await session.refreshActiveOrders();
      await session.refreshOrderRatings();
    });
  }

  @override
  Widget build(BuildContext context) {
    final session = SessionScope.of(context);
    return ListenableBuilder(
      listenable: session,
      builder: (context, _) {
        final orders = session.activeOrders;
        void openNewOrder() => context.push('/order-lab-test');

        return Scaffold(
          appBar: AppBar(
            automaticallyImplyLeading: false,
            titleSpacing: 12,
            title: const AppBrandingRow(markSize: 32, iconSize: 16, borderRadius: 8),
            actions: [
              TextButton.icon(
                onPressed: openNewOrder,
                icon: const Icon(Icons.add, size: 20),
                label: const Text('New order'),
                style: TextButton.styleFrom(
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                ),
              ),
            ],
          ),
          body: RefreshIndicator(
            onRefresh: () async {
              await session.refreshActiveOrders();
              await session.refreshOrderRatings();
            },
            child: ListView(
              physics: const ClampingScrollPhysics(),
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 20),
              children: [
                Text('Your orders', style: Theme.of(context).textTheme.headlineMedium),
                const SizedBox(height: 6),
                Text(
                  'Active requests that are not yet delivered.',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: context.cs.onSurfaceVariant),
                ),
                const SizedBox(height: 16),
                _NewOrderCta(onTap: openNewOrder),
                const SizedBox(height: 16),
                if (orders.isEmpty)
                  Padding(
                    padding: EdgeInsets.only(top: MediaQuery.sizeOf(context).height * 0.06),
                    child: Column(
                      children: [
                        Icon(Icons.inbox_outlined, size: 48, color: context.cs.onSurfaceVariant),
                        const SizedBox(height: 12),
                        Text(
                          'No active orders yet',
                          textAlign: TextAlign.center,
                          style: Theme.of(context).textTheme.titleMedium,
                        ),
                        const SizedBox(height: 6),
                        Text(
                          'Use the card above to place your first lab test. Orders stay here until they are delivered.',
                          textAlign: TextAlign.center,
                          style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: context.cs.onSurfaceVariant),
                        ),
                      ],
                    ),
                  )
                else ...[
                  Text(
                    'Active orders (${orders.length})',
                    style: Theme.of(context).textTheme.titleSmall?.copyWith(
                          fontWeight: FontWeight.w700,
                          color: context.cs.onSurfaceVariant,
                          letterSpacing: 0.2,
                        ),
                  ),
                  const SizedBox(height: 10),
                  ...orders.map((order) => _OrderListTile(
                        order: order,
                        rating: session.ratingForOrder(order.id),
                        onTap: session.busy
                            ? null
                            : () async {
                                await session.selectTrackingOrder(order.id);
                                if (!context.mounted) return;
                                context.push('/order-tracking');
                              },
                      )),
                ],
              ],
            ),
          ),
          bottomNavigationBar: const LabMainBottomNav(current: LabMainTab.orders),
        );
      },
    );
  }
}

class _NewOrderCta extends StatelessWidget {
  const _NewOrderCta({required this.onTap});

  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final cs = context.cs;
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Ink(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            gradient: LinearGradient(
              colors: [
                cs.primary.withValues(alpha: 0.22),
                cs.primary.withValues(alpha: 0.1),
              ],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            border: Border.all(color: cs.primary.withValues(alpha: 0.35)),
          ),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 14, 16),
            child: Row(
              children: [
                Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    color: cs.primary,
                    borderRadius: BorderRadius.circular(14),
                    boxShadow: [
                      BoxShadow(
                        color: cs.primary.withValues(alpha: 0.35),
                        blurRadius: 10,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: const Icon(Icons.add_rounded, color: AppColors.onPrimary, size: 28),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Order lab test',
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(
                              fontWeight: FontWeight.w700,
                              color: cs.onSurface,
                            ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Add patient details, pick tests, and schedule collection',
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                              color: cs.onSurfaceVariant,
                              height: 1.35,
                            ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                Icon(Icons.arrow_forward_ios_rounded, size: 16, color: cs.primary),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _OrderListTile extends StatelessWidget {
  const _OrderListTile({
    required this.order,
    required this.rating,
    required this.onTap,
  });

  final LabOrderSummary order;
  final OrderRatingSummary? rating;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final status = order.backendStatus ?? 'pending';
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Material(
        color: context.cardFill,
        borderRadius: BorderRadius.circular(14),
        child: Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: const Color(0x66E1E2EC)),
          ),
          child: Column(
            children: [
              InkWell(
                onTap: onTap,
                borderRadius: const BorderRadius.vertical(top: Radius.circular(14)),
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(14, 14, 14, 10),
                  child: Row(
                    children: [
                      Container(
                        width: 40,
                        height: 40,
                        decoration: BoxDecoration(
                          color: context.cs.primary.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Icon(Icons.biotech_outlined, color: context.cs.primary),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              order.patientName.isEmpty ? 'Patient' : order.patientName,
                              style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              order.testType,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: Theme.of(context).textTheme.bodySmall?.copyWith(color: context.cs.onSurfaceVariant),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              'Placed ${order.createdAtLabel}',
                              style: Theme.of(context).textTheme.bodySmall?.copyWith(color: context.cs.onSurfaceVariant),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 8),
                      OrderStatusChip(status: status),
                      const SizedBox(width: 4),
                      Icon(Icons.chevron_right, color: context.cs.onSurfaceVariant),
                    ],
                  ),
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(14, 0, 14, 12),
                child: OrderRatingBar(orderId: order.id, existing: rating),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
