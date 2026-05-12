import 'package:flutter/material.dart';

import '../../app/session_scope.dart';
import '../../theme/app_colors.dart';
import '../../widgets/common/app_brand_mark.dart';
import '../../widgets/navigation/lab_main_bottom_nav.dart';

class AiAnalysisScreen extends StatelessWidget {
  const AiAnalysisScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final session = SessionScope.of(context);
    final ai = session.aiAnalysis;
    final report = session.latestResult;
    final hasReport = report != null;
    final summaryCardText = ai == null
        ? (hasReport
            ? 'Run analysis to request a plain-language summary from the lab AI service (uses your report data from the server).'
            : 'Load a completed order with results, then run analysis.')
        : (ai.summary.isNotEmpty ? ai.summary : 'No summary text returned.');

    return Scaffold(
      appBar: AppBar(
        automaticallyImplyLeading: false,
        titleSpacing: 4,
        title: Text(
          'MedLab Smart',
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                color: AppColors.primary,
                fontWeight: FontWeight.w800,
              ),
        ),
        actions: const [
          Padding(
            padding: EdgeInsets.symmetric(horizontal: 8),
            child: AppBrandMark(size: 24, iconSize: 12, borderRadius: 6),
          ),
        ],
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
                : 'Order ${report.orderId.length >= 8 ? report.orderId.substring(0, 8) : report.orderId} · ${ai != null ? 'Analysis on file' : 'Run analysis to fetch text from the lab API'}',
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: AppColors.onSurfaceVariant),
          ),
          const SizedBox(height: 14),
          _plainCard(context, summaryCardText),
          const SizedBox(height: 12),
          SizedBox(
            height: 48,
            child: FilledButton.icon(
              onPressed: !hasReport
                  ? null
                  : () {
                      session.runAiAnalysis();
                    },
              icon: const Icon(Icons.bolt_outlined),
              label: const Text('Run analysis'),
            ),
          ),
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
  }

  Widget _plainCard(BuildContext context, String text) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0x66E1E2EC)),
      ),
      child: Text(text, style: const TextStyle(height: 1.35)),
    );
  }
}
