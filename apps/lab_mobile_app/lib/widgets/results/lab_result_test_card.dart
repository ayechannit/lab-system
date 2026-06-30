import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../app/session_scope.dart';
import '../../l10n/app_localizations.dart';
import '../../models/lab_result.dart';
import '../../services/lab_report_pdf_service.dart';
import '../../services/rest_lab_user_api.dart';
import '../../theme/app_colors.dart';
import '../../theme/theme_extensions.dart';
import '../common/app_toast.dart';

/// Per-test PDF download and AI Check actions on the report detail screen.
class LabResultTestCard extends StatefulWidget {
  const LabResultTestCard({
    super.key,
    required this.test,
    required this.report,
    required this.index,
  });

  final LabResultTestItem test;
  final LabResultReport report;
  final int index;

  @override
  State<LabResultTestCard> createState() => _LabResultTestCardState();
}

class _LabResultTestCardState extends State<LabResultTestCard> {
  bool _downloading = false;
  bool _aiRunning = false;

  LabResultTestItem get test => widget.test;
  LabResultReport get report => widget.report;

  Future<void> _downloadPdf() async {
    if (_downloading || !test.hasPdf) return;
    final l10n = AppLocalizations.of(context)!;
    setState(() => _downloading = true);
    try {
      final session = SessionScope.of(context);
      final saved = await session.downloadTestResultPdf(test: test, report: report);
      if (!mounted) return;
      AppToast.successInShell(
        context,
        saved,
        title: kIsWeb ? l10n.labReportDownloadStarted : l10n.labReportReportSaved,
      );
    } on LabReportPdfException catch (e) {
      if (!mounted) return;
      AppToast.errorInShell(context, e.message);
    } on LabApiException catch (e) {
      if (!mounted) return;
      AppToast.errorInShell(context, e.message);
    } catch (_) {
      if (!mounted) return;
      AppToast.errorInShell(context, l10n.labReportDownloadFailed);
    } finally {
      if (mounted) setState(() => _downloading = false);
    }
  }

  Future<void> _runAiCheck() async {
    if (_aiRunning || !test.hasPdf) return;
    final l10n = AppLocalizations.of(context)!;
    final session = SessionScope.of(context);
    setState(() => _aiRunning = true);
    try {
      await session.runAiAnalysis(testId: test.testId);
      if (!mounted) return;
      context.push('/ai-analysis');
    } on LabApiException catch (e) {
      if (!mounted) return;
      AppToast.errorInShell(context, e.message);
    } catch (_) {
      if (!mounted) return;
      AppToast.errorInShell(context, l10n.labReportAiCheckFailed);
    } finally {
      if (mounted) setState(() => _aiRunning = false);
    }
  }

  Future<void> _viewExistingAi() async {
    final session = SessionScope.of(context);
    final existing = await session.loadAiAnalysisForTest(test.testId);
    if (!mounted) return;
    if (existing != null) {
      context.push('/ai-analysis');
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final cs = context.cs;
    final borderColor = cs.outlineVariant.withValues(alpha: 0.55);
    final hasPdf = test.hasPdf;
    final session = SessionScope.of(context);
    final hasCachedAi = session.aiAnalysisTestId == test.testId && session.aiAnalysis != null;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: context.cardFill,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: borderColor),
        boxShadow: [
          BoxShadow(
            color: cs.shadow.withValues(alpha: 0.04),
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 12),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                CircleAvatar(
                  radius: 18,
                  backgroundColor: context.appExtras.iconTileBackground,
                  child: Text(
                    '${widget.index + 1}',
                    style: Theme.of(context).textTheme.labelLarge?.copyWith(
                          color: AppColors.primary,
                          fontWeight: FontWeight.w700,
                        ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Wrap(
                        spacing: 8,
                        runSpacing: 6,
                        crossAxisAlignment: WrapCrossAlignment.center,
                        children: [
                          Text(
                            test.testName,
                            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                  fontWeight: FontWeight.w700,
                                ),
                          ),
                          _StatusBadge(hasPdf: hasPdf, l10n: l10n),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text(
                        [
                          if (test.testCode.isNotEmpty) test.testCode,
                          if (test.category.isNotEmpty) test.category,
                        ].join(' · '),
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                              color: cs.onSurfaceVariant,
                            ),
                      ),
                      if (test.releasedAt != null) ...[
                        const SizedBox(height: 6),
                        Wrap(
                          crossAxisAlignment: WrapCrossAlignment.center,
                          spacing: 4,
                          runSpacing: 2,
                          children: [
                            Icon(Icons.event_outlined, size: 14, color: cs.onSurfaceVariant),
                            Text(
                              l10n.resultsReleasedDate(_fmtDate(test.releasedAt!)),
                              style: Theme.of(context).textTheme.labelSmall?.copyWith(
                                    color: cs.onSurfaceVariant,
                                  ),
                            ),
                          ],
                        ),
                      ],
                    ],
                  ),
                ),
              ],
            ),
          ),
          if (test.hasStructuredLines) ...[
            const Divider(height: 1),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
              child: Column(
                children: [
                  for (final line in test.lines)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: _ResultLineRow(line: line),
                    ),
                ],
              ),
            ),
          ],
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                if (!hasPdf)
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: cs.secondaryContainer.withValues(alpha: 0.35),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Row(
                      children: [
                        Icon(Icons.hourglass_empty_rounded, size: 18, color: cs.onSurfaceVariant),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            l10n.labReportPdfNotUploadedTest,
                            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                  color: cs.onSurfaceVariant,
                                ),
                          ),
                        ),
                      ],
                    ),
                  )
                else ...[
                  SizedBox(
                    width: double.infinity,
                    child: OutlinedButton.icon(
                      onPressed: _downloading ? null : _downloadPdf,
                      icon: _downloading
                          ? SizedBox(
                              width: 16,
                              height: 16,
                              child: CircularProgressIndicator(strokeWidth: 2, color: cs.primary),
                            )
                          : const Icon(Icons.download_rounded, size: 20),
                      label: FittedBox(
                        fit: BoxFit.scaleDown,
                        alignment: Alignment.centerLeft,
                        child: Text(_downloading ? l10n.labReportDownloading : l10n.labReportDownloadPdf),
                      ),
                    ),
                  ),
                  const SizedBox(height: 8),
                  if (hasCachedAi)
                    SizedBox(
                      width: double.infinity,
                      child: OutlinedButton.icon(
                        onPressed: _viewExistingAi,
                        icon: const Icon(Icons.auto_awesome_rounded, size: 20),
                        label: Text(l10n.labReportViewAiSummary),
                      ),
                    )
                  else
                    SizedBox(
                      width: double.infinity,
                      child: FilledButton.tonalIcon(
                        onPressed: _aiRunning ? null : _runAiCheck,
                        icon: _aiRunning
                            ? SizedBox(
                                width: 16,
                                height: 16,
                                child: CircularProgressIndicator(strokeWidth: 2, color: cs.primary),
                              )
                            : const Icon(Icons.bolt_rounded, size: 20),
                        label: FittedBox(
                          fit: BoxFit.scaleDown,
                          alignment: Alignment.centerLeft,
                          child: Text(_aiRunning ? l10n.labReportRunningAiCheck : l10n.labReportRunAiCheck),
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

  String _fmtDate(DateTime dt) {
    return '${dt.year}-${dt.month.toString().padLeft(2, '0')}-${dt.day.toString().padLeft(2, '0')}';
  }
}

class _StatusBadge extends StatelessWidget {
  const _StatusBadge({required this.hasPdf, required this.l10n});

  final bool hasPdf;
  final AppLocalizations l10n;

  @override
  Widget build(BuildContext context) {
    final color = hasPdf ? AppColors.accentGreen : const Color(0xFFB45309);
    final bg = color.withValues(alpha: 0.12);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: color.withValues(alpha: 0.25)),
      ),
      child: Text(
        hasPdf ? l10n.labReportPdfReady : l10n.labReportPdfPending,
        style: Theme.of(context).textTheme.labelSmall?.copyWith(
              color: color,
              fontWeight: FontWeight.w700,
            ),
      ),
    );
  }
}

class _ResultLineRow extends StatelessWidget {
  const _ResultLineRow({required this.line});

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

    return Row(
      children: [
        Expanded(
          child: Text(
            line.name,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w500),
          ),
        ),
        const SizedBox(width: 8),
        Flexible(
          child: Text(
            line.value,
            textAlign: TextAlign.end,
            overflow: TextOverflow.ellipsis,
            style: Theme.of(context).textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.w700,
                  color: isLow || isHigh ? accent : context.cs.onSurface,
                ),
          ),
        ),
        const SizedBox(width: 8),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
          decoration: BoxDecoration(
            color: accent.withValues(alpha: 0.12),
            borderRadius: BorderRadius.circular(999),
          ),
          child: Text(
            line.flagLabel,
            style: Theme.of(context).textTheme.labelSmall?.copyWith(
                  color: accent,
                  fontWeight: FontWeight.w700,
                ),
          ),
        ),
      ],
    );
  }
}
