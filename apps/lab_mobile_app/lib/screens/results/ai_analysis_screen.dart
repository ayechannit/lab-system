import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../app/session_scope.dart';
import '../../theme/app_colors.dart';
import '../../widgets/common/app_brand_mark.dart';

class AiAnalysisScreen extends StatelessWidget {
  const AiAnalysisScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final session = SessionScope.of(context);
    final analysis = session.aiAnalysis;
    final report = session.latestResult;
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
            'Smart Analysis',
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w700),
          ),
          Text(
            report == null
                ? 'Result not available yet.'
                : 'Analyzing ${report.sampleId} • ${analysis == null ? 'Pending' : 'Ready'}',
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: AppColors.onSurfaceVariant),
          ),
          const SizedBox(height: 14),
          _simpleCard(
            analysis?.summary ??
                'Tap "Run Analysis" to get AI interpretation after report-out from the lab.',
          ),
          const SizedBox(height: 12),
          SizedBox(
            height: 48,
            child: FilledButton.icon(
              onPressed: report == null
                  ? null
                  : () {
                      session.runAiAnalysis();
                    },
              icon: const Icon(Icons.bolt_outlined),
              label: const Text('Run Analysis'),
            ),
          ),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: AppColors.primary.withValues(alpha: 0.55)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    _pill('Observation\nFound', const Color(0xFFFEE4E2), const Color(0xFFB42318)),
                    const SizedBox(width: 8),
                    _pill('ACTION RECOMMENDED', const Color(0xFFFFE9E0), const Color(0xFF9A3412)),
                  ],
                ),
                const SizedBox(height: 10),
                Text(
                  '"${analysis?.observation ?? 'Waiting for AI output...'}"',
                  style: Theme.of(context).textTheme.bodyLarge?.copyWith(fontStyle: FontStyle.italic),
                ),
                const SizedBox(height: 10),
                const Divider(height: 1),
                const SizedBox(height: 10),
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        'YOUR\nHEMOGLOBIN\n11.2 g/dL',
                        style: Theme.of(context).textTheme.labelLarge?.copyWith(color: AppColors.onSurfaceVariant),
                      ),
                    ),
                    Expanded(
                      child: Text(
                        'REFERENCE\nRANGE\n13.5 - 17.5 g/dL',
                        style: Theme.of(context).textTheme.labelLarge?.copyWith(color: AppColors.onSurfaceVariant),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          _simpleCard(
            analysis?.recommendation ??
                "After lab report-out, AI recommendation will appear here.",
          ),
          const SizedBox(height: 14),
          Text('Suggested Next Steps', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
          const SizedBox(height: 8),
          _nextStepTile(context, Icons.calendar_month_outlined, 'Book GP Consultation', 'Telehealth or in-person'),
          const SizedBox(height: 8),
          _nextStepTile(context, Icons.description_outlined, 'View Full Lab Report', 'PDF Download available'),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: AppColors.primaryLight,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Stack(
              children: [
                Positioned(
                  right: -6,
                  bottom: -6,
                  child: Icon(Icons.biotech, size: 56, color: Colors.white.withValues(alpha: 0.12)),
                ),
                Text(
                  'What is Hemoglobin?\nHemoglobin is a protein in your red blood cells that carries oxygen from your lungs to the rest of your body. Low levels can sometimes make you feel tired or short of breath.',
                  style: Theme.of(context).textTheme.bodyLarge?.copyWith(color: Colors.white),
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
          children: [
            Expanded(child: _NavItem(icon: Icons.grid_view_rounded, label: 'HOME', onTap: () => context.go('/home'))),
            Expanded(child: _NavItem(icon: Icons.biotech_outlined, label: 'ORDERS', onTap: () => context.push('/order-lab-test'))),
            Expanded(child: _NavItem(icon: Icons.assignment_outlined, label: 'RESULTS', active: true, onTap: () {})),
            Expanded(child: _NavItem(icon: Icons.military_tech_outlined, label: 'POINTS', onTap: () => context.push('/loyalty'))),
            Expanded(child: _NavItem(icon: Icons.person_outline, label: 'PROFILE', onTap: () => context.push('/profile'))),
          ],
        ),
      ),
    );
  }

  Widget _simpleCard(String text) => Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: const Color(0x66E1E2EC)),
        ),
        child: Text(
          text,
          style: const TextStyle(height: 1.35),
        ),
      );

  Widget _pill(String text, Color bg, Color fg) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
        decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(999)),
        child: Text(
          text,
          style: TextStyle(color: fg, fontSize: 10.5, fontWeight: FontWeight.w700),
        ),
      );

  Widget _nextStepTile(BuildContext context, IconData icon, String title, String subtitle) => Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: const Color(0x66E1E2EC)),
        ),
        child: Row(
          children: [
            Container(
              width: 38,
              height: 38,
              decoration: BoxDecoration(
                color: const Color(0xFFEAF1FF),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(icon, color: AppColors.primary),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: Theme.of(context).textTheme.titleMedium),
                  Text(subtitle, style: Theme.of(context).textTheme.bodySmall?.copyWith(color: AppColors.onSurfaceVariant)),
                ],
              ),
            ),
            const Icon(Icons.chevron_right, color: AppColors.outline),
          ],
        ),
      );
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
          padding: const EdgeInsets.symmetric(horizontal: 2, vertical: 6),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Icon(icon, size: 20, color: fg),
              const SizedBox(height: 2),
              FittedBox(
                fit: BoxFit.scaleDown,
                child: Text(
                  label,
                  maxLines: 1,
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.labelSmall?.copyWith(
                        color: fg,
                        fontWeight: active ? FontWeight.w700 : FontWeight.w600,
                      ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
