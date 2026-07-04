import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../app/session_scope.dart';
import '../../l10n/app_localizations.dart';
import '../../l10n/order_l10n.dart';
import '../../services/session_controller.dart';
import '../../theme/theme_extensions.dart';
import '../../widgets/common/app_branding_row.dart';
import '../../widgets/common/app_toast.dart';
import '../../widgets/common/notification_bell_button.dart';
import '../../widgets/common/order_status_chip.dart';
import '../../widgets/common/section_card.dart';
import '../../widgets/common/status_timeline.dart';
import '../../widgets/navigation/lab_main_bottom_nav.dart';

class OrderTrackingScreen extends StatelessWidget {
  const OrderTrackingScreen({super.key});

  void _goBack(BuildContext context) {
    if (context.canPop()) {
      context.pop();
      return;
    }
    context.go('/orders');
  }

  Widget _pageHeader(BuildContext context, AppLocalizations l10n) {
    return Row(
      children: [
        IconButton(
          tooltip: l10n.profileBack,
          onPressed: () => _goBack(context),
          icon: Icon(Icons.arrow_back_rounded, color: context.cs.primary),
        ),
        Expanded(
          child: Text(
            l10n.orderTracking,
            style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                  fontWeight: FontWeight.w700,
                ),
          ),
        ),
      ],
    );
  }

  Widget _shell({
    required BuildContext context,
    required SessionController session,
    required AppLocalizations l10n,
    required Widget child,
  }) {
    return Scaffold(
      appBar: AppBar(
        automaticallyImplyLeading: false,
        titleSpacing: 4,
        title: const AppBrandingRow(),
        actions: const [NotificationBellButton()],
      ),
      bottomNavigationBar: const LabMainBottomNav(current: LabMainTab.orders),
      body: RefreshIndicator(
        onRefresh: () => session.refreshTracking(),
        child: child,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final session = SessionScope.of(context);
    final l10n = AppLocalizations.of(context)!;
    return ListenableBuilder(
      listenable: session,
      builder: (context, _) {
        final order = session.trackingOrder;
        if (order == null) {
          return _shell(
            context: context,
            session: session,
            l10n: l10n,
            child: ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
              children: [
                _pageHeader(context, l10n),
                SizedBox(height: MediaQuery.sizeOf(context).height * 0.2),
                Text(
                  l10n.trackingEmptyState,
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.bodyLarge?.copyWith(color: context.cs.onSurfaceVariant),
                ),
              ],
            ),
          );
        }

        final testsLabel = localizedTrackingTestLabel(order, l10n);
        final timeline = localizedTrackingTimeline(order, l10n);
        final scheduleLines = <String>[
          if (order.collectorName != null && order.collectorName!.trim().isNotEmpty)
            l10n.trackingCollector(order.collectorName!.trim()),
          if (order.collectionAcceptedAt != null)
            l10n.trackingCollection(formatTrackingDateTime(order.collectionAcceptedAt, l10n)),
          if (order.runningAt != null)
            l10n.trackingRunning(formatTrackingDateTime(order.runningAt, l10n)),
          if (order.reportOutAt != null)
            l10n.trackingReportOut(formatTrackingDateTime(order.reportOutAt, l10n)),
        ];

        return _shell(
          context: context,
          session: session,
          l10n: l10n,
          child: ListView(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
            children: [
              _pageHeader(context, l10n),
              const SizedBox(height: 12),
              SectionCard(
                  title: l10n.trackingOrderId(order.id),
                  subtitle: order.createdAtLabel,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        l10n.trackingPatientLine(order.patientName, testsLabel),
                        style: Theme.of(context).textTheme.bodyLarge,
                      ),
                      if (order.address.line.trim().isNotEmpty) ...[
                        const SizedBox(height: 6),
                        Text(l10n.trackingAddress(order.address.line.trim())),
                      ],
                      if (order.backendStatus != null) ...[
                        const SizedBox(height: 8),
                        OrderStatusChip(status: order.backendStatus, compact: false),
                      ],
                    ],
                  ),
                ),
                if (order.hasLabSchedule) ...[
                  const SizedBox(height: 16),
                  Card(
                    child: ListTile(
                      leading: (order.collectorName != null || order.collectorProfileImageUrl != null)
                          ? _CollectorAvatar(
                              name: order.collectorName,
                              imageUrl: order.collectorProfileImageUrl,
                            )
                          : null,
                      title: Text(l10n.trackingLabSchedule),
                      subtitle: scheduleLines.isEmpty
                          ? null
                          : Text(scheduleLines.join('\n')),
                      trailing: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: context.cs.primary.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(999),
                        ),
                        child: Text(order.isReportReady ? l10n.orderStatusCompleted : l10n.homeInProgress),
                      ),
                    ),
                  ),
                ],
                if (order.canConfirmSchedule) ...[
                  const SizedBox(height: 12),
                  Text(
                    l10n.trackingConfirmScheduleHint,
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
                                l10n.trackingScheduleConfirmedMessage,
                                title: l10n.trackingScheduleConfirmedTitle,
                              );
                            } catch (e) {
                              if (!context.mounted) return;
                              AppToast.errorInShell(context, '$e');
                            }
                          },
                    child: Text(session.busy ? l10n.trackingSaving : l10n.trackingConfirmScheduleButton),
                  ),
                ],
                const SizedBox(height: 12),
                Text(
                  l10n.trackingStatusSection,
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w700,
                        color: context.cs.primary,
                      ),
                ),
                const SizedBox(height: 12),
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: StatusTimeline(steps: timeline),
                  ),
                ),
              ],
            ),
        );
      },
    );
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
