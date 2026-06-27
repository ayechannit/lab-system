import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../app/session_scope.dart';
import '../../theme/theme_extensions.dart';
import '../../widgets/common/app_branding_row.dart';
import '../../widgets/common/app_surface_card.dart';
import '../../widgets/common/notification_bell_button.dart';
import '../../widgets/navigation/lab_main_bottom_nav.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final session = SessionScope.of(context);
    final user = session.user;
    final cs = context.cs;
    if (user == null) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (context.mounted) context.go('/login');
      });
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    return Scaffold(
      appBar: AppBar(
        automaticallyImplyLeading: false,
        titleSpacing: 4,
        title: const AppBrandingRow(),
        actions: const [NotificationBellButton()],
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 20),
        children: [
          const SizedBox(height: 8),
          Center(
            child: Stack(
              children: [
                CircleAvatar(
                  radius: 58,
                  backgroundColor: cs.primary.withValues(alpha: 0.12),
                  child: CircleAvatar(
                    radius: 53,
                    backgroundColor: cs.primary.withValues(alpha: 0.85),
                    child: Text(
                      user.name.isNotEmpty ? user.name[0].toUpperCase() : '?',
                      style: TextStyle(
                        fontSize: 42,
                        color: cs.onPrimary,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                ),
                Positioned(
                  right: 2,
                  bottom: 2,
                  child: Container(
                    width: 36,
                    height: 36,
                    decoration: BoxDecoration(
                      color: cs.primary,
                      shape: BoxShape.circle,
                      border: Border.all(color: cs.surface, width: 2),
                    ),
                    child: Icon(Icons.edit, size: 18, color: cs.onPrimary),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),
          Text(
            user.name,
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.headlineMedium?.copyWith(fontWeight: FontWeight.w700),
          ),
          Text(
            user.role.label,
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.titleMedium?.copyWith(color: cs.onSurfaceVariant),
          ),
          const SizedBox(height: 18),
          _ContactCard(
            icon: Icons.call_outlined,
            iconColor: cs.primary,
            label: 'Phone',
            value: user.phone,
            leftBorderColor: cs.primary,
          ),
          const SizedBox(height: 12),
          _ContactCard(
            icon: Icons.mail_outline,
            iconColor: const Color(0xFFE07A3A),
            label: 'Email',
            value: user.email,
            leftBorderColor: const Color(0xFFE07A3A),
          ),
          const SizedBox(height: 18),
          Text(
            'ACCOUNT SETTINGS',
            style: Theme.of(context).textTheme.labelLarge?.copyWith(
                  color: cs.primary,
                  letterSpacing: 1.4,
                  fontWeight: FontWeight.w700,
                ),
          ),
          const SizedBox(height: 12),
          _SettingTile(
            icon: Icons.person_add_alt_1_outlined,
            title: 'Edit Profile',
            subtitle: 'Personal information, medical history',
            onTap: () => context.push('/edit-profile'),
          ),
          const SizedBox(height: 12),
          _SettingTile(
            icon: Icons.palette_outlined,
            title: 'Lab & appearance',
            subtitle: 'Theme, logo, and contact info from your lab',
            onTap: () => context.push('/lab-info'),
          ),
          const SizedBox(height: 12),
          Material(
            color: cs.primary,
            borderRadius: BorderRadius.circular(12),
            child: InkWell(
              onTap: () => context.push('/loyalty'),
              borderRadius: BorderRadius.circular(12),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'LOYALTY STATUS',
                      style: Theme.of(context).textTheme.labelLarge?.copyWith(
                            color: cs.onPrimary.withValues(alpha: 0.75),
                            letterSpacing: 1.2,
                          ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      session.loyalty.balance > 0
                          ? '${session.loyalty.balance} points'
                          : 'View loyalty points',
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            color: cs.onPrimary,
                            fontWeight: FontWeight.w700,
                          ),
                    ),
                  ],
                ),
              ),
            ),
          ),
          const SizedBox(height: 14),
          OutlinedButton.icon(
            onPressed: () {
              session.logout();
              context.go('/login');
            },
            icon: Icon(Icons.logout, color: cs.error),
            label: Text('Logout', style: TextStyle(color: cs.error)),
            style: OutlinedButton.styleFrom(
              side: BorderSide(color: cs.error.withValues(alpha: 0.35)),
              padding: const EdgeInsets.symmetric(vertical: 14),
            ),
          ),
        ],
      ),
      bottomNavigationBar: const LabMainBottomNav(current: LabMainTab.profile),
    );
  }
}

class _ContactCard extends StatelessWidget {
  const _ContactCard({
    required this.icon,
    required this.iconColor,
    required this.label,
    required this.value,
    required this.leftBorderColor,
  });

  final IconData icon;
  final Color iconColor;
  final String label;
  final String value;
  final Color leftBorderColor;

  @override
  Widget build(BuildContext context) {
    final cs = context.cs;
    return AppSurfaceCard(
      border: Border(left: BorderSide(color: leftBorderColor, width: 3)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, color: iconColor),
              const SizedBox(width: 8),
              Text(
                label,
                style: Theme.of(context).textTheme.titleMedium?.copyWith(color: cs.onSurfaceVariant),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            value,
            style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
          ),
        ],
      ),
    );
  }
}

class _SettingTile extends StatelessWidget {
  const _SettingTile({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.onTap,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final cs = context.cs;
    final extras = context.appExtras;
    return Material(
      color: context.cardFill,
      borderRadius: BorderRadius.circular(14),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: extras.iconTileBackground,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(icon, color: cs.primary),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      subtitle,
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: cs.onSurfaceVariant),
                    ),
                  ],
                ),
              ),
              Icon(Icons.chevron_right, color: cs.outline),
            ],
          ),
        ),
      ),
    );
  }
}
