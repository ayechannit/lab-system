import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../app/session_scope.dart';
import '../../theme/app_colors.dart';
import '../../theme/theme_extensions.dart';
import '../../widgets/common/app_branding_row.dart';
import '../../widgets/common/app_markdown_text.dart';
import '../../widgets/navigation/lab_main_bottom_nav.dart';

class AiAnalysisScreen extends StatelessWidget {
  const AiAnalysisScreen({super.key});

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
        final ai = session.aiAnalysis;
        final report = session.latestResult;
        final hasReport = report != null;
        final testLabel = ai?.testName?.trim();
        final testId = session.aiAnalysisTestId ?? ai?.testId;
        final summaryCardText = ai == null
            ? (hasReport
                ? 'Run analysis on a specific test from the report detail screen to get a plain-language summary.'
                : 'Load a completed order with results, then run analysis.')
            : (ai.summary.isNotEmpty ? ai.summary : 'No summary text returned.');

        return Scaffold(
          appBar: AppBar(
            leading: IconButton(
              icon: const Icon(Icons.arrow_back),
              tooltip: 'Back',
              onPressed: () => _goBack(context),
            ),
            titleSpacing: 4,
            title: const AppBrandingRow(size: 28),
          ),
          body: ListView(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
            children: [
              Center(
                child: Stack(
                  children: [
                    const CircleAvatar(
                      radius: 34,
                      backgroundColor: AppColors.primaryLight,
                      child: Icon(Icons.smart_toy, color: Colors.white, size: 28),
                    ),
                    Positioned(
                      right: 2,
                      bottom: 2,
                      child: Container(
                        width: 12,
                        height: 12,
                        decoration: BoxDecoration(
                          color: const Color(0xFF22C55E),
                          shape: BoxShape.circle,
                          border: Border.all(color: Colors.white, width: 1.2),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 10),
              Text(
                'AI summary',
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w700),
              ),
              Text(
                !hasReport
                    ? 'No lab report is loaded for your account yet.'
                    : testLabel != null && testLabel.isNotEmpty
                        ? '$testLabel · ${ai != null ? 'Analysis on file' : 'Run from report detail'}'
                        : 'Order ${report.orderId.length >= 8 ? report.orderId.substring(0, 8) : report.orderId} · ${ai != null ? 'Analysis on file' : 'Run from report detail'}',
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: context.cs.onSurfaceVariant),
              ),
              const SizedBox(height: 14),
              _plainCard(context, summaryCardText),
              if (ai == null && hasReport && testId == null) ...[
                const SizedBox(height: 12),
                Text(
                  'Open a released report and tap Run AI Check on the test you want summarized.',
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(color: context.cs.onSurfaceVariant),
                ),
              ],
              if (ai != null) ...[
                const SizedBox(height: 16),
                Text(
                  'Details',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 8),
                _plainCard(
                  context,
                  ai.observation.isNotEmpty ? ai.observation : 'No observation text returned.',
                ),
                const SizedBox(height: 12),
                Text(
                  'Recommendation',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 8),
                _plainCard(
                  context,
                  ai.recommendation.isNotEmpty ? ai.recommendation : 'No recommendation text returned.',
                ),
              ],
            ],
          ),
          bottomNavigationBar: const LabMainBottomNav(current: LabMainTab.results),
        );
      },
    );
  }

  Widget _plainCard(BuildContext context, String text) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: context.cardFill,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: context.subtleBorder),
      ),
      child: AppMarkdownText(text),
    );
  }
}
