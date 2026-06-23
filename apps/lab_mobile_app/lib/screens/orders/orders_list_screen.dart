import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../app/session_scope.dart';
import '../../models/lab_order.dart';
import '../../models/order_list_sort.dart';
import '../../models/rating.dart';
import '../../services/session_controller.dart';
import '../../theme/app_colors.dart';
import '../../theme/theme_extensions.dart';
import '../../widgets/common/app_branding_row.dart';
import '../../widgets/common/notification_bell_button.dart';
import '../../widgets/common/order_rating_bar.dart';
import '../../widgets/common/order_status_chip.dart';
import '../../widgets/navigation/lab_main_bottom_nav.dart';

class OrdersListScreen extends StatefulWidget {
  const OrdersListScreen({super.key});

  @override
  State<OrdersListScreen> createState() => _OrdersListScreenState();
}

class _OrdersListScreenState extends State<OrdersListScreen> {
  static const _allStatuses = <String>[
    'pending',
    'scheduled',
    'collecting',
    'running',
    'completed',
  ];

  /// Empty string = All.
  String _statusFilter = '';
  OrderListSort _sort = OrderListSort.activeDefault;

  Future<void> _reloadOrders(SessionController session) async {
    if (!session.isLoggedIn) return;
    await session.refreshActiveOrders(
      sortBy: _sort.sortBy,
      sortOrder: _sort.sortOrder,
    );
    await session.refreshOrderRatings();
  }

  void _scheduleReload() {
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      if (!mounted) return;
      await _reloadOrders(SessionScope.of(context));
    });
  }

  @override
  void initState() {
    super.initState();
    _scheduleReload();
  }

  @override
  void activate() {
    super.activate();
    _scheduleReload();
  }

  String _normalizeStatus(LabOrderSummary order) =>
      (order.backendStatus ?? 'pending').trim().toLowerCase();

  int _countForStatus(List<LabOrderSummary> orders, String status) {
    if (status.isEmpty) return orders.length;
    return orders.where((o) => _normalizeStatus(o) == status).length;
  }

  List<LabOrderSummary> _filteredOrders(List<LabOrderSummary> orders) {
    if (_statusFilter.isEmpty) return orders;
    return orders.where((o) => _normalizeStatus(o) == _statusFilter).toList();
  }

  String _filterLabel(String status) {
    if (status.isEmpty) return 'All';
    return orderStatusStyleFor(status).label;
  }

  @override
  Widget build(BuildContext context) {
    final session = SessionScope.of(context);
    return ListenableBuilder(
      listenable: session,
      builder: (context, _) {
        final orders = session.activeOrders;
        final filtered = _filteredOrders(orders);
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
              const NotificationBellButton(),
            ],
          ),
          body: RefreshIndicator(
            onRefresh: () => _reloadOrders(session),
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
                  const SizedBox(height: 10),
                  _OrderListFilters(
                    totalCount: orders.length,
                    statusFilter: _statusFilter,
                    statuses: _allStatuses,
                    countFor: (status) => _countForStatus(orders, status),
                    onStatusSelected: (status) => setState(() => _statusFilter = status),
                    sort: _sort,
                    onSortSelected: (sort) async {
                      setState(() => _sort = sort);
                      await session.refreshActiveOrders(
                        sortBy: sort.sortBy,
                        sortOrder: sort.sortOrder,
                      );
                    },
                  ),
                  const SizedBox(height: 12),
                  if (filtered.isEmpty)
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 24),
                      child: Column(
                        children: [
                          Icon(Icons.filter_list_off_outlined, size: 40, color: context.cs.onSurfaceVariant),
                          const SizedBox(height: 10),
                          Text(
                            'No ${_filterLabel(_statusFilter).toLowerCase()} orders',
                            textAlign: TextAlign.center,
                            style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'Try another status tab or place a new order.',
                            textAlign: TextAlign.center,
                            style: Theme.of(context).textTheme.bodySmall?.copyWith(color: context.cs.onSurfaceVariant),
                          ),
                        ],
                      ),
                    )
                  else
                    ...filtered.map((order) => _OrderListTile(
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

class _OrderListFilters extends StatelessWidget {
  const _OrderListFilters({
    required this.totalCount,
    required this.statusFilter,
    required this.statuses,
    required this.countFor,
    required this.onStatusSelected,
    required this.sort,
    required this.onSortSelected,
  });

  final int totalCount;
  final String statusFilter;
  final List<String> statuses;
  final int Function(String status) countFor;
  final ValueChanged<String> onStatusSelected;
  final OrderListSort sort;
  final ValueChanged<OrderListSort> onSortSelected;

  @override
  Widget build(BuildContext context) {
    final cs = context.cs;
    final statusLabel = statusFilter.isEmpty ? 'All orders' : orderStatusStyleFor(statusFilter).label;
    final statusCount = countFor(statusFilter);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          'Active orders ($totalCount)',
          style: Theme.of(context).textTheme.titleSmall?.copyWith(
                fontWeight: FontWeight.w700,
                color: cs.onSurfaceVariant,
                letterSpacing: 0.2,
              ),
        ),
        const SizedBox(height: 10),
        Row(
          children: [
            Expanded(
              child: _FilterControlTile(
                icon: Icons.filter_list_rounded,
                label: 'Status',
                value: '$statusLabel · $statusCount',
                onTap: () => _openStatusSheet(context),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: _FilterControlTile(
                icon: Icons.sort_rounded,
                label: 'Sort',
                value: sort.label,
                onTap: () => _openSortSheet(context),
              ),
            ),
          ],
        ),
      ],
    );
  }

  Future<void> _openStatusSheet(BuildContext context) async {
    final cs = context.cs;
    final tabs = ['', ...statuses];
    final picked = await showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (sheetContext) {
        return SafeArea(
          child: ListView(
            shrinkWrap: true,
            padding: const EdgeInsets.fromLTRB(8, 4, 8, 12),
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(12, 4, 12, 8),
                child: Text(
                  'Filter by status',
                  style: Theme.of(sheetContext).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
                ),
              ),
              for (final status in tabs)
                _StatusFilterSheetTile(
                  status: status,
                  label: status.isEmpty ? 'All orders' : orderStatusStyleFor(status).label,
                  count: countFor(status),
                  selected: statusFilter == status,
                  onTap: () => Navigator.pop(sheetContext, status),
                ),
              Padding(
                padding: const EdgeInsets.fromLTRB(12, 8, 12, 4),
                child: Text(
                  'Only active orders that are not yet delivered appear here.',
                  style: Theme.of(sheetContext).textTheme.bodySmall?.copyWith(color: cs.onSurfaceVariant),
                ),
              ),
            ],
          ),
        );
      },
    );
    if (picked != null && picked != statusFilter) {
      onStatusSelected(picked);
    }
  }

  Future<void> _openSortSheet(BuildContext context) async {
    final picked = await showModalBottomSheet<OrderListSort>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (sheetContext) {
        final cs = sheetContext.cs;
        return SafeArea(
          child: ListView(
            shrinkWrap: true,
            padding: const EdgeInsets.only(bottom: 8),
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 4, 20, 8),
                child: Text(
                  'Sort by',
                  style: Theme.of(sheetContext).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
                ),
              ),
              for (final option in OrderListSort.activeOptions)
                ListTile(
                  leading: Icon(
                    sort == option ? Icons.check_circle_rounded : Icons.circle_outlined,
                    color: sort == option ? cs.primary : cs.onSurfaceVariant,
                  ),
                  title: Text(option.label),
                  onTap: () => Navigator.pop(sheetContext, option),
                ),
            ],
          ),
        );
      },
    );
    if (picked != null && picked != sort) {
      onSortSelected(picked);
    }
  }
}

class _FilterControlTile extends StatelessWidget {
  const _FilterControlTile({
    required this.icon,
    required this.label,
    required this.value,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final String value;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final cs = context.cs;
    return Material(
      color: context.cardFill,
      borderRadius: BorderRadius.circular(14),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.fromLTRB(12, 11, 10, 11),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: const Color(0x66E1E2EC)),
          ),
          child: Row(
            children: [
              Container(
                width: 34,
                height: 34,
                decoration: BoxDecoration(
                  color: cs.primary.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(icon, size: 18, color: cs.primary),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      label,
                      style: Theme.of(context).textTheme.labelSmall?.copyWith(
                            color: cs.onSurfaceVariant,
                            fontWeight: FontWeight.w600,
                          ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      value,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: Theme.of(context).textTheme.labelLarge?.copyWith(
                            fontWeight: FontWeight.w700,
                          ),
                    ),
                  ],
                ),
              ),
              Icon(Icons.keyboard_arrow_down_rounded, size: 22, color: cs.onSurfaceVariant),
            ],
          ),
        ),
      ),
    );
  }
}

class _StatusFilterSheetTile extends StatelessWidget {
  const _StatusFilterSheetTile({
    required this.status,
    required this.label,
    required this.count,
    required this.selected,
    required this.onTap,
  });

  final String status;
  final String label;
  final int count;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final cs = context.cs;
    final style = status.isEmpty
        ? OrderStatusStyle(
            label: label,
            foreground: cs.primary,
            background: cs.primary.withValues(alpha: 0.1),
          )
        : orderStatusStyleFor(status);

    return ListTile(
      onTap: onTap,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      selected: selected,
      selectedTileColor: cs.primary.withValues(alpha: 0.08),
      leading: Container(
        width: 36,
        height: 36,
        decoration: BoxDecoration(
          color: style.background,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: style.foreground.withValues(alpha: 0.2)),
        ),
        child: Icon(
          _orderStatusIcon(status),
          size: 18,
          color: style.foreground,
        ),
      ),
      title: Text(
        label,
        style: Theme.of(context).textTheme.titleSmall?.copyWith(
              fontWeight: selected ? FontWeight.w700 : FontWeight.w600,
            ),
      ),
      trailing: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
            decoration: BoxDecoration(
              color: selected ? cs.primary : cs.surfaceContainerHighest.withValues(alpha: 0.8),
              borderRadius: BorderRadius.circular(999),
            ),
            child: Text(
              '$count',
              style: Theme.of(context).textTheme.labelMedium?.copyWith(
                    color: selected ? cs.onPrimary : cs.onSurfaceVariant,
                    fontWeight: FontWeight.w700,
                  ),
            ),
          ),
          if (selected) ...[
            const SizedBox(width: 8),
            Icon(Icons.check_rounded, color: cs.primary, size: 22),
          ],
        ],
      ),
    );
  }
}

IconData _orderStatusIcon(String status) {
  switch (status) {
    case '':
      return Icons.layers_outlined;
    case 'pending':
      return Icons.hourglass_top_rounded;
    case 'scheduled':
      return Icons.event_available_outlined;
    case 'collecting':
      return Icons.biotech_outlined;
    case 'running':
      return Icons.autorenew_rounded;
    case 'completed':
      return Icons.task_alt_rounded;
    default:
      return Icons.circle_outlined;
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
