import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../app/session_scope.dart';
import '../../l10n/app_localizations.dart';
import '../../models/lab_result.dart';
import '../../theme/app_colors.dart';
import '../../theme/theme_extensions.dart';
import '../../widgets/common/app_branding_row.dart';
import '../../widgets/common/notification_bell_button.dart';
import '../../widgets/navigation/lab_main_bottom_nav.dart';
import '../../widgets/results/lab_result_combined_card.dart';
import '../../widgets/results/lab_result_test_card.dart';

class LabResultDetailScreen extends StatelessWidget {
  const LabResultDetailScreen({super.key});

  void _goBack(BuildContext context) {
    if (context.canPop()) {
      context.pop();
      return;
    }
    context.go('/lab-results');
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
            l10n.labReportTitle,
            style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                  fontWeight: FontWeight.w700,
                ),
          ),
        ),
      ],
    );
  }

  Widget _shell({
    required Widget child,
    required Future<void> Function() onRefresh,
  }) {
    return Scaffold(
      appBar: AppBar(
        automaticallyImplyLeading: false,
        titleSpacing: 4,
        title: const AppBrandingRow(),
        actions: const [NotificationBellButton()],
      ),
      bottomNavigationBar: const LabMainBottomNav(current: LabMainTab.results),
      body: RefreshIndicator(
        onRefresh: onRefresh,
        child: child,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final session = SessionScope.of(context);
    return ListenableBuilder(
      listenable: session,
      builder: (context, _) {
        final report = session.latestResult;
        final borderColor = context.cs.outlineVariant.withValues(alpha: 0.55);
        final tests = report?.tests ?? const <LabResultTestItem>[];
        final displayRows = report?.displayRows ?? const <LabResultDisplayRow>[];
        final releasedCount = report?.releasedTestCount ?? 0;
        final hasCombinedReports = displayRows.any((row) => row is LabResultCombinedRow);
        final isHardCopyOnly = report?.isHardCopyOnly ?? false;
        final l10n = AppLocalizations.of(context)!;

        Future<void> refreshReport() async {
          final orderId = report?.orderId;
          if (orderId != null) {
            await session.selectResult(orderId);
          }
        }

        return _shell(
          onRefresh: refreshReport,
          child: ListView(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 28),
            physics: const AlwaysScrollableScrollPhysics(),
            children: [
              _pageHeader(context, l10n),
              const SizedBox(height: 12),
              if (report == null)
                  _EmptyState(borderColor: borderColor, l10n: l10n)
                else ...[
                  _OrderHeroCard(
                    report: report,
                    testCount: tests.length,
                    releasedCount: releasedCount,
                    borderColor: borderColor,
                    l10n: l10n,
                    isHardCopyOnly: isHardCopyOnly,
                  ),
                  const SizedBox(height: 20),
                  Text(
                    l10n.labReportTestsSection,
                    style: Theme.of(context).textTheme.labelSmall?.copyWith(
                          color: context.cs.onSurfaceVariant,
                          letterSpacing: 1.0,
                        ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    l10n.labReportTestCount(tests.length),
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w700,
                        ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    isHardCopyOnly
                        ? l10n.labReportHardCopyHint
                        : hasCombinedReports
                            ? l10n.labReportCombinedHint
                            : l10n.labReportSeparateHint,
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: context.cs.onSurfaceVariant,
                          height: 1.4,
                        ),
                  ),
                  const SizedBox(height: 14),
                  if (tests.isEmpty)
                    _InfoBanner(
                      message: l10n.labReportNoTestLines,
                      borderColor: borderColor,
                    )
                  else if (isHardCopyOnly)
                    _InfoBanner(
                      message: l10n.labReportHardCopyDeliveredBanner,
                      borderColor: borderColor,
                      icon: Icons.local_shipping_outlined,
                    )
                  else if (releasedCount == 0)
                    _InfoBanner(
                      message: l10n.labReportPdfsNotUploadedYet,
                      borderColor: borderColor,
                    ),
                  ...List.generate(displayRows.length, (i) {
                    final row = displayRows[i];
                    return switch (row) {
                      LabResultSingleRow(:final test) => LabResultTestCard(
                          test: test,
                          report: report,
                          index: i,
                        ),
                      LabResultCombinedRow() => LabResultCombinedCard(
                          group: row,
                          report: report,
                          index: i,
                        ),
                    };
                  }),
                  if (report.lines.isNotEmpty) ...[
                    const SizedBox(height: 8),
                    Text(
                      l10n.labReportSummaryValues,
                      style: Theme.of(context).textTheme.titleSmall?.copyWith(
                            fontWeight: FontWeight.w700,
                            color: context.cs.onSurfaceVariant,
                          ),
                    ),
                    const SizedBox(height: 10),
                    ...report.lines.map(
                      (line) => Padding(
                        padding: const EdgeInsets.only(bottom: 10),
                        child: _ResultLineCard(line: line),
                      ),
                    ),
                  ],
                ],
              ],
            ),
        );
      },
    );
  }
}

class _OrderHeroCard extends StatelessWidget {
  const _OrderHeroCard({
    required this.report,
    required this.testCount,
    required this.releasedCount,
    required this.borderColor,
    required this.l10n,
    required this.isHardCopyOnly,
  });

  final LabResultReport report;
  final int testCount;
  final int releasedCount;
  final Color borderColor;
  final AppLocalizations l10n;
  final bool isHardCopyOnly;

  @override
  Widget build(BuildContext context) {
    final cs = context.cs;
    final orderRef = report.orderId.length >= 8
        ? report.orderId.substring(0, 8).toUpperCase()
        : report.orderId.toUpperCase();
    final patientLabel =
        report.patientName.trim().isEmpty ? l10n.labReportPatient : report.patientName.trim();
    final patientMeta = <String>[
      if (report.patientAge != null) l10n.labReportAge(report.patientAge!),
      if (report.patientPhone.trim().isNotEmpty) report.patientPhone.trim(),
    ].join(' · ');

    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [cs.primary.withValues(alpha: 0.92), context.appExtras.heroGradientEnd],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(18),
        boxShadow: [
          BoxShadow(
            color: cs.primary.withValues(alpha: 0.2),
            blurRadius: 16,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      padding: const EdgeInsets.all(18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.18),
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Text(
                  isHardCopyOnly ? l10n.resultsHardCopyBadge : l10n.resultsReleasedBadge,
                  style: Theme.of(context).textTheme.labelSmall?.copyWith(
                        color: Colors.white,
                        fontWeight: FontWeight.w700,
                      ),
                ),
              ),
              const Spacer(),
              if (!isHardCopyOnly && releasedCount > 0)
                Flexible(
                  child: Align(
                    alignment: Alignment.centerRight,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.18),
                        borderRadius: BorderRadius.circular(999),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.picture_as_pdf_outlined, size: 14, color: Colors.white),
                          const SizedBox(width: 4),
                          Flexible(
                            child: Text(
                              testCount == 1
                                  ? l10n.labReportPdfCountOne(releasedCount, testCount)
                                  : l10n.labReportPdfCountMany(releasedCount, testCount),
                              overflow: TextOverflow.ellipsis,
                              style: Theme.of(context).textTheme.labelSmall?.copyWith(
                                    color: Colors.white,
                                    fontWeight: FontWeight.w600,
                                  ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 14),
          Text(
            patientLabel,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  color: Colors.white,
                  fontWeight: FontWeight.w700,
                ),
          ),
          if (patientMeta.isNotEmpty) ...[
            const SizedBox(height: 6),
            Text(
              patientMeta,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: Colors.white.withValues(alpha: 0.88),
                  ),
            ),
          ],
          const SizedBox(height: 6),
          Text(
            l10n.labReportOrderLine(orderRef, _fmtDate(report.releasedAt)),
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: Colors.white.withValues(alpha: 0.88),
                ),
          ),
        ],
      ),
    );
  }

  String _fmtDate(DateTime dt) {
    return '${dt.year}-${dt.month.toString().padLeft(2, '0')}-${dt.day.toString().padLeft(2, '0')}';
  }
}

class _InfoBanner extends StatelessWidget {
  const _InfoBanner({
    required this.message,
    required this.borderColor,
    this.icon = Icons.info_outline,
  });

  final String message;
  final Color borderColor;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: context.cs.secondaryContainer.withValues(alpha: 0.35),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: borderColor),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, size: 20, color: context.cs.onSurfaceVariant),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                message,
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: context.cs.onSurfaceVariant,
                      height: 1.4,
                    ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState({required this.borderColor, required this.l10n});

  final Color borderColor;
  final AppLocalizations l10n;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: context.cardFill,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: borderColor),
      ),
      child: Column(
        children: [
          Icon(Icons.assignment_outlined, size: 48, color: context.cs.onSurfaceVariant),
          const SizedBox(height: 12),
          Text(
            l10n.labReportNoReportLoaded,
            style: Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(height: 6),
          Text(
            l10n.labReportSelectFromResults,
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: context.cs.onSurfaceVariant),
          ),
        ],
      ),
    );
  }
}

class _ResultLineCard extends StatelessWidget {
  const _ResultLineCard({required this.line});

  final LabResultLine line;

  @override
  Widget build(BuildContext context) {
    final isLow = line.flag == ResultFlag.low;
    final isHigh = line.flag == ResultFlag.high;
    final accent = isLow
        ? context.cs.error
        : isHigh
            ? const Color(0xFFB45309)
            : AppColors.accentGreen;
    final badgeBg = accent.withValues(alpha: 0.12);

    return Container(
      decoration: BoxDecoration(
        color: context.cardFill,
        borderRadius: BorderRadius.circular(14),
        border: Border(
          left: BorderSide(color: accent, width: 3),
          top: BorderSide(color: context.cs.outlineVariant.withValues(alpha: 0.55)),
          right: BorderSide(color: context.cs.outlineVariant.withValues(alpha: 0.55)),
          bottom: BorderSide(color: context.cs.outlineVariant.withValues(alpha: 0.55)),
        ),
      ),
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  line.name,
                  style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: badgeBg,
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Text(
                  line.flagLabel.toUpperCase(),
                  style: Theme.of(context).textTheme.labelSmall?.copyWith(
                        color: accent,
                        fontWeight: FontWeight.w700,
                      ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            line.value,
            style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                  color: isLow || isHigh ? accent : context.cs.onSurface,
                  fontWeight: FontWeight.w800,
                ),
          ),
        ],
      ),
    );
  }
}
