import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../app/session_scope.dart';
import '../../models/lab_result.dart';
import '../../theme/app_colors.dart';
import '../../theme/theme_extensions.dart';
import '../../widgets/results/lab_result_insight_cards.dart';

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
        final lines = report?.lines ?? const <LabResultLine>[];
        final hasStructured = lines.isNotEmpty;
        final hasPdf = report?.hasPdfPayload ?? false;
        final borderColor = context.cs.outlineVariant.withValues(alpha: 0.55);
        final sampleId = report?.sampleId ?? '';
        final title = hasStructured
            ? lines.first.name
            : sampleId.isNotEmpty
                ? sampleId
                : 'Lab report';

        return Scaffold(
          appBar: AppBar(
            leading: IconButton(
              icon: const Icon(Icons.arrow_back),
              tooltip: 'Back',
              onPressed: () => _goBack(context),
            ),
            title: const Text('Lab report'),
          ),
          body: ListView(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 28),
            children: [
              if (report == null)
                _EmptyState(borderColor: borderColor)
              else ...[
                _ReportHeroCard(
                  title: title,
                  subtitle: hasStructured ? report.sampleId : 'Official PDF report',
                  releasedAt: report.releasedAt,
                  hasPdf: hasPdf,
                  borderColor: borderColor,
                ),
                const SizedBox(height: 16),
                if (!hasStructured && !hasPdf)
                  _InfoBanner(
                    message:
                        'This order was released but the PDF is not available yet. Pull to refresh on Results or contact the lab.',
                    borderColor: borderColor,
                  )
                else if (hasStructured) ...[
                  Text(
                    'Key results',
                    style: Theme.of(context).textTheme.titleSmall?.copyWith(
                          fontWeight: FontWeight.w700,
                          color: context.cs.onSurfaceVariant,
                          letterSpacing: 0.2,
                        ),
                  ),
                  const SizedBox(height: 10),
                  ...lines.map((line) => Padding(
                        padding: const EdgeInsets.only(bottom: 10),
                        child: _ResultLineCard(line: line),
                      )),
                  const SizedBox(height: 6),
                ],
                LabResultInsightCards(report: report),
              ],
            ],
          ),
        );
      },
    );
  }
}

class _ReportHeroCard extends StatelessWidget {
  const _ReportHeroCard({
    required this.title,
    required this.subtitle,
    required this.releasedAt,
    required this.hasPdf,
    required this.borderColor,
  });

  final String title;
  final String subtitle;
  final DateTime releasedAt;
  final bool hasPdf;
  final Color borderColor;

  @override
  Widget build(BuildContext context) {
    final cs = context.cs;

    return Container(
      decoration: BoxDecoration(
        color: context.cardFill,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: borderColor),
        boxShadow: [
          BoxShadow(
            color: cs.shadow.withValues(alpha: 0.05),
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          LayoutBuilder(
            builder: (context, constraints) {
              const releasedChip = _ReleasedChip();
              if (!hasPdf) return releasedChip;

              const pdfChip = _MetaChip(
                icon: Icons.picture_as_pdf_outlined,
                label: 'PDF ready',
                color: Color(0xFFC62828),
                background: Color(0x1AE53935),
              );

              // Side-by-side when there is room; stack on narrow viewports.
              if (constraints.maxWidth >= 200) {
                return Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [releasedChip, pdfChip],
                );
              }
              return Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  releasedChip,
                  const SizedBox(height: 8),
                  pdfChip,
                ],
              );
            },
          ),
          const SizedBox(height: 14),
          Text(
            title,
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 4),
          Text(
            subtitle,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: cs.onSurfaceVariant),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Icon(Icons.event_outlined, size: 16, color: cs.onSurfaceVariant),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  'Released ${_fmtDate(releasedAt)}',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: cs.onSurfaceVariant,
                        fontWeight: FontWeight.w500,
                      ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  String _fmtDate(DateTime dt) {
    return '${dt.year}-${dt.month.toString().padLeft(2, '0')}-${dt.day.toString().padLeft(2, '0')}';
  }
}

class _ReleasedChip extends StatelessWidget {
  const _ReleasedChip();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: AppColors.accentGreen.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: AppColors.accentGreen.withValues(alpha: 0.25)),
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

class _MetaChip extends StatelessWidget {
  const _MetaChip({
    required this.icon,
    required this.label,
    required this.color,
    required this.background,
  });

  final IconData icon;
  final String label;
  final Color color;
  final Color background;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: color),
          const SizedBox(width: 4),
          Text(
            label,
            style: Theme.of(context).textTheme.labelSmall?.copyWith(
                  color: color,
                  fontWeight: FontWeight.w600,
                ),
          ),
        ],
      ),
    );
  }
}

class _InfoBanner extends StatelessWidget {
  const _InfoBanner({required this.message, required this.borderColor});

  final String message;
  final Color borderColor;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
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
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: context.cs.onSurfaceVariant),
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
                child: Text(line.name, style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600)),
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
