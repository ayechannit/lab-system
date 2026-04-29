import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../app/session_scope.dart';
import '../../models/lab_result.dart';
import '../../theme/app_colors.dart';
import '../../widgets/common/app_brand_mark.dart';

class LabResultsScreen extends StatelessWidget {
  const LabResultsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final session = SessionScope.of(context);
    final report = session.latestResult;
    final lines = report?.lines ?? const <LabResultLine>[];
    return Scaffold(
      appBar: AppBar(
        automaticallyImplyLeading: false,
        titleSpacing: 12,
        title: Row(
          children: [
            const AppBrandMark(size: 24, iconSize: 12, borderRadius: 6),
            const SizedBox(width: 8),
            Text(
              'MedLab Smart',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
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
            'MY RESULTS  ·  COMPLETE BLOOD COUNT',
            style: Theme.of(context).textTheme.labelSmall?.copyWith(
                  color: AppColors.onSurfaceVariant,
                  letterSpacing: 1.0,
                ),
          ),
          const SizedBox(height: 4),
          Text(
            'Lab Analysis Report',
            style: Theme.of(context).textTheme.headlineMedium,
          ),
          const SizedBox(height: 4),
          Text(
            'Sample ID: ${report?.sampleId ?? 'Pending'}',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: AppColors.onSurfaceVariant),
          ),
          const SizedBox(height: 12),
          if (lines.isEmpty)
            const Text('Results are not available yet.')
          else ...[
            _ResultCard(
              borderColor: lines.first.flag == ResultFlag.low ? const Color(0xFFC33636) : const Color(0xFF12B76A),
              title: lines.first.name,
              subtitle: 'Lab marker',
              badgeText: lines.first.flagLabel.toUpperCase(),
              badgeColor: lines.first.flag == ResultFlag.low ? const Color(0xFFB42318) : const Color(0xFF067647),
              badgeBackground: lines.first.flag == ResultFlag.low ? const Color(0xFFFEE4E2) : const Color(0xFFD1FADF),
              valueText: lines.first.value,
              unit: 'unit',
              valueColor: lines.first.flag == ResultFlag.low ? const Color(0xFFB42318) : const Color(0xFF101828),
              leftRange: 'Min',
              middleRange: 'Lab Range',
              rightRange: 'Max',
              markerPosition: lines.first.flag == ResultFlag.low ? 0.22 : 0.6,
              footerText: 'Value provided by the lab.',
            ),
            if (lines.length > 1) ...[
              const SizedBox(height: 10),
              _ResultCard(
                borderColor: lines[1].flag == ResultFlag.low ? const Color(0xFFC33636) : const Color(0xFF12B76A),
                title: lines[1].name,
                subtitle: 'Lab marker',
                badgeText: lines[1].flagLabel.toUpperCase(),
                badgeColor: lines[1].flag == ResultFlag.low ? const Color(0xFFB42318) : const Color(0xFF067647),
                badgeBackground: lines[1].flag == ResultFlag.low ? const Color(0xFFFEE4E2) : const Color(0xFFD1FADF),
                valueText: lines[1].value,
                unit: 'unit',
                valueColor: lines[1].flag == ResultFlag.low ? const Color(0xFFB42318) : const Color(0xFF101828),
                leftRange: 'Min',
                middleRange: 'Lab Range',
                rightRange: 'Max',
                markerPosition: lines[1].flag == ResultFlag.low ? 0.22 : 0.6,
                footerText: 'Value provided by the lab.',
              ),
            ],
          ],
          const SizedBox(height: 12),
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
                Text('AI Check',
                    style: Theme.of(context)
                        .textTheme
                        .headlineSmall
                        ?.copyWith(color: Colors.white, fontWeight: FontWeight.w700)),
                const SizedBox(height: 6),
                Text(
                  'Get an automated, simplified breakdown of what these results mean for your health profile.',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: Colors.white),
                ),
                const SizedBox(height: 12),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton.tonalIcon(
                    onPressed: report == null ? null : () => context.push('/ai-analysis'),
                    icon: const Icon(Icons.bolt_outlined),
                    label: const Text('Start Deep Analysis'),
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
                Text('Report Export',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
                const SizedBox(height: 4),
                Text(
                  'Share these results with your doctor or keep a local copy.',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: AppColors.onSurfaceVariant),
                ),
                const SizedBox(height: 12),
                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton.icon(
                    onPressed: () {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('PDF download (demo — no file generated)')),
                      );
                    },
                    icon: const Icon(Icons.picture_as_pdf_outlined),
                    label: const Text('Download PDF'),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
      bottomNavigationBar: Container(
        margin: const EdgeInsets.fromLTRB(14, 0, 14, 14),
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: const Color(0x66E1E2EC)),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceAround,
          children: [
            _NavItem(
              icon: Icons.grid_view_rounded,
              label: 'HOME',
              onTap: () => context.go('/home'),
            ),
            _NavItem(
              icon: Icons.biotech_outlined,
              label: 'ORDERS',
              onTap: () => context.push('/order-lab-test'),
            ),
            _NavItem(icon: Icons.assignment_outlined, label: 'RESULTS', active: true, onTap: () {}),
            _NavItem(
              icon: Icons.military_tech_outlined,
              label: 'POINTS',
              onTap: () => context.push('/loyalty'),
            ),
            _NavItem(
              icon: Icons.person_outline,
              label: 'PROFILE',
              onTap: () => context.push('/profile'),
            ),
          ],
        ),
      ),
    );
  }
}

class _ResultCard extends StatelessWidget {
  const _ResultCard({
    required this.borderColor,
    required this.title,
    required this.subtitle,
    required this.badgeText,
    required this.badgeColor,
    required this.badgeBackground,
    required this.valueText,
    required this.unit,
    required this.valueColor,
    required this.leftRange,
    required this.middleRange,
    required this.rightRange,
    required this.markerPosition,
    required this.footerText,
  });

  final Color borderColor;
  final String title;
  final String subtitle;
  final String badgeText;
  final Color badgeColor;
  final Color badgeBackground;
  final String valueText;
  final String unit;
  final Color valueColor;
  final String leftRange;
  final String middleRange;
  final String rightRange;
  final double markerPosition;
  final String footerText;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border(left: BorderSide(color: borderColor, width: 3)),
      ),
      padding: const EdgeInsets.all(12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title, style: Theme.of(context).textTheme.titleMedium),
                    Text(
                      subtitle,
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(color: AppColors.onSurfaceVariant),
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: badgeBackground,
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Text(
                  badgeText,
                  style: Theme.of(context).textTheme.labelSmall?.copyWith(
                        color: badgeColor,
                        fontWeight: FontWeight.w700,
                      ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          RichText(
            text: TextSpan(
              children: [
                TextSpan(
                  text: valueText,
                  style: Theme.of(context).textTheme.headlineLarge?.copyWith(
                        color: valueColor,
                        fontWeight: FontWeight.w800,
                      ),
                ),
                TextSpan(
                  text: ' $unit',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: AppColors.onSurfaceVariant),
                ),
              ],
            ),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Text('Min ($leftRange)', style: Theme.of(context).textTheme.labelSmall?.copyWith(color: AppColors.onSurfaceVariant)),
              const Spacer(),
              Text(middleRange, style: Theme.of(context).textTheme.labelSmall?.copyWith(color: AppColors.onSurfaceVariant)),
              const Spacer(),
              Text('Max ($rightRange)', style: Theme.of(context).textTheme.labelSmall?.copyWith(color: AppColors.onSurfaceVariant)),
            ],
          ),
          const SizedBox(height: 6),
          ClipRRect(
            borderRadius: BorderRadius.circular(99),
            child: SizedBox(
              height: 6,
              child: Stack(
                children: [
                  Container(color: const Color(0xFFE6E7F1)),
                  Positioned(
                    left: (markerPosition.clamp(0.0, 1.0) * 220),
                    child: Container(
                      width: 3,
                      height: 6,
                      color: valueColor,
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 8),
          const Divider(height: 1),
          const SizedBox(height: 8),
          Text(
            footerText,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: AppColors.onSurfaceVariant),
          ),
        ],
      ),
    );
  }
}

class _NavItem extends StatelessWidget {
  const _NavItem({
    required this.icon,
    required this.label,
    required this.onTap,
    this.active = false,
  });

  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final bool active;

  @override
  Widget build(BuildContext context) {
    final fg = active ? AppColors.primary : AppColors.outline;
    return Material(
      color: active ? const Color(0xFFEAF1FF) : Colors.transparent,
      borderRadius: BorderRadius.circular(12),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, size: 20, color: fg),
              const SizedBox(height: 2),
              Text(
                label,
                style: Theme.of(context).textTheme.labelSmall?.copyWith(
                      color: fg,
                      fontWeight: active ? FontWeight.w700 : FontWeight.w600,
                    ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
