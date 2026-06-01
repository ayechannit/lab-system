import 'package:flutter/material.dart';

import '../../app/session_scope.dart';
import '../../theme/app_colors.dart';
import '../../theme/theme_extensions.dart';
import '../../widgets/common/app_branding_row.dart';
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
        title: const AppBrandingRow(markSize: 32, iconSize: 16, borderRadius: 8),
      ),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(24),
              gradient: LinearGradient(
                colors: [context.cs.primary.withValues(alpha: 0.85), context.cs.primary],
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
                              color: context.cardFill,
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
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(color: context.cs.primary),
              ),
            ],
          ),
          const SizedBox(height: 4),
          if (history.isEmpty)
            Padding(
              padding: const EdgeInsets.only(top: 12),
              child: Text(
                'No point transactions returned yet.',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: context.cs.onSurfaceVariant),
              ),
            )
          else
            ...history.map(
              (e) => Container(
                margin: const EdgeInsets.only(bottom: 10),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: context.cardFill,
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
                        color: e.delta >= 0 ? context.cs.primary : AppColors.outline,
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(e.label, style: Theme.of(context).textTheme.titleMedium),
                          Text(e.atLabel, style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: context.cs.onSurfaceVariant)),
                        ],
                      ),
                    ),
                    Text(
                      '${e.delta > 0 ? '+' : ''}${e.delta}\npoints',
                      textAlign: TextAlign.right,
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            color: e.delta >= 0 ? AppColors.accentGreen : context.cs.primary,
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
