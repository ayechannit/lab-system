import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../l10n/app_localizations.dart';
import '../../app/session_scope.dart';
import '../../models/lab_order.dart';
import '../../models/order_list_sort.dart';
import '../../models/rating.dart';
import '../../services/session_controller.dart';
import '../../theme/theme_extensions.dart';
import '../../widgets/common/app_branding_row.dart';
import '../../widgets/common/notification_bell_button.dart';
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
    if (!session.isLoggedIn) return;
    await session.refreshReleasedOrders(
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

  @override
  Widget build(BuildContext context) {
    final session = SessionScope.of(context);
    return ListenableBuilder(
      listenable: session,
      builder: (context, _) {
        final orders = session.releasedOrders;
        final l10n = AppLocalizations.of(context)!;
        return Scaffold(
          appBar: AppBar(
            automaticallyImplyLeading: false,
            titleSpacing: 4,
            title: const AppBrandingRow(),
            actions: const [NotificationBellButton()],
          ),
          body: RefreshIndicator(
            onRefresh: () => _reloadOrders(session),
            child: ListView(
              physics: const ClampingScrollPhysics(),
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 20),
              children: [
                Text(l10n.resultsTitle, style: Theme.of(context).textTheme.headlineMedium),
                const SizedBox(height: 6),
                Text(
                  l10n.resultsSubtitle,
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
                          l10n.resultsNoReleasedYet,
                          textAlign: TextAlign.center,
                          style: Theme.of(context).textTheme.titleMedium,
                        ),
                        const SizedBox(height: 6),
                        Text(
                          l10n.resultsNoReleasedHint,
                          textAlign: TextAlign.center,
                          style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: context.cs.onSurfaceVariant),
                        ),
                      ],
                    ),
                  )
                else ...[
                  LayoutBuilder(
                    builder: (context, constraints) {
                      final sortButton = OrderListSortButton(
                        selected: _sort,
                        options: OrderListSort.releasedOptions,
                        onSelected: (sort) async {
                          setState(() => _sort = sort);
                          await session.refreshReleasedOrders(
                            sortBy: sort.sortBy,
                            sortOrder: sort.sortOrder,
                          );
                        },
                      );
                      final heading = Text(
                        l10n.resultsReleasedReportsCount(orders.length),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: Theme.of(context).textTheme.titleSmall?.copyWith(
                              fontWeight: FontWeight.w700,
                              color: context.cs.onSurfaceVariant,
                              letterSpacing: 0.2,
                            ),
                      );
                      if (constraints.maxWidth < 340) {
                        return Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            heading,
                            const SizedBox(height: 8),
                            Align(alignment: Alignment.centerRight, child: sortButton),
                          ],
                        );
                      }
                      return Row(
                        crossAxisAlignment: CrossAxisAlignment.center,
                        children: [
                          Expanded(child: heading),
                          Flexible(
                            child: Align(
                              alignment: Alignment.centerRight,
                              child: FittedBox(
                                fit: BoxFit.scaleDown,
                                alignment: Alignment.centerRight,
                                child: sortButton,
                              ),
                            ),
                          ),
                        ],
                      );
                    },
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
    final accent = context.cs.secondary;
    final l10n = AppLocalizations.of(context)!;
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Material(
        color: context.cardFill,
        borderRadius: BorderRadius.circular(14),
        child: Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: context.subtleBorder),
          ),
          child: Column(
            children: [
              InkWell(
                onTap: onTap,
                borderRadius: const BorderRadius.vertical(top: Radius.circular(14)),
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(14, 14, 14, 10),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        width: 40,
                        height: 40,
                        decoration: BoxDecoration(
                          color: accent.withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Icon(Icons.assignment_outlined, color: accent),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              order.patientName.isEmpty ? l10n.ordersPatientFallback : order.patientName,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
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
                              l10n.resultsReleasedDate(order.createdAtLabel),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: Theme.of(context).textTheme.bodySmall?.copyWith(color: context.cs.onSurfaceVariant),
                            ),
                            const SizedBox(height: 8),
                            Align(
                              alignment: Alignment.centerLeft,
                              child: _ReleasedChip(accent: accent, label: l10n.resultsReleasedBadge),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 4),
                      Padding(
                        padding: const EdgeInsets.only(top: 2),
                        child: Icon(Icons.chevron_right, color: context.cs.onSurfaceVariant),
                      ),
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
  const _ReleasedChip({required this.accent, required this.label});

  final Color accent;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: accent.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: accent.withValues(alpha: 0.22)),
      ),
      child: Text(
        label,
        style: Theme.of(context).textTheme.labelSmall?.copyWith(
              color: accent,
              fontWeight: FontWeight.w700,
            ),
      ),
    );
  }
}
