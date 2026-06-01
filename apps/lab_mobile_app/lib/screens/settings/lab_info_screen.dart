import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../app/app_settings_scope.dart';
import '../../theme/app_colors.dart';
import '../../theme/theme_extensions.dart';
import '../../widgets/common/app_brand_mark.dart';
import '../../widgets/common/section_card.dart';

/// Read-only lab branding & contact from admin System settings.
class LabInfoScreen extends StatelessWidget {
  const LabInfoScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final settingsCtrl = AppSettingsScope.of(context);
    final s = settingsCtrl.settings;

    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
        ),
        title: const Text('Lab settings'),
      ),
      body: RefreshIndicator(
        onRefresh: settingsCtrl.refresh,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
          physics: const AlwaysScrollableScrollPhysics(),
          children: [
            if (settingsCtrl.loadError != null)
              Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Text(
                  'Could not refresh settings. Showing last known values.',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(color: AppColors.error),
                ),
              ),
            SectionCard(
              title: 'Appearance',
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      AppBrandMark(size: 48, iconSize: 22, logoUrl: s.logoUrl, showShadow: false),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              s.labName,
                              style: Theme.of(context).textTheme.titleMedium,
                            ),
                            const SizedBox(height: 4),
                            Text(
                              s.isDarkTheme ? 'Dark theme' : 'Light theme',
                              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                    color: context.cs.onSurfaceVariant,
                                  ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Text(
                    'Theme and branding are managed in the admin portal. Pull down to refresh after changes.',
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: context.cs.onSurfaceVariant,
                        ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            SectionCard(
              title: 'Contact',
              child: Column(
                children: [
                  _InfoRow(
                    icon: Icons.location_on_outlined,
                    label: 'Address',
                    value: s.address ?? '—',
                  ),
                  const SizedBox(height: 10),
                  _InfoRow(
                    icon: Icons.phone_outlined,
                    label: 'Phone',
                    value: s.contactPhone ?? '—',
                  ),
                  const SizedBox(height: 10),
                  _InfoRow(
                    icon: Icons.mail_outline,
                    label: 'Email',
                    value: s.contactEmail ?? '—',
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  const _InfoRow({
    required this.icon,
    required this.label,
    required this.value,
  });

  final IconData icon;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 20, color: context.cs.primary),
        const SizedBox(width: 10),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: Theme.of(context).textTheme.labelSmall?.copyWith(
                      color: context.cs.onSurfaceVariant,
                    ),
              ),
              Text(value, style: Theme.of(context).textTheme.bodyMedium),
            ],
          ),
        ),
      ],
    );
  }
}
