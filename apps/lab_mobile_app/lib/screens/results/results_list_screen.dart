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
import '../../widgets/common/order_list_sort_button.dart';
import '../../widgets/common/order_rating_bar.dart';
import '../../widgets/navigation/lab_main_bottom_nav.dart';

class ResultsListScreen extends StatefulWidget {
  const ResultsListScreen({super.key});

  @override
  State<ResultsListScreen> createState() => _ResultsListScreenState();
}

class _ResultsListScreenState extends State<ResultsListScreen> {
  OrderListSort _sort = OrderListSort.releasedDefault;

  Future<void> _reloadOrders(SessionController session) async {
    await session.refreshReleasedOrders(
      sortBy: _sort.sortBy,
      sortOrder: _sort.sortOrder,
    );
    await session.refreshOrderRatings();
  }

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      await _reloadOrders(SessionScope.of(context));
    });
  }

  @override
  Widget build(BuildContext context) {
    final session = SessionScope.of(context);
    return ListenableBuilder(
      listenable: session,
      builder: (context, _) {
        final orders = session.releasedOrders;
        return Scaffold(
          appBar: AppBar(
            automaticallyImplyLeading: false,
            titleSpacing: 12,
            title: const AppBrandingRow(markSize: 32, iconSize: 16, borderRadius: 8),
          ),
          body: RefreshIndicator(
            onRefresh: () => _reloadOrders(session),
            child: ListView(
              physics: const ClampingScrollPhysics(),
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 20),
              children: [
                Text('Your results', style: Theme.of(context).textTheme.headlineMedium),
                const SizedBox(height: 6),
                Text(
                  'Lab reports the team has released to you.',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: context.cs.onSurfaceVariant),
                ),
                const SizedBox(height: 16),
                if (orders.isEmpty)
                  Padding(
                    padding: EdgeInsets.only(top: MediaQuery.sizeOf(context).height * 0.12),
                    child: Column(
                      children: [
                        Icon(Icons.assignment_outlined, size: 48, color: context.cs.onSurfaceVariant),
                        const SizedBox(height: 12),
                        Text(
                          'No released results yet',
                          textAlign: TextAlign.center,
                          style: Theme.of(context).textTheme.titleMedium,
                        ),
                        const SizedBox(height: 6),
                        Text(
                          'When the lab releases your report, it will show up here for PDF download and AI Check.',
                          textAlign: TextAlign.center,
                          style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: context.cs.onSurfaceVariant),
                        ),
                      ],
                    ),
                  )
                else ...[
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.center,
                    children: [
                      Expanded(
                        child: Text(
                          'Released reports (${orders.length})',
                          style: Theme.of(context).textTheme.titleSmall?.copyWith(
                                fontWeight: FontWeight.w700,
                                color: context.cs.onSurfaceVariant,
                                letterSpacing: 0.2,
                              ),
                        ),
                      ),
                      OrderListSortButton(
                        selected: _sort,
                        options: OrderListSort.releasedOptions,
                        onSelected: (sort) async {
                          setState(() => _sort = sort);
                          await session.refreshReleasedOrders(
                            sortBy: sort.sortBy,
                            sortOrder: sort.sortOrder,
                          );
                        },
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  ...orders.map(
                    (order) => _ReleasedOrderTile(
                      order: order,
                      rating: session.ratingForOrder(order.id),
                      onTap: session.busy
                          ? null
                          : () async {
                              await session.selectResult(order.id);
                              if (!context.mounted) return;
                              context.push('/lab-result-detail');
                            },
                    ),
                  ),
                ],
              ],
            ),
          ),
          bottomNavigationBar: const LabMainBottomNav(current: LabMainTab.results),
        );
      },
    );
  }
}

class _ReleasedOrderTile extends StatelessWidget {
  const _ReleasedOrderTile({
    required this.order,
    required this.rating,
    required this.onTap,
  });

  final LabOrderSummary order;
  final OrderRatingSummary? rating;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
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
                          color: AppColors.accentGreen.withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: const Icon(Icons.assignment_outlined, color: AppColors.accentGreen),
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
                              'Released ${order.createdAtLabel}',
                              style: Theme.of(context).textTheme.bodySmall?.copyWith(color: context.cs.onSurfaceVariant),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 8),
                      const _ReleasedChip(),
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

class _ReleasedChip extends StatelessWidget {
  const _ReleasedChip();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: const Color(0x1F0D8A5B),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: AppColors.accentGreen.withValues(alpha: 0.22)),
      ),
      child: Text(
        'Released',
        style: Theme.of(context).textTheme.labelSmall?.copyWith(
              color: AppColors.accentGreen,
              fontWeight: FontWeight.w700,
            ),
      ),
    );
  }
}
