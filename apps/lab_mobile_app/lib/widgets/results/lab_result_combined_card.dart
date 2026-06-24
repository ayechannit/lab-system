import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../app/session_scope.dart';
import '../../models/lab_result.dart';
import '../../services/lab_report_pdf_service.dart';
import '../../services/rest_lab_user_api.dart';
import '../../theme/app_colors.dart';
import '../../theme/theme_extensions.dart';
import '../common/app_toast.dart';

/// Combined report card when multiple tests share one uploaded PDF.
class LabResultCombinedCard extends StatefulWidget {
  const LabResultCombinedCard({
    super.key,
    required this.group,
    required this.report,
    required this.index,
  });

  final LabResultCombinedRow group;
  final LabResultReport report;
  final int index;

  @override
  State<LabResultCombinedCard> createState() => _LabResultCombinedCardState();
}

class _LabResultCombinedCardState extends State<LabResultCombinedCard> {
  bool _downloading = false;
  bool _aiRunning = false;

  LabResultCombinedRow get group => widget.group;
  LabResultReport get report => widget.report;

  Future<void> _downloadPdf() async {
    if (_downloading || !group.hasPdf) return;
    setState(() => _downloading = true);
    try {
      final session = SessionScope.of(context);
      final saved = await session.downloadTestResultPdf(
        test: group.primaryTest,
        report: report,
      );
      if (!mounted) return;
      AppToast.successInShell(
        context,
        saved,
        title: kIsWeb ? 'Download started' : 'Report saved',
      );
    } on LabReportPdfException catch (e) {
      if (!mounted) return;
      AppToast.errorInShell(context, e.message);
    } on LabApiException catch (e) {
      if (!mounted) return;
      AppToast.errorInShell(context, e.message);
    } catch (_) {
      if (!mounted) return;
      AppToast.errorInShell(context, 'Could not download the report. Try again.');
    } finally {
      if (mounted) setState(() => _downloading = false);
    }
  }

  Future<void> _runAiCheck() async {
    if (_aiRunning || !group.hasPdf) return;
    final session = SessionScope.of(context);
    setState(() => _aiRunning = true);
    try {
      await session.runAiAnalysis(testId: group.primaryTest.testId);
      if (!mounted) return;
      context.push('/ai-analysis');
    } on LabApiException catch (e) {
      if (!mounted) return;
      AppToast.errorInShell(context, e.message);
    } catch (_) {
      if (!mounted) return;
      AppToast.errorInShell(context, 'Could not run AI Check. Try again.');
    } finally {
      if (mounted) setState(() => _aiRunning = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final cs = context.cs;
    final borderColor = cs.primary.withValues(alpha: 0.35);
    final hasPdf = group.hasPdf;
    final session = SessionScope.of(context);
    final hasCachedAi = session.aiAnalysisTestId == group.primaryTest.testId && session.aiAnalysis != null;
    final releasedAt = group.latestReleasedAt;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: context.cardFill,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: borderColor, width: 1.4),
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
                  backgroundColor: const Color(0xFFEAF1FF),
                  child: Icon(Icons.picture_as_pdf_rounded, size: 20, color: cs.primary),
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
                            'Combined report',
                            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                  fontWeight: FontWeight.w700,
                                ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(
                              color: cs.primaryContainer.withValues(alpha: 0.55),
                              borderRadius: BorderRadius.circular(999),
                            ),
                            child: Text(
                              group.label.toUpperCase(),
                              style: Theme.of(context).textTheme.labelSmall?.copyWith(
                                    color: cs.onPrimaryContainer,
                                    fontWeight: FontWeight.w700,
                                    letterSpacing: 0.4,
                                  ),
                            ),
                          ),
                          _StatusBadge(hasPdf: hasPdf),
                        ],
                      ),
                      const SizedBox(height: 6),
                      Text(
                        '${group.tests.length} tests share one PDF',
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                              color: cs.onSurfaceVariant,
                            ),
                      ),
                      if (releasedAt != null) ...[
                        const SizedBox(height: 6),
                        Wrap(
                          crossAxisAlignment: WrapCrossAlignment.center,
                          spacing: 4,
                          children: [
                            Icon(Icons.event_outlined, size: 14, color: cs.onSurfaceVariant),
                            Text(
                              'Released ${_fmtDate(releasedAt)}',
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
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
            child: Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                for (final test in group.tests)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                    decoration: BoxDecoration(
                      color: cs.surfaceContainerHighest.withValues(alpha: 0.45),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: cs.outlineVariant.withValues(alpha: 0.55)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          test.testName,
                          style: Theme.of(context).textTheme.labelLarge?.copyWith(
                                fontWeight: FontWeight.w600,
                              ),
                        ),
                        if (test.testCode.isNotEmpty)
                          Text(
                            test.testCode,
                            style: Theme.of(context).textTheme.labelSmall?.copyWith(
                                  color: cs.onSurfaceVariant,
                                ),
                          ),
                      ],
                    ),
                  ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
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
                            'PDF not uploaded yet for this combined report.',
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
                        child: Text(_downloading ? 'Downloading…' : 'Download combined PDF'),
                      ),
                    ),
                  ),
                  const SizedBox(height: 8),
                  if (hasCachedAi)
                    SizedBox(
                      width: double.infinity,
                      child: OutlinedButton.icon(
                        onPressed: () => context.push('/ai-analysis'),
                        icon: const Icon(Icons.auto_awesome_rounded, size: 20),
                        label: const Text('View AI summary'),
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
                          child: Text(_aiRunning ? 'Running AI Check…' : 'Run AI Check'),
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
  const _StatusBadge({required this.hasPdf});

  final bool hasPdf;

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
        hasPdf ? 'PDF ready' : 'Pending',
        style: Theme.of(context).textTheme.labelSmall?.copyWith(
              color: color,
              fontWeight: FontWeight.w700,
            ),
      ),
    );
  }
}
