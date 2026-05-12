import 'package:flutter/material.dart';

import '../../app/session_scope.dart';
import '../../theme/app_colors.dart';
import '../../widgets/common/app_brand_mark.dart';
import '../../widgets/navigation/lab_main_bottom_nav.dart';

class LoyaltyPointsScreen extends StatelessWidget {
  const LoyaltyPointsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final session = SessionScope.of(context);
    final balance = session.loyalty.balance;
    final history = session.loyalty.entries;
    return Scaffold(
      appBar: AppBar(
        automaticallyImplyLeading: false,
        titleSpacing: 12,
        title: Row(
          children: [
            const AppBrandMark(size: 32, iconSize: 16, borderRadius: 8),
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
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(24),
              gradient: const LinearGradient(
                colors: [AppColors.primaryLight, AppColors.primary],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('TOTAL BALANCE',
                    style: Theme.of(context).textTheme.labelLarge?.copyWith(color: Colors.white70, letterSpacing: 1.2)),
                const SizedBox(height: 4),
                RichText(
                  text: TextSpan(
                    children: [
                      TextSpan(
                        text: '$balance',
                        style: Theme.of(context).textTheme.headlineLarge?.copyWith(
                              color: Colors.white,
                              fontWeight: FontWeight.w800,
                            ),
                      ),
                      TextSpan(
                        text: ' Points',
                        style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                              color: Colors.white70,
                            ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Text(
                'Points history',
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(color: AppColors.primary),
              ),
            ],
          ),
          const SizedBox(height: 4),
          if (history.isEmpty)
            Padding(
              padding: const EdgeInsets.only(top: 12),
              child: Text(
                'No point transactions returned yet.',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: AppColors.onSurfaceVariant),
              ),
            )
          else
            ...history.map(
              (e) => Container(
                margin: const EdgeInsets.only(bottom: 10),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  border: Border(
                    left: BorderSide(
                      color: e.delta >= 0 ? AppColors.accentGreen : AppColors.primaryLight,
                      width: 3,
                    ),
                  ),
                ),
                child: Row(
                  children: [
                    CircleAvatar(
                      radius: 18,
                      backgroundColor: const Color(0xFFEAF1FF),
                      child: Icon(
                        e.delta >= 0 ? Icons.biotech_outlined : Icons.shopping_bag_outlined,
                        color: e.delta >= 0 ? AppColors.primary : AppColors.outline,
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(e.label, style: Theme.of(context).textTheme.titleMedium),
                          Text(e.atLabel, style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: AppColors.onSurfaceVariant)),
                        ],
                      ),
                    ),
                    Text(
                      '${e.delta > 0 ? '+' : ''}${e.delta}\npoints',
                      textAlign: TextAlign.right,
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            color: e.delta >= 0 ? AppColors.accentGreen : AppColors.primary,
                            fontWeight: FontWeight.w700,
                          ),
                    ),
                  ],
                ),
              ),
            ),
        ],
      ),
      bottomNavigationBar: const LabMainBottomNav(current: LabMainTab.points),
    );
  }
}
