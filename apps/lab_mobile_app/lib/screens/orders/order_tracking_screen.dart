import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../app/session_scope.dart';
import '../../l10n/app_localizations.dart';
import '../../l10n/order_l10n.dart';
import '../../models/lab_order.dart';
import '../../services/session_controller.dart';
import '../../theme/theme_extensions.dart';
import '../../widgets/common/app_branding_row.dart';
import '../../widgets/common/app_toast.dart';
import '../../widgets/common/notification_bell_button.dart';
import '../../widgets/common/order_status_chip.dart';
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

  String _formatMmk(AppLocalizations l10n, double amount) {
    final whole = amount == amount.roundToDouble()
        ? amount.toStringAsFixed(0)
        : amount.toStringAsFixed(2);
    return l10n.trackingMmk(whole);
  }

  String _reportDeliveryLabel(AppLocalizations l10n, String method) {
    switch (method.trim().toLowerCase()) {
      case 'hard_copy':
        return l10n.orderCreateHardCopy;
      case 'both':
        return l10n.orderCreateBoth;
      case 'soft_copy':
      default:
        return l10n.orderCreateSoftCopy;
    }
  }

  String _priorityLabel(AppLocalizations l10n, OrderPriority priority) {
    return priority == OrderPriority.urgent ? l10n.orderCreateUrgent : l10n.orderCreateElective;
  }

  String _shortOrderId(String id) {
    final clean = id.replaceAll(RegExp(r'[{}]'), '').trim();
    if (clean.length <= 12) return clean;
    return '${clean.substring(0, 8)}…${clean.substring(clean.length - 4)}';
  }

  Widget _shell({
    required BuildContext context,
    required SessionController session,
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
            child: ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 28),
              children: [
                _PageHeader(title: l10n.orderTracking, onBack: () => _goBack(context)),
                SizedBox(height: MediaQuery.sizeOf(context).height * 0.2),
                Text(
                  l10n.trackingEmptyState,
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                        color: context.cs.onSurfaceVariant,
                        height: 1.45,
                      ),
                ),
              ],
            ),
          );
        }

        final testsLabel = localizedTrackingTestLabel(order, l10n);
        final timeline = localizedTrackingTimeline(order, l10n);
        final notes = order.description.trim();
        final testsSubtotal = order.lineItems.fold<double>(0, (a, b) => a + b.subtotalMmk);
        final amountDue = order.finalPriceMmk > 0
            ? order.finalPriceMmk
            : (testsSubtotal + order.materialFeeMmk + order.serviceFeeMmk);

        return _shell(
          context: context,
          session: session,
          child: ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 28),
            children: [
              _PageHeader(title: l10n.orderTracking, onBack: () => _goBack(context)),
              const SizedBox(height: 8),

              // 1) Hero summary — patient + status first
              _SurfaceCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                order.patientName.trim().isEmpty
                                    ? l10n.ordersPatientFallback
                                    : order.patientName.trim(),
                                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                                      fontWeight: FontWeight.w700,
                                      height: 1.25,
                                    ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                '$testsLabel · ${l10n.trackingPlacedOn(order.createdAtLabel)}',
                                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                      color: context.cs.onSurfaceVariant,
                                      height: 1.35,
                                    ),
                              ),
                            ],
                          ),
                        ),
                        if (order.backendStatus != null)
                          OrderStatusChip(status: order.backendStatus, compact: false),
                      ],
                    ),
                    const SizedBox(height: 14),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        _InfoChip(
                          icon: Icons.flag_outlined,
                          label: l10n.trackingLabelPriority,
                          value: _priorityLabel(l10n, order.priority),
                          emphasize: order.priority == OrderPriority.urgent,
                        ),
                        _InfoChip(
                          icon: Icons.description_outlined,
                          label: l10n.trackingLabelDelivery,
                          value: _reportDeliveryLabel(l10n, order.reportDeliveryMethod),
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),
                    _OrderRefRow(
                      label: l10n.trackingOrderRef,
                      shortId: _shortOrderId(order.id),
                      fullId: order.id,
                      copyLabel: l10n.trackingCopyId,
                      onCopied: () {
                        AppToast.successInShell(context, l10n.trackingIdCopied);
                      },
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 12),

              // 2) Status timeline — primary job of this screen
              _SurfaceCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _SectionTitle(
                      icon: Icons.timeline_outlined,
                      title: l10n.trackingStatusSection,
                    ),
                    const SizedBox(height: 12),
                    StatusTimeline(steps: timeline),
                  ],
                ),
              ),

              if (order.hasLabSchedule) ...[
                const SizedBox(height: 12),
                _SurfaceCard(
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _CollectorAvatar(
                        name: order.collectorName,
                        imageUrl: order.collectorProfileImageUrl,
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              l10n.trackingLabSchedule,
                              style: Theme.of(context).textTheme.titleSmall?.copyWith(
                                    fontWeight: FontWeight.w700,
                                    height: 1.3,
                                  ),
                            ),
                            const SizedBox(height: 6),
                            if (order.collectorName != null && order.collectorName!.trim().isNotEmpty)
                              Text(
                                l10n.trackingCollector(order.collectorName!.trim()),
                                style: Theme.of(context).textTheme.bodyMedium?.copyWith(height: 1.35),
                              ),
                            if (order.collectionAcceptedAt != null)
                              Text(
                                l10n.trackingCollection(
                                  formatTrackingDateTime(order.collectionAcceptedAt, l10n),
                                ),
                                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                      color: context.cs.onSurfaceVariant,
                                      height: 1.35,
                                    ),
                              ),
                            if (order.runningAt != null)
                              Text(
                                l10n.trackingRunning(formatTrackingDateTime(order.runningAt, l10n)),
                                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                      color: context.cs.onSurfaceVariant,
                                      height: 1.35,
                                    ),
                              ),
                            if (order.reportOutAt != null)
                              Text(
                                l10n.trackingReportOut(formatTrackingDateTime(order.reportOutAt, l10n)),
                                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                      color: context.cs.onSurfaceVariant,
                                      height: 1.35,
                                    ),
                              ),
                          ],
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                        decoration: BoxDecoration(
                          color: context.cs.primary.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(999),
                        ),
                        child: Text(
                          order.isReportReady ? l10n.orderStatusCompleted : l10n.homeInProgress,
                          style: Theme.of(context).textTheme.labelSmall?.copyWith(
                                color: context.cs.primary,
                                fontWeight: FontWeight.w700,
                                height: 1.3,
                              ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],

              if (order.canConfirmSchedule) ...[
                const SizedBox(height: 12),
                Text(
                  l10n.trackingConfirmScheduleHint,
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: context.cs.onSurfaceVariant,
                        height: 1.4,
                      ),
                ),
                const SizedBox(height: 10),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton(
                    style: FilledButton.styleFrom(
                      minimumSize: const Size.fromHeight(52),
                      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
                    ),
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
                    child: Text(
                      session.busy ? l10n.trackingSaving : l10n.trackingConfirmScheduleButton,
                      style: Theme.of(context).textTheme.labelLarge?.copyWith(
                            height: 1.35,
                            fontWeight: FontWeight.w600,
                            color: context.cs.onPrimary,
                          ),
                    ),
                  ),
                ),
              ],

              const SizedBox(height: 12),

              // 3) Address
              if (order.address.line.trim().isNotEmpty)
                _SurfaceCard(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _SectionTitle(
                        icon: Icons.location_on_outlined,
                        title: l10n.trackingLabelAddress,
                      ),
                      const SizedBox(height: 10),
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: context.appExtras.surfaceContainer.withValues(alpha: 0.65),
                          borderRadius: BorderRadius.circular(14),
                        ),
                        child: Text(
                          order.address.line.trim(),
                          style: Theme.of(context).textTheme.bodyMedium?.copyWith(height: 1.45),
                        ),
                      ),
                    ],
                  ),
                ),

              if (order.address.line.trim().isNotEmpty) const SizedBox(height: 12),

              // 4) Patient
              _SurfaceCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _SectionTitle(
                      icon: Icons.person_outline,
                      title: l10n.trackingPatientSection,
                    ),
                    const SizedBox(height: 4),
                    _KeyValueRow(
                      icon: Icons.badge_outlined,
                      label: l10n.trackingLabelName,
                      value: order.patientName.trim().isEmpty
                          ? l10n.ordersPatientFallback
                          : order.patientName.trim(),
                    ),
                    if (order.patientAge != null)
                      _KeyValueRow(
                        icon: Icons.cake_outlined,
                        label: l10n.trackingLabelAge,
                        value: '${order.patientAge}',
                      ),
                    if (order.patientPhone != null && order.patientPhone!.isNotEmpty)
                      _KeyValueRow(
                        icon: Icons.call_outlined,
                        label: l10n.trackingLabelPhone,
                        value: order.patientPhone!,
                        isLast: true,
                      ),
                  ],
                ),
              ),

              const SizedBox(height: 12),

              // 5) Tests + pricing in one card
              _SurfaceCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _SectionTitle(
                      icon: Icons.science_outlined,
                      title: l10n.trackingTestsSection,
                    ),
                    const SizedBox(height: 8),
                    if (order.lineItems.isEmpty)
                      Text(
                        l10n.trackingNoTestsYet,
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                              color: context.cs.onSurfaceVariant,
                              height: 1.4,
                            ),
                      )
                    else
                      for (var i = 0; i < order.lineItems.length; i++) ...[
                        _TestLineRow(
                          name: order.lineItems[i].testName,
                          code: order.lineItems[i].testCode,
                          price: order.lineItems[i].subtotalMmk > 0
                              ? _formatMmk(l10n, order.lineItems[i].subtotalMmk)
                              : null,
                        ),
                        if (i < order.lineItems.length - 1) const SizedBox(height: 4),
                      ],
                    if (order.lineItems.isNotEmpty || order.hasPricing) ...[
                      const SizedBox(height: 12),
                      Divider(height: 1, color: context.cs.outline.withValues(alpha: 0.35)),
                      const SizedBox(height: 12),
                      if (testsSubtotal > 0)
                        _PriceRow(
                          label: l10n.trackingTestsTotal,
                          value: _formatMmk(l10n, testsSubtotal),
                        ),
                      if (order.materialFeeMmk > 0)
                        _PriceRow(
                          label: l10n.trackingMaterialFee,
                          value: _formatMmk(l10n, order.materialFeeMmk),
                        ),
                      if (order.serviceFeeMmk > 0)
                        _PriceRow(
                          label: l10n.trackingServiceFee,
                          value: _formatMmk(l10n, order.serviceFeeMmk),
                        ),
                      if (order.discountPercent > 0)
                        Padding(
                          padding: const EdgeInsets.only(bottom: 8),
                          child: Text(
                            l10n.trackingDiscount(order.discountPercent.toStringAsFixed(
                              order.discountPercent == order.discountPercent.roundToDouble() ? 0 : 1,
                            )),
                            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                  color: context.cs.onSurfaceVariant,
                                  height: 1.35,
                                ),
                          ),
                        ),
                      if (amountDue > 0)
                        _PriceRow(
                          label: l10n.trackingAmountDue,
                          value: _formatMmk(l10n, amountDue),
                          emphasize: true,
                        ),
                      if (order.totalPaidMmk > 0)
                        _PriceRow(
                          label: l10n.trackingPaid,
                          value: _formatMmk(l10n, order.totalPaidMmk),
                        ),
                      if (order.totalPaidMmk > 0 || (order.balanceMmk != 0 && amountDue > 0))
                        _PriceRow(
                          label: l10n.trackingBalance,
                          value: _formatMmk(l10n, order.balanceMmk),
                          emphasize: true,
                          isLast: true,
                        ),
                    ],
                  ],
                ),
              ),

              if (notes.isNotEmpty || order.prescriptionUrl != null) ...[
                const SizedBox(height: 12),
                _SurfaceCard(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _SectionTitle(
                        icon: Icons.sticky_note_2_outlined,
                        title: l10n.trackingNotesSection,
                      ),
                      const SizedBox(height: 8),
                      if (notes.isNotEmpty)
                        Text(
                          notes,
                          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                color: context.cs.onSurfaceVariant,
                                height: 1.45,
                              ),
                        ),
                      if (order.prescriptionUrl != null) ...[
                        if (notes.isNotEmpty) const SizedBox(height: 8),
                        TextButton.icon(
                          onPressed: () async {
                            final uri = Uri.tryParse(order.prescriptionUrl!);
                            if (uri == null) return;
                            await launchUrl(uri, mode: LaunchMode.externalApplication);
                          },
                          icon: const Icon(Icons.attach_file, size: 18),
                          label: Text(l10n.trackingPrescriptionAttached),
                        ),
                      ],
                    ],
                  ),
                ),
              ],
            ],
          ),
        );
      },
    );
  }
}

class _PageHeader extends StatelessWidget {
  const _PageHeader({required this.title, required this.onBack});

  final String title;
  final VoidCallback onBack;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    return Row(
      children: [
        IconButton(
          tooltip: l10n.profileBack,
          onPressed: onBack,
          icon: Icon(Icons.arrow_back_rounded, color: context.cs.primary),
        ),
        Expanded(
          child: Text(
            title,
            style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                  fontWeight: FontWeight.w700,
                  height: 1.25,
                ),
          ),
        ),
      ],
    );
  }
}

class _SurfaceCard extends StatelessWidget {
  const _SurfaceCard({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: EdgeInsets.zero,
      clipBehavior: Clip.antiAlias,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 14),
        child: child,
      ),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  const _SectionTitle({required this.icon, required this.title});

  final IconData icon;
  final String title;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, size: 20, color: context.cs.primary),
        const SizedBox(width: 8),
        Expanded(
          child: Text(
            title,
            style: Theme.of(context).textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.w700,
                  height: 1.3,
                ),
          ),
        ),
      ],
    );
  }
}

class _InfoChip extends StatelessWidget {
  const _InfoChip({
    required this.icon,
    required this.label,
    required this.value,
    this.emphasize = false,
  });

  final IconData icon;
  final String label;
  final String value;
  final bool emphasize;

  @override
  Widget build(BuildContext context) {
    final accent = emphasize ? const Color(0xFFB45309) : context.cs.primary;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: BoxDecoration(
        color: accent.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: accent.withValues(alpha: 0.18)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 16, color: accent),
          const SizedBox(width: 6),
          ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 220),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: Theme.of(context).textTheme.labelSmall?.copyWith(
                        color: context.cs.onSurfaceVariant,
                        height: 1.2,
                      ),
                ),
                Text(
                  value,
                  style: Theme.of(context).textTheme.labelLarge?.copyWith(
                        color: accent,
                        fontWeight: FontWeight.w700,
                        height: 1.3,
                      ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _OrderRefRow extends StatelessWidget {
  const _OrderRefRow({
    required this.label,
    required this.shortId,
    required this.fullId,
    required this.copyLabel,
    required this.onCopied,
  });

  final String label;
  final String shortId;
  final String fullId;
  final String copyLabel;
  final VoidCallback onCopied;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(12, 10, 6, 10),
      decoration: BoxDecoration(
        color: context.appExtras.surfaceContainer.withValues(alpha: 0.55),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: Theme.of(context).textTheme.labelSmall?.copyWith(
                        color: context.cs.onSurfaceVariant,
                        height: 1.2,
                      ),
                ),
                const SizedBox(height: 2),
                Text(
                  shortId,
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        fontWeight: FontWeight.w600,
                        letterSpacing: 0.2,
                        height: 1.3,
                      ),
                ),
              ],
            ),
          ),
          TextButton.icon(
            onPressed: () async {
              await Clipboard.setData(ClipboardData(text: fullId));
              onCopied();
            },
            icon: const Icon(Icons.copy_outlined, size: 16),
            label: Text(copyLabel),
            style: TextButton.styleFrom(
              visualDensity: VisualDensity.compact,
              foregroundColor: context.cs.primary,
            ),
          ),
        ],
      ),
    );
  }
}

class _KeyValueRow extends StatelessWidget {
  const _KeyValueRow({
    required this.icon,
    required this.label,
    required this.value,
    this.isLast = false,
  });

  final IconData icon;
  final String label;
  final String value;
  final bool isLast;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(top: 10, bottom: isLast ? 2 : 0),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 18, color: context.cs.onSurfaceVariant),
          const SizedBox(width: 10),
          SizedBox(
            width: 88,
            child: Text(
              label,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: context.cs.onSurfaceVariant,
                    height: 1.35,
                  ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                    fontWeight: FontWeight.w600,
                    height: 1.35,
                  ),
            ),
          ),
        ],
      ),
    );
  }
}

class _TestLineRow extends StatelessWidget {
  const _TestLineRow({
    required this.name,
    required this.code,
    required this.price,
  });

  final String name;
  final String code;
  final String? price;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 8,
            height: 8,
            margin: const EdgeInsets.only(top: 7),
            decoration: BoxDecoration(
              color: context.cs.primary.withValues(alpha: 0.7),
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  name,
                  style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                        fontWeight: FontWeight.w600,
                        height: 1.3,
                      ),
                ),
                if (code.trim().isNotEmpty)
                  Text(
                    code.trim(),
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: context.cs.onSurfaceVariant,
                          height: 1.3,
                        ),
                  ),
              ],
            ),
          ),
          if (price != null)
            Text(
              price!,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    fontWeight: FontWeight.w600,
                    height: 1.3,
                  ),
            ),
        ],
      ),
    );
  }
}

class _PriceRow extends StatelessWidget {
  const _PriceRow({
    required this.label,
    required this.value,
    this.emphasize = false,
    this.isLast = false,
  });

  final String label;
  final String value;
  final bool emphasize;
  final bool isLast;

  @override
  Widget build(BuildContext context) {
    final style = emphasize
        ? Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700, height: 1.3)
        : Theme.of(context).textTheme.bodyMedium?.copyWith(height: 1.3);
    return Padding(
      padding: EdgeInsets.only(bottom: isLast ? 0 : 8),
      child: Row(
        children: [
          Expanded(child: Text(label, style: style?.copyWith(color: emphasize ? null : context.cs.onSurfaceVariant))),
          Text(value, style: style),
        ],
      ),
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
      width: 44,
      height: 44,
      decoration: BoxDecoration(
        color: cs.primary.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
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
