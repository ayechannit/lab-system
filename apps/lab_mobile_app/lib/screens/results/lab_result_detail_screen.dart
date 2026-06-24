import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../app/session_scope.dart';
import '../../models/lab_result.dart';
import '../../theme/app_colors.dart';
import '../../theme/theme_extensions.dart';
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

        return Scaffold(
          appBar: AppBar(
            leading: IconButton(
              icon: const Icon(Icons.arrow_back),
              tooltip: 'Back',
              onPressed: () => _goBack(context),
            ),
            title: const Text('Lab report'),
          ),
          body: RefreshIndicator(
            onRefresh: () async {
              final orderId = report?.orderId;
              if (orderId != null) {
                await session.selectResult(orderId);
              }
            },
            child: ListView(
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 28),
              physics: const AlwaysScrollableScrollPhysics(),
              children: [
                if (report == null)
                  _EmptyState(borderColor: borderColor)
                else ...[
                  _OrderHeroCard(
                    report: report,
                    testCount: tests.length,
                    releasedCount: releasedCount,
                    borderColor: borderColor,
                  ),
                  const SizedBox(height: 20),
                  Text(
                    'TESTS IN THIS ORDER',
                    style: Theme.of(context).textTheme.labelSmall?.copyWith(
                          color: context.cs.onSurfaceVariant,
                          letterSpacing: 1.0,
                        ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    tests.length == 1 ? '1 test' : '${tests.length} tests',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w700,
                        ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    hasCombinedReports
                        ? 'Some tests are grouped into combined reports. Download the shared PDF or run AI Check from each group.'
                        : 'Download the official PDF or run AI Check for each test separately.',
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: context.cs.onSurfaceVariant,
                          height: 1.4,
                        ),
                  ),
                  const SizedBox(height: 14),
                  if (tests.isEmpty)
                    _InfoBanner(
                      message: 'No test line items were found for this order.',
                      borderColor: borderColor,
                    )
                  else if (releasedCount == 0)
                    _InfoBanner(
                      message:
                          'The lab has released this order, but PDFs are not uploaded yet. Check back soon or contact the lab.',
                      borderColor: borderColor,
                    ),
                  ...List.generate(displayRows.length, (i) {
                    final row = displayRows[i];
                    return switch (row) {
                      LabResultSingleRow(:final test) => LabResultTestCard(
                          test: test,
                          report: report!,
                          index: i,
                        ),
                      LabResultCombinedRow() => LabResultCombinedCard(
                          group: row,
                          report: report!,
                          index: i,
                        ),
                    };
                  }),
                  if (report.lines.isNotEmpty) ...[
                    const SizedBox(height: 8),
                    Text(
                      'Summary values',
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
  });

  final LabResultReport report;
  final int testCount;
  final int releasedCount;
  final Color borderColor;

  @override
  Widget build(BuildContext context) {
    final cs = context.cs;
    final orderRef = report.orderId.length >= 8
        ? report.orderId.substring(0, 8).toUpperCase()
        : report.orderId.toUpperCase();

    return Container(
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF082457), Color(0xFF0B4BB3)],
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
                  'Released',
                  style: Theme.of(context).textTheme.labelSmall?.copyWith(
                        color: Colors.white,
                        fontWeight: FontWeight.w700,
                      ),
                ),
              ),
              const Spacer(),
              if (releasedCount > 0)
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
                              '$releasedCount/$testCount PDF${testCount == 1 ? '' : 's'}',
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
            report.sampleId,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  color: Colors.white,
                  fontWeight: FontWeight.w700,
                ),
          ),
          const SizedBox(height: 6),
          Text(
            'Order $orderRef · ${_fmtDate(report.releasedAt)}',
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
  const _InfoBanner({required this.message, required this.borderColor});

  final String message;
  final Color borderColor;

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
            Icon(Icons.info_outline, size: 20, color: context.cs.onSurfaceVariant),
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
  const _EmptyState({required this.borderColor});

  final Color borderColor;

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
            'No report loaded',
            style: Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(height: 6),
          Text(
            'Select a released order from Results.',
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
