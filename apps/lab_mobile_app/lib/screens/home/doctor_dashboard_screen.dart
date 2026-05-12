import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../app/session_scope.dart';
import '../../models/lab_order.dart';
import '../../models/lab_result.dart';
import '../../theme/app_colors.dart';
import '../../widgets/common/app_brand_mark.dart';
import '../../widgets/common/quick_action_button.dart';
import '../../widgets/navigation/lab_main_bottom_nav.dart';
import '../../widgets/results/lab_result_insight_cards.dart';

class DoctorDashboardScreen extends StatelessWidget {
  const DoctorDashboardScreen({super.key});

  static const double _maxContentWidth = 720;

  @override
  Widget build(BuildContext context) {
    final session = SessionScope.of(context);
    final user = session.user;
    final name = user?.name ?? 'Doctor';
    final tracking = session.trackingOrder;
    final latestReport = session.latestResult;
    final loyalty = session.loyalty;
    final hasReportPayload = (latestReport?.lines.isNotEmpty ?? false) ||
        (latestReport?.resultPdfUrl ?? '').isNotEmpty;

    return Scaffold(
      backgroundColor: AppColors.surface,
      appBar: AppBar(
        automaticallyImplyLeading: false,
        titleSpacing: 16,
        title: Row(
          children: [
            GestureDetector(
              onTap: () => context.push('/profile'),
              child: const AppBrandMark(size: 32, iconSize: 16, borderRadius: 8),
            ),
            const SizedBox(width: 10),
            Text(
              'Doctor Portal',
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                    color: AppColors.primary,
                    fontWeight: FontWeight.w800,
                  ),
            ),
          ],
        ),
        actions: [
          IconButton(
            tooltip: 'Profile',
            onPressed: () => context.push('/profile'),
            icon: const Icon(Icons.person_outline),
            color: AppColors.primary,
          ),
        ],
      ),
      body: LayoutBuilder(
        builder: (context, constraints) {
          final w = constraints.maxWidth;
          final pad = EdgeInsets.symmetric(
            horizontal: w > _maxContentWidth + 40 ? (w - _maxContentWidth) / 2 : 20,
            vertical: 20,
          );
          final gridCols = w >= 640 ? 2 : 1;
          final useRowGlance = w >= 520;

          return ListView(
            padding: pad,
            children: [
              _WelcomeHeader(name: name),
              const SizedBox(height: 18),
              Text(
                'Your workspace',
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w700,
                      color: AppColors.onSurface,
                    ),
              ),
              const SizedBox(height: 10),
              _AtAGlanceStrip(
                useRow: useRowGlance,
                tracking: tracking,
                latestReport: latestReport,
                hasReportPayload: hasReportPayload,
                pointsBalance: loyalty.balance,
              ),
              const SizedBox(height: 18),
              _HighlightBanner(
                title: 'Clinical workflow',
                body: 'Review finalized reports, document feedback, and place follow-up orders from one place.',
              ),
              const SizedBox(height: 20),
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'RESULTS & INSIGHTS',
                          style: Theme.of(context).textTheme.labelSmall?.copyWith(
                                color: AppColors.onSurfaceVariant,
                                letterSpacing: 1.0,
                              ),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          'Latest lab report',
                          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                fontWeight: FontWeight.w700,
                              ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Sample ID: ${latestReport?.sampleId ?? 'Pending'}',
                          style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: AppColors.onSurfaceVariant),
                        ),
                        if (!hasReportPayload) ...[
                          const SizedBox(height: 8),
                          Text(
                            'Results are not available yet.',
                            style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: AppColors.onSurfaceVariant),
                          ),
                        ],
                      ],
                    ),
                  ),
                  TextButton(
                    onPressed: () => context.push('/lab-results'),
                    child: const Text('Full report'),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              LabResultInsightCards(report: latestReport),
              const SizedBox(height: 22),
              Text(
                'Quick actions',
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w700,
                      color: AppColors.onSurface,
                    ),
              ),
              const SizedBox(height: 10),
              GridView.count(
                crossAxisCount: gridCols,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                mainAxisSpacing: 12,
                crossAxisSpacing: 12,
                childAspectRatio: gridCols == 1 ? 2.4 : 1.05,
                children: [
                  QuickActionButton(
                    icon: Icons.assignment_outlined,
                    label: 'Review lab results',
                    onTap: () => context.push('/lab-results'),
                    iconBackgroundColor: const Color(0xFFEAF9F1),
                    iconColor: AppColors.accentGreen,
                  ),
                  QuickActionButton(
                    icon: Icons.rate_review_outlined,
                    label: 'Clinical feedback',
                    onTap: () => context.push('/rating-feedback'),
                    iconBackgroundColor: const Color(0xFFFFF4E5),
                    iconColor: AppColors.warningLow,
                  ),
                  QuickActionButton(
                    icon: Icons.science_outlined,
                    label: 'Follow-up orders',
                    onTap: () => context.push('/order-lab-test'),
                    iconBackgroundColor: const Color(0xFFEAF1FF),
                    iconColor: AppColors.primary,
                  ),
                ],
              ),
              const SizedBox(height: 24),
            ],
          );
        },
      ),
      bottomNavigationBar: const LabMainBottomNav(current: LabMainTab.home),
    );
  }
}

class _AtAGlanceStrip extends StatelessWidget {
  const _AtAGlanceStrip({
    required this.useRow,
    required this.tracking,
    required this.latestReport,
    required this.hasReportPayload,
    required this.pointsBalance,
  });

  final bool useRow;
  final LabOrderSummary? tracking;
  final LabResultReport? latestReport;
  final bool hasReportPayload;
  final int pointsBalance;

  @override
  Widget build(BuildContext context) {
    final order = tracking;
    final orderTitle = order == null ? 'No active order' : 'Active order';
    final orderSubtitle = order == null
        ? 'Place a follow-up test when ready.'
        : _truncate('${order.testType} · ${_statusLabel(order)}', 52);
    final reportTitle = 'Latest report';
    final reportSubtitle = !hasReportPayload
        ? 'Awaiting lab release'
        : _truncate('Sample ${latestReport?.sampleId ?? '—'}', 40);

    final children = [
      Expanded(
        flex: 1,
        child: _GlanceCard(
          icon: Icons.local_shipping_outlined,
          iconColor: AppColors.primary,
          iconBg: const Color(0xFFEAF1FF),
          title: orderTitle,
          subtitle: orderSubtitle,
          onTap: () => order == null
              ? context.push('/order-lab-test')
              : context.push('/order-tracking'),
        ),
      ),
      SizedBox(width: useRow ? 10 : 0, height: useRow ? 0 : 10),
      Expanded(
        flex: 1,
        child: _GlanceCard(
          icon: Icons.science_outlined,
          iconColor: AppColors.accentGreen,
          iconBg: const Color(0xFFEAF9F1),
          title: reportTitle,
          subtitle: reportSubtitle,
          onTap: () => context.push('/lab-results'),
        ),
      ),
      SizedBox(width: useRow ? 10 : 0, height: useRow ? 0 : 10),
      Expanded(
        flex: 1,
        child: _GlanceCard(
          icon: Icons.military_tech_outlined,
          iconColor: AppColors.warningLow,
          iconBg: const Color(0xFFFFF4E5),
          title: 'Loyalty points',
          subtitle: '$pointsBalance pts (from lab)',
          onTap: () => context.push('/loyalty'),
        ),
      ),
    ];

    if (useRow) {
      return IntrinsicHeight(
        child: Row(crossAxisAlignment: CrossAxisAlignment.stretch, children: children),
      );
    }
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _GlanceCard(
          icon: Icons.local_shipping_outlined,
          iconColor: AppColors.primary,
          iconBg: const Color(0xFFEAF1FF),
          title: orderTitle,
          subtitle: orderSubtitle,
          onTap: () => order == null
              ? context.push('/order-lab-test')
              : context.push('/order-tracking'),
        ),
        const SizedBox(height: 10),
        _GlanceCard(
          icon: Icons.science_outlined,
          iconColor: AppColors.accentGreen,
          iconBg: const Color(0xFFEAF9F1),
          title: reportTitle,
          subtitle: reportSubtitle,
          onTap: () => context.push('/lab-results'),
        ),
        const SizedBox(height: 10),
        _GlanceCard(
          icon: Icons.military_tech_outlined,
          iconColor: AppColors.warningLow,
          iconBg: const Color(0xFFFFF4E5),
          title: 'Loyalty points',
          subtitle: '$pointsBalance pts (from lab)',
          onTap: () => context.push('/loyalty'),
        ),
      ],
    );
  }

  static String _statusLabel(LabOrderSummary o) {
    if (o.isReportReady) return 'Report out';
    final s = o.backendStatus?.trim();
    if (s == null || s.isEmpty) return 'In progress';
    return s.replaceAll('_', ' ');
  }

  static String _truncate(String s, int max) {
    if (s.length <= max) return s;
    return '${s.substring(0, max - 1)}…';
  }
}

class _GlanceCard extends StatelessWidget {
  const _GlanceCard({
    required this.icon,
    required this.iconColor,
    required this.iconBg,
    required this.title,
    required this.subtitle,
    required this.onTap,
  });

  final IconData icon;
  final Color iconColor;
  final Color iconBg;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(14),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        child: Container(
          padding: const EdgeInsets.fromLTRB(12, 12, 12, 14),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: const Color(0x66E1E2EC)),
            boxShadow: const [
              BoxShadow(color: Color(0x06000000), blurRadius: 8, offset: Offset(0, 2)),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: iconBg,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(icon, size: 20, color: iconColor),
              ),
              const SizedBox(height: 10),
              Text(
                title,
                style: Theme.of(context).textTheme.labelLarge?.copyWith(
                      fontWeight: FontWeight.w700,
                      color: AppColors.onSurface,
                    ),
              ),
              const SizedBox(height: 4),
              Text(
                subtitle,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: AppColors.onSurfaceVariant,
                      height: 1.3,
                    ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _WelcomeHeader extends StatelessWidget {
  const _WelcomeHeader({required this.name});

  final String name;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(18, 18, 18, 20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border(
          left: BorderSide(color: AppColors.primaryLight, width: 4),
        ),
        boxShadow: const [
          BoxShadow(
            color: Color(0x120052CC),
            blurRadius: 20,
            offset: Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Welcome back',
            style: Theme.of(context).textTheme.labelLarge?.copyWith(
                  color: AppColors.onSurfaceVariant,
                  letterSpacing: 0.2,
                ),
          ),
          const SizedBox(height: 4),
          Text(
            name,
            style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                  color: AppColors.primary,
                  fontWeight: FontWeight.w700,
                ),
          ),
          const SizedBox(height: 10),
          Text(
            'Figures below come from your account on the lab server. Tap a card to open details.',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: AppColors.onSurfaceVariant,
                  height: 1.45,
                ),
          ),
        ],
      ),
    );
  }
}

class _HighlightBanner extends StatelessWidget {
  const _HighlightBanner({
    required this.title,
    required this.body,
  });

  final String title;
  final String body;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        gradient: const LinearGradient(
          colors: [Color(0xFF082457), Color(0xFF0B4BB3)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        boxShadow: const [
          BoxShadow(
            color: Color(0x220052CC),
            blurRadius: 16,
            offset: Offset(0, 6),
          ),
        ],
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Icon(Icons.health_and_safety_outlined, color: Colors.white, size: 26),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        color: Colors.white,
                        fontWeight: FontWeight.w700,
                      ),
                ),
                const SizedBox(height: 6),
                Text(
                  body,
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: Colors.white.withValues(alpha: 0.88),
                        height: 1.4,
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
