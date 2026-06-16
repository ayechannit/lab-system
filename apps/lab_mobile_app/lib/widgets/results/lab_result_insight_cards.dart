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

/// Official PDF + AI Check actions — shared by result detail and home dashboard.
class LabResultInsightCards extends StatefulWidget {
  const LabResultInsightCards({
    super.key,
    required this.report,
    this.compact = false,
  });

  final LabResultReport? report;

  /// Tighter spacing when embedded on the home dashboard.
  final bool compact;

  @override
  State<LabResultInsightCards> createState() => _LabResultInsightCardsState();
}

class _LabResultInsightCardsState extends State<LabResultInsightCards> {
  bool _downloading = false;
  bool _aiRunning = false;

  LabResultReport? get report => widget.report;

  Future<void> _downloadPdf() async {
    if (_downloading) return;
    final r = report;
    if (r == null) return;

    setState(() => _downloading = true);
    try {
      final session = SessionScope.of(context);
      final saved = await session.downloadReportPdf(r);
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
    if (_aiRunning || report == null) return;
    final session = SessionScope.of(context);
    setState(() => _aiRunning = true);
    try {
      await session.runAiAnalysis();
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
    final lines = report?.lines ?? const <LabResultLine>[];
    final hasPdf = report?.hasPdfPayload ?? false;
    final canAi = report != null && (lines.isNotEmpty || hasPdf);
    final gap = widget.compact ? 10.0 : 14.0;
    final cs = context.cs;
    final borderColor = cs.outlineVariant.withValues(alpha: 0.55);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _OfficialReportCard(
          hasPdf: hasPdf,
          downloading: _downloading,
          borderColor: borderColor,
          onDownload: hasPdf ? _downloadPdf : null,
        ),
        SizedBox(height: gap),
        _AiCheckCard(
          canAi: canAi,
          running: _aiRunning,
          borderColor: borderColor,
          onPressed: canAi && !_aiRunning ? _runAiCheck : null,
        ),
      ],
    );
  }
}

class _OfficialReportCard extends StatelessWidget {
  const _OfficialReportCard({
    required this.hasPdf,
    required this.downloading,
    required this.borderColor,
    required this.onDownload,
  });

  final bool hasPdf;
  final bool downloading;
  final Color borderColor;
  final VoidCallback? onDownload;

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
            color: cs.shadow.withValues(alpha: 0.06),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: const Color(0xFFE53935).withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(Icons.picture_as_pdf_rounded, color: Color(0xFFC62828)),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Official lab report',
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      hasPdf
                          ? 'Save a copy of your official report to your device.'
                          : 'The PDF is not available yet. Check back soon or contact the lab.',
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: cs.onSurfaceVariant),
                    ),
                  ],
                ),
              ),
            ],
          ),
          if (hasPdf) ...[
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: FilledButton.icon(
                onPressed: downloading ? null : onDownload,
                icon: downloading
                    ? SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: cs.onPrimary,
                        ),
                      )
                    : const Icon(Icons.download_rounded),
                label: Text(downloading ? 'Downloading…' : 'Download PDF'),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _AiCheckCard extends StatelessWidget {
  const _AiCheckCard({
    required this.canAi,
    required this.running,
    required this.borderColor,
    required this.onPressed,
  });

  final bool canAi;
  final bool running;
  final Color borderColor;
  final VoidCallback? onPressed;

  @override
  Widget build(BuildContext context) {
    final cs = context.cs;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final gradientStart = isDark ? cs.primary.withValues(alpha: 0.85) : cs.primary;
    final gradientEnd = isDark ? cs.primaryContainer : AppColors.primaryLight;

    return DecoratedBox(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [gradientStart, gradientEnd],
        ),
        boxShadow: [
          BoxShadow(
            color: cs.primary.withValues(alpha: isDark ? 0.2 : 0.18),
            blurRadius: 14,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: isDark ? 0.14 : 0.22),
                borderRadius: BorderRadius.circular(999),
              ),
              child: Text(
                '✨ Smart Insights',
                style: Theme.of(context).textTheme.labelSmall?.copyWith(
                      color: Colors.white.withValues(alpha: 0.95),
                      fontWeight: FontWeight.w600,
                    ),
              ),
            ),
            const SizedBox(height: 10),
            Text(
              'AI Check',
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    color: Colors.white,
                    fontWeight: FontWeight.w700,
                  ),
            ),
            const SizedBox(height: 6),
            Text(
              'Get a plain-language summary of what these results mean for your health profile.',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: Colors.white.withValues(alpha: 0.92),
                  ),
            ),
            const SizedBox(height: 14),
            SizedBox(
              width: double.infinity,
              child: FilledButton.tonalIcon(
                onPressed: running ? () {} : onPressed,
                icon: running
                    ? SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(
                          strokeWidth: 2.5,
                          color: cs.primary,
                        ),
                      )
                    : const Icon(Icons.bolt_rounded),
                label: Text(
                  running ? 'Running AI Check…' : 'Run AI Check',
                  style: TextStyle(
                    fontWeight: running ? FontWeight.w600 : FontWeight.w500,
                  ),
                ),
                style: FilledButton.styleFrom(
                  backgroundColor: Colors.white,
                  foregroundColor: cs.primary,
                  disabledBackgroundColor: Colors.white.withValues(alpha: 0.72),
                  disabledForegroundColor: cs.primary.withValues(alpha: 0.38),
                  padding: const EdgeInsets.symmetric(vertical: 12),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
