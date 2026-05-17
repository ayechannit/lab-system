import 'package:flutter/material.dart';

import '../../app/session_scope.dart';
import '../../models/lab_result.dart';
import '../../theme/app_colors.dart';
import '../../widgets/common/app_brand_mark.dart';
import '../../widgets/navigation/lab_main_bottom_nav.dart';
import '../../widgets/results/lab_result_insight_cards.dart';

class LabResultsScreen extends StatelessWidget {
  const LabResultsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final session = SessionScope.of(context);
    final report = session.latestResult;
    final lines = report?.lines ?? const <LabResultLine>[];
    final pdfUrl = report?.resultPdfUrl;
    final hasStructured = lines.isNotEmpty;
    final hasPdf = pdfUrl != null && pdfUrl.isNotEmpty;
    final kicker = hasStructured
        ? 'RESULT · ${lines.first.name}'
        : (hasPdf && report != null)
            ? 'REPORT · ${report.sampleId}'
            : 'RESULTS';
    return Scaffold(
      appBar: AppBar(
        automaticallyImplyLeading: false,
        titleSpacing: 12,
        title: Row(
          children: [
            const AppBrandMark(size: 24, iconSize: 12, borderRadius: 6),
            const SizedBox(width: 8),
            Text(
              'MedLab Smart',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    color: AppColors.primary,
                    fontWeight: FontWeight.w800,
                  ),
            ),
          ],
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Text(
            kicker,
            style: Theme.of(context).textTheme.labelSmall?.copyWith(
                  color: AppColors.onSurfaceVariant,
                  letterSpacing: 0.6,
                ),
          ),
          const SizedBox(height: 4),
          Text(
            'Lab report',
            style: Theme.of(context).textTheme.headlineMedium,
          ),
          const SizedBox(height: 4),
          Text(
            'Sample ID: ${report?.sampleId ?? 'Pending'}',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: AppColors.onSurfaceVariant),
          ),
          const SizedBox(height: 12),
          if (!hasStructured && !hasPdf)
            Text(
              'Results are not available yet.',
              style: Theme.of(context).textTheme.bodyLarge?.copyWith(color: AppColors.onSurfaceVariant),
            )
          else if (!hasStructured && hasPdf)
            Text(
              'Your official report is ready as a PDF from the lab. Open it below or use AI Check for a plain-language summary.',
              style: Theme.of(context).textTheme.bodyLarge?.copyWith(color: AppColors.onSurfaceVariant),
            )
          else ...[
            _ResultCard(
              borderColor: lines.first.flag == ResultFlag.low ? const Color(0xFFC33636) : const Color(0xFF12B76A),
              title: lines.first.name,
              badgeText: lines.first.flagLabel.toUpperCase(),
              badgeColor: lines.first.flag == ResultFlag.low ? const Color(0xFFB42318) : const Color(0xFF067647),
              badgeBackground: lines.first.flag == ResultFlag.low ? const Color(0xFFFEE4E2) : const Color(0xFFD1FADF),
              valueText: lines.first.value,
              valueColor: lines.first.flag == ResultFlag.low ? const Color(0xFFB42318) : const Color(0xFF101828),
            ),
            if (lines.length > 1) ...[
              const SizedBox(height: 10),
              _ResultCard(
                borderColor: lines[1].flag == ResultFlag.low ? const Color(0xFFC33636) : const Color(0xFF12B76A),
                title: lines[1].name,
                badgeText: lines[1].flagLabel.toUpperCase(),
                badgeColor: lines[1].flag == ResultFlag.low ? const Color(0xFFB42318) : const Color(0xFF067647),
                badgeBackground: lines[1].flag == ResultFlag.low ? const Color(0xFFFEE4E2) : const Color(0xFFD1FADF),
                valueText: lines[1].value,
                valueColor: lines[1].flag == ResultFlag.low ? const Color(0xFFB42318) : const Color(0xFF101828),
              ),
            ],
          ],
          const SizedBox(height: 12),
          LabResultInsightCards(report: report),
        ],
      ),
      bottomNavigationBar: const LabMainBottomNav(current: LabMainTab.results),
    );
  }
}

class _ResultCard extends StatelessWidget {
  const _ResultCard({
    required this.borderColor,
    required this.title,
    required this.badgeText,
    required this.badgeColor,
    required this.badgeBackground,
    required this.valueText,
    required this.valueColor,
  });

  final Color borderColor;
  final String title;
  final String badgeText;
  final Color badgeColor;
  final Color badgeBackground;
  final String valueText;
  final Color valueColor;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border(left: BorderSide(color: borderColor, width: 3)),
      ),
      padding: const EdgeInsets.all(12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(title, style: Theme.of(context).textTheme.titleMedium),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: badgeBackground,
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Text(
                  badgeText,
                  style: Theme.of(context).textTheme.labelSmall?.copyWith(
                        color: badgeColor,
                        fontWeight: FontWeight.w700,
                      ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            valueText,
            style: Theme.of(context).textTheme.headlineLarge?.copyWith(
                  color: valueColor,
                  fontWeight: FontWeight.w800,
                ),
          ),
        ],
      ),
    );
  }
}
