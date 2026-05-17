import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../models/lab_result.dart';
import '../../theme/app_colors.dart';

/// AI Check + lab PDF actions — shared by [LabResultsScreen] and home dashboard.
class LabResultInsightCards extends StatelessWidget {
  const LabResultInsightCards({
    super.key,
    required this.report,
  });

  final LabResultReport? report;

  @override
  Widget build(BuildContext context) {
    final lines = report?.lines ?? const <LabResultLine>[];
    final pdfUrl = report?.resultPdfUrl;
    final hasStructured = lines.isNotEmpty;
    final hasPdf = pdfUrl != null && pdfUrl.isNotEmpty;
    final canAi = report != null && (hasStructured || hasPdf);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Container(
          decoration: BoxDecoration(
            color: AppColors.primaryLight,
            borderRadius: BorderRadius.circular(12),
          ),
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Text(
                  '✨ Smart Insights',
                  style: Theme.of(context).textTheme.labelSmall?.copyWith(color: Colors.white),
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'AI Check',
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                      color: Colors.white,
                      fontWeight: FontWeight.w700,
                    ),
              ),
              const SizedBox(height: 6),
              Text(
                'Get an automated, simplified breakdown of what these results mean for your health profile.',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: Colors.white),
              ),
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                child: FilledButton.tonalIcon(
                  onPressed: canAi ? () => context.push('/ai-analysis') : null,
                  icon: const Icon(Icons.bolt_outlined),
                  label: const Text('AI Check'),
                  style: FilledButton.styleFrom(
                    backgroundColor: Colors.white,
                    foregroundColor: AppColors.primary,
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 10),
        Container(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: const Color(0x66E1E2EC)),
          ),
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Report Export',
                style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 4),
              Text(
                'Share these results with your doctor or keep a local copy.',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: AppColors.onSurfaceVariant),
              ),
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  onPressed: () async {
                    final u = pdfUrl;
                    if (u == null || u.isEmpty) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('No PDF link from the lab yet.')),
                      );
                      return;
                    }
                    final uri = Uri.tryParse(u);
                    if (uri == null) return;
                    if (!await launchUrl(uri, mode: LaunchMode.externalApplication)) {
                      if (!context.mounted) return;
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Could not open the PDF link.')),
                      );
                    }
                  },
                  icon: const Icon(Icons.picture_as_pdf_outlined),
                  label: const Text('Open lab PDF'),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
