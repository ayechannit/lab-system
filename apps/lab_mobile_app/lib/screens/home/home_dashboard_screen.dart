import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../app/session_scope.dart';
import '../../theme/app_colors.dart';
import '../../widgets/common/app_brand_mark.dart';
import '../../widgets/common/quick_action_button.dart';
import '../../widgets/navigation/lab_main_bottom_nav.dart';
import '../../widgets/results/lab_result_insight_cards.dart';

class HomeDashboardScreen extends StatelessWidget {
  const HomeDashboardScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final session = SessionScope.of(context);
    final user = session.user;
    final pointsBalance = session.loyalty.balance;
    if (user == null) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (context.mounted) {
          context.go('/login');
        }
      });
      return const Scaffold(
        body: Center(
          child: CircularProgressIndicator(),
        ),
      );
    }
    final latestReport = session.latestResult;
    final hasReportPayload = (latestReport?.lines.isNotEmpty ?? false) ||
        (latestReport?.resultPdfUrl ?? '').isNotEmpty;

    return Scaffold(
      backgroundColor: AppColors.surface,
      appBar: AppBar(
        automaticallyImplyLeading: false,
        titleSpacing: 16,
        title: Row(
          children: [
            GestureDetector(
              onTap: () => context.push('/profile'),
              child: const AppBrandMark(
                size: 36,
                iconSize: 18,
                borderRadius: 9,
              ),
            ),
            const SizedBox(width: 10),
            Text(
              'MedLab Smart',
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
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
            'Welcome back,',
            style: Theme.of(context).textTheme.labelLarge?.copyWith(color: AppColors.onSurfaceVariant),
          ),
          Text(
            user.name,
            style: Theme.of(context).textTheme.headlineMedium?.copyWith(color: AppColors.primary),
          ),
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border(
                left: BorderSide(
                  color: AppColors.primaryLight,
                  width: 4,
                ),
              ),
              boxShadow: const [
                BoxShadow(
                  color: Color(0x120052CC),
                  blurRadius: 18,
                  offset: Offset(0, 6),
                ),
              ],
            ),
            child: Column(
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Points Balance',
                              style: Theme.of(context)
                                  .textTheme
                                  .titleMedium
                                  ?.copyWith(color: AppColors.onSurfaceVariant)),
                          const SizedBox(height: 4),
                          Text(
                            '$pointsBalance Points',
                            style: Theme.of(context).textTheme.headlineSmall,
                          ),
                        ],
                      ),
                    ),
                    Container(
                      width: 54,
                      height: 54,
                      decoration: BoxDecoration(
                        color: AppColors.primaryLight,
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: const Icon(Icons.military_tech, color: Colors.white),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'RESULTS & INSIGHTS',
                      style: Theme.of(context).textTheme.labelSmall?.copyWith(
                            color: AppColors.onSurfaceVariant,
                            letterSpacing: 1.0,
                          ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      'Latest lab report',
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.w700,
                          ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Sample ID: ${latestReport?.sampleId ?? 'Pending'}',
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: AppColors.onSurfaceVariant),
                    ),
                    if (!hasReportPayload) ...[
                      const SizedBox(height: 8),
                      Text(
                        'Results are not available yet.',
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: AppColors.onSurfaceVariant),
                      ),
                    ],
                  ],
                ),
              ),
              TextButton(
                onPressed: () => context.push('/lab-results'),
                child: const Text('Full report'),
              ),
            ],
          ),
          const SizedBox(height: 12),
          LabResultInsightCards(report: latestReport),
          const SizedBox(height: 18),
          GridView.count(
            crossAxisCount: 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            mainAxisSpacing: 12,
            crossAxisSpacing: 12,
            childAspectRatio: 1.05,
            children: [
              QuickActionButton(
                icon: Icons.add_circle,
                label: 'Order Lab Test',
                onTap: () => context.push('/order-lab-test'),
                iconBackgroundColor: const Color(0xFFEAF1FF),
                iconColor: AppColors.primary,
              ),
              QuickActionButton(
                icon: Icons.assignment_outlined,
                label: 'View Results',
                onTap: () => context.push('/lab-results'),
                iconBackgroundColor: const Color(0xFFEAF9F1),
                iconColor: const Color(0xFF0D8A5B),
              ),
              QuickActionButton(
                icon: Icons.inventory_2_outlined,
                label: 'Rate Service',
                onTap: () => context.push('/rating-feedback'),
                iconBackgroundColor: const Color(0xFFFFF4E5),
                iconColor: const Color(0xFFB45309),
              ),
              QuickActionButton(
                icon: Icons.military_tech_outlined,
                label: 'Points',
                onTap: () => context.push('/loyalty'),
                iconBackgroundColor: const Color(0xFFEAF1FF),
                iconColor: AppColors.primary,
              ),
            ],
          ),
        ],
      ),
      bottomNavigationBar: const LabMainBottomNav(current: LabMainTab.home),
    );
  }
}
