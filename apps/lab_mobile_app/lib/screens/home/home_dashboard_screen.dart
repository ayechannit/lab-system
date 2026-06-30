import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../app/session_scope.dart';
import '../../l10n/app_localizations.dart';
import '../../models/lab_order.dart';
import '../../models/user_report.dart';
import '../../theme/theme_extensions.dart';
import '../../widgets/common/app_branding_row.dart';
import '../../widgets/common/notification_bell_button.dart';
import '../../widgets/home/home_advertisement_section.dart';
import '../../widgets/navigation/lab_main_bottom_nav.dart';

/// Single home dashboard for all user roles (patient, doctor, clinic, phlebotomist).
class HomeDashboardScreen extends StatefulWidget {
  const HomeDashboardScreen({super.key});

  @override
  State<HomeDashboardScreen> createState() => _HomeDashboardScreenState();
}

class _HomeDashboardScreenState extends State<HomeDashboardScreen> {
  static const double _maxContentWidth = 720;

  Future<void> _onRefresh(BuildContext context) async {
    await SessionScope.of(context).refreshHomeTab();
  }

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: SessionScope.of(context),
      builder: (context, _) {
        final session = SessionScope.of(context);
        final user = session.user;
        if (user == null) {
          WidgetsBinding.instance.addPostFrameCallback((_) {
            if (context.mounted) context.go('/login');
          });
          return const Scaffold(
            body: Center(child: CircularProgressIndicator()),
          );
        }

        final name = user.name;
        final tracking = session.trackingOrder;
        final report = session.userReport;
        final loading = session.homeSummaryLoading && report == null;
        final l10n = AppLocalizations.of(context)!;

        return Scaffold(
          appBar: AppBar(
            automaticallyImplyLeading: false,
            titleSpacing: 4,
            title: GestureDetector(
              onTap: () => context.push('/profile'),
              child: const AppBrandingRow(size: 36),
            ),
            actions: const [NotificationBellButton()],
          ),
          body: LayoutBuilder(
            builder: (context, constraints) {
              final w = constraints.maxWidth;
              final pad = EdgeInsets.symmetric(
                horizontal: w > _maxContentWidth + 40 ? (w - _maxContentWidth) / 2 : 20,
                vertical: 20,
              );

              return RefreshIndicator(
                onRefresh: () => _onRefresh(context),
                child: ListView(
                  padding: pad,
                  physics: const AlwaysScrollableScrollPhysics(),
                  children: [
                    _WelcomeHeader(name: name),
                    if (session.homeSummaryError != null) ...[
                      const SizedBox(height: 12),
                      _ErrorBanner(message: session.homeSummaryError!),
                    ],
                    const SizedBox(height: 18),
                    HomeAdvertisementSection(
                      advertisements: session.advertisements,
                      loading: session.homeSummaryLoading && session.advertisements.isEmpty,
                    ),
                    if (session.advertisements.isNotEmpty ||
                        (session.homeSummaryLoading && session.advertisements.isEmpty))
                      const SizedBox(height: 18),
                    _SectionTitle(
                      label: l10n.homeOverviewLabel,
                      title: l10n.homeAccountSummary,
                      subtitle: l10n.homeLiveMetrics,
                    ),
                    const SizedBox(height: 12),
                    if (loading)
                      const _KpiSkeleton()
                    else
                      _KpiGrid(
                        kpis: report?.kpis ?? UserReportSummary.empty.kpis,
                        onPointsTap: () => context.push('/loyalty'),
                      ),
                    if (tracking != null) ...[
                      const SizedBox(height: 14),
                      _ActiveOrderBanner(
                        order: tracking,
                        onTap: () => context.push('/order-tracking'),
                      ),
                    ],
                    const SizedBox(height: 18),
                    _SpendTrendCard(points: report?.spendTrend ?? const []),
                    const SizedBox(height: 18),
                    _TopTestsCard(tests: report?.topTests ?? const []),
                    const SizedBox(height: 24),
                  ],
                ),
              );
            },
          ),
          bottomNavigationBar: const LabMainBottomNav(current: LabMainTab.home),
        );
      },
    );
  }
}

class _SectionTitle extends StatelessWidget {
  const _SectionTitle({
    required this.label,
    required this.title,
    required this.subtitle,
  });

  final String label;
  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    final cs = context.cs;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: Theme.of(context).textTheme.labelSmall?.copyWith(
                color: cs.onSurfaceVariant,
                letterSpacing: 1.0,
              ),
        ),
        const SizedBox(height: 6),
        Text(
          title,
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w700,
              ),
        ),
        const SizedBox(height: 4),
        Text(
          subtitle,
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: cs.onSurfaceVariant,
              ),
        ),
      ],
    );
  }
}

class _ErrorBanner extends StatelessWidget {
  const _ErrorBanner({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    final extras = context.appExtras;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: extras.errorPanelBg,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: extras.errorPanelBorder),
      ),
      child: Row(
        children: [
          Icon(Icons.error_outline, size: 20, color: extras.errorPanelText),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              message,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: extras.errorPanelText,
                    height: 1.35,
                  ),
            ),
          ),
        ],
      ),
    );
  }
}

class _KpiGrid extends StatelessWidget {
  const _KpiGrid({
    required this.kpis,
    required this.onPointsTap,
  });

  final UserReportKpis kpis;
  final VoidCallback onPointsTap;

  @override
  Widget build(BuildContext context) {
    final cs = context.cs;
    final l10n = AppLocalizations.of(context)!;
    final iconTile = context.appExtras.iconTileBackground;
    return LayoutBuilder(
      builder: (context, constraints) {
        final wide = constraints.maxWidth >= 520;
        final spentLabel = _formatMmk(kpis.totalSpent);
        final tiles = [
          _KpiTile(
            icon: Icons.receipt_long_outlined,
            iconColor: cs.primary,
            iconBg: iconTile,
            label: l10n.homeTotalOrders,
            value: '${kpis.totalOrders}',
            hint: l10n.homeCompletedOrdersCount(kpis.completedOrders),
          ),
          _KpiTile(
            icon: Icons.payments_outlined,
            iconColor: cs.secondary,
            iconBg: cs.secondary.withValues(alpha: 0.12),
            label: l10n.homeTotalSpent,
            value: '$spentLabel ${l10n.homeMmkSuffix}',
            hint: l10n.homeDeliveredOrders,
          ),
          _KpiTile(
            icon: Icons.military_tech_outlined,
            iconColor: const Color(0xFFB45309),
            iconBg: const Color(0xFFFFF4E5),
            label: l10n.homeLoyaltyPoints,
            value: '${kpis.loyaltyPoints}',
            hint: l10n.homeTapForHistory,
            onTap: onPointsTap,
          ),
          _KpiTile(
            icon: Icons.hourglass_top_outlined,
            iconColor: const Color(0xFF7C3AED),
            iconBg: const Color(0xFFF3E8FF),
            label: l10n.homeInProgress,
            value: '${kpis.pendingOrders}',
            hint: l10n.homeOpenOrders,
          ),
        ];

        if (wide) {
          return Column(
            children: [
              Row(
                children: [
                  Expanded(child: tiles[0]),
                  const SizedBox(width: 10),
                  Expanded(child: tiles[1]),
                ],
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(child: tiles[2]),
                  const SizedBox(width: 10),
                  Expanded(child: tiles[3]),
                ],
              ),
            ],
          );
        }

        return Column(
          children: [
            for (var i = 0; i < tiles.length; i++) ...[
              if (i > 0) const SizedBox(height: 10),
              tiles[i],
            ],
          ],
        );
      },
    );
  }

  static String _formatMmk(double value) {
    final n = value.round();
    if (n >= 1000000) return '${(n / 1000000).toStringAsFixed(1)}M';
    if (n >= 1000) {
      final s = n.toString();
      final buf = StringBuffer();
      for (var i = 0; i < s.length; i++) {
        if (i > 0 && (s.length - i) % 3 == 0) buf.write(',');
        buf.write(s[i]);
      }
      return buf.toString();
    }
    return '$n';
  }
}

class _KpiTile extends StatelessWidget {
  const _KpiTile({
    required this.icon,
    required this.iconColor,
    required this.iconBg,
    required this.label,
    required this.value,
    required this.hint,
    this.onTap,
  });

  final IconData icon;
  final Color iconColor;
  final Color iconBg;
  final String label;
  final String value;
  final String hint;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final cs = context.cs;
    return Material(
      color: context.cardFill,
      borderRadius: BorderRadius.circular(14),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        child: Container(
          width: double.infinity,
          padding: const EdgeInsets.fromLTRB(14, 14, 14, 16),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: cs.outline.withValues(alpha: 0.4)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: iconBg,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Icon(icon, size: 20, color: iconColor),
                  ),
                  const Spacer(),
                  if (onTap != null)
                    Icon(Icons.chevron_right, size: 20, color: cs.onSurfaceVariant),
                ],
              ),
              const SizedBox(height: 12),
              Text(
                label,
                style: Theme.of(context).textTheme.labelLarge?.copyWith(
                      color: cs.onSurfaceVariant,
                    ),
              ),
              const SizedBox(height: 4),
              FittedBox(
                fit: BoxFit.scaleDown,
                alignment: Alignment.centerLeft,
                child: Text(
                  value,
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                ),
              ),
              const SizedBox(height: 4),
              Text(
                hint,
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: cs.onSurfaceVariant,
                    ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _KpiSkeleton extends StatelessWidget {
  const _KpiSkeleton();

  @override
  Widget build(BuildContext context) {
    final cs = context.cs;
    Widget block() => Container(
          height: 118,
          decoration: BoxDecoration(
            color: cs.surfaceContainerHighest.withValues(alpha: 0.45),
            borderRadius: BorderRadius.circular(14),
          ),
        );
    return Column(
      children: [
        Row(children: [Expanded(child: block()), const SizedBox(width: 10), Expanded(child: block())]),
        const SizedBox(height: 10),
        Row(children: [Expanded(child: block()), const SizedBox(width: 10), Expanded(child: block())]),
      ],
    );
  }
}

class _ActiveOrderBanner extends StatelessWidget {
  const _ActiveOrderBanner({
    required this.order,
    required this.onTap,
  });

  final LabOrderSummary order;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final cs = context.cs;
    final l10n = AppLocalizations.of(context)!;
    return Material(
      color: context.appExtras.iconTileBackground,
      borderRadius: BorderRadius.circular(14),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          child: Row(
            children: [
              Icon(Icons.local_shipping_outlined, color: cs.primary),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      l10n.homeActiveOrder,
                      style: Theme.of(context).textTheme.labelLarge?.copyWith(
                            fontWeight: FontWeight.w700,
                            color: cs.primary,
                          ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '${order.testType} · ${_statusLabel(order, l10n)}',
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: cs.onSurfaceVariant,
                          ),
                    ),
                  ],
                ),
              ),
              Icon(Icons.chevron_right, color: cs.primary),
            ],
          ),
        ),
      ),
    );
  }

  static String _statusLabel(LabOrderSummary o, AppLocalizations l10n) {
    if (o.isReportReady) return l10n.homeReportOut;
    final s = o.backendStatus?.trim();
    if (s == null || s.isEmpty) return l10n.homeInProgress;
    return s.replaceAll('_', ' ');
  }
}

class _SpendTrendCard extends StatelessWidget {
  const _SpendTrendCard({required this.points});

  final List<UserSpendTrendPoint> points;

  @override
  Widget build(BuildContext context) {
    final cs = context.cs;
    final l10n = AppLocalizations.of(context)!;
    final visible = points.length > 7 ? points.sublist(points.length - 7) : points;
    final maxSpent = visible.isEmpty
        ? 0.0
        : visible.map((p) => p.spent).fold<double>(0, (a, b) => a > b ? a : b);

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: context.cardFill,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: cs.outline.withValues(alpha: 0.4)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            l10n.homeDailySpend,
            style: Theme.of(context).textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.w700,
                ),
          ),
          const SizedBox(height: 4),
          Text(
            l10n.homeOrderActivityByDay,
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: cs.onSurfaceVariant,
                ),
          ),
          const SizedBox(height: 18),
          if (visible.isEmpty)
            Text(
              l10n.homeNoOrdersYet,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: cs.onSurfaceVariant,
                    height: 1.4,
                  ),
            )
          else
            SizedBox(
              height: 120,
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  for (final p in visible) ...[
                    Expanded(
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 3),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.end,
                          children: [
                            Tooltip(
                              message: l10n.homeSpendTooltip(_formatMmk(p.spent), p.orderCount),
                              child: Container(
                                height: maxSpent > 0 ? (p.spent / maxSpent) * 72 + 6 : 6,
                                decoration: BoxDecoration(
                                  color: cs.primary.withValues(alpha: 0.85),
                                  borderRadius: BorderRadius.circular(6),
                                ),
                              ),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              p.dateLabel,
                              style: Theme.of(context).textTheme.labelSmall?.copyWith(
                                    color: cs.onSurfaceVariant,
                                    fontSize: 10,
                                  ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ],
              ),
            ),
        ],
      ),
    );
  }

  static String _formatMmk(double value) {
    return value.round().toString();
  }
}

class _TopTestsCard extends StatelessWidget {
  const _TopTestsCard({required this.tests});

  final List<UserTopTestRow> tests;

  @override
  Widget build(BuildContext context) {
    final cs = context.cs;
    final l10n = AppLocalizations.of(context)!;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
      decoration: BoxDecoration(
        color: context.cardFill,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: cs.outline.withValues(alpha: 0.4)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            l10n.homeTopOrderedTests,
            style: Theme.of(context).textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.w700,
                ),
          ),
          const SizedBox(height: 4),
          Text(
            l10n.homeMostRequestedTests,
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: cs.onSurfaceVariant,
                ),
          ),
          const SizedBox(height: 12),
          if (tests.isEmpty)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Text(
                l10n.homeNoTopTestsYet,
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: cs.onSurfaceVariant,
                      height: 1.4,
                    ),
              ),
            )
          else
            ...List.generate(tests.length, (i) {
              final t = tests[i];
              return ListTile(
                contentPadding: EdgeInsets.zero,
                leading: CircleAvatar(
                  radius: 18,
                  backgroundColor: context.appExtras.iconTileBackground,
                  child: Text(
                    '${i + 1}',
                    style: Theme.of(context).textTheme.labelLarge?.copyWith(
                          color: cs.primary,
                          fontWeight: FontWeight.w700,
                        ),
                  ),
                ),
                title: Text(
                  t.testName.isNotEmpty ? t.testName : t.testCode,
                  style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                ),
                subtitle: Text(
                  [
                    if (t.category.isNotEmpty) t.category,
                    if (t.testCode.isNotEmpty) t.testCode,
                    t.orderCount == 1
                        ? l10n.homeOrderCountSingular
                        : l10n.homeOrdersCount(t.orderCount),
                  ].join(' · '),
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: cs.onSurfaceVariant,
                      ),
                ),
                trailing: Text(
                  '${t.totalSpent.round()} ${l10n.homeMmkSuffix}',
                  style: Theme.of(context).textTheme.labelLarge?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                ),
              );
            }),
        ],
      ),
    );
  }
}

class _WelcomeHeader extends StatelessWidget {
  const _WelcomeHeader({required this.name});

  final String name;

  @override
  Widget build(BuildContext context) {
    final cs = context.cs;
    final l10n = AppLocalizations.of(context)!;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(18, 18, 18, 20),
      decoration: BoxDecoration(
        color: context.cardFill,
        borderRadius: BorderRadius.circular(18),
        border: Border(
          left: BorderSide(color: cs.primary, width: 4),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            l10n.welcomeBack,
            style: Theme.of(context).textTheme.labelLarge?.copyWith(
                  color: cs.onSurfaceVariant,
                  letterSpacing: 0.2,
                ),
          ),
          const SizedBox(height: 4),
          Text(
            name,
            style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                  color: cs.primary,
                  fontWeight: FontWeight.w700,
                ),
          ),
          const SizedBox(height: 10),
          Text(
            l10n.homeRefreshHint,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: cs.onSurfaceVariant,
                  height: 1.45,
                ),
          ),
        ],
      ),
    );
  }
}
