import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../app/session_scope.dart';
import '../../theme/app_colors.dart';
import '../../widgets/common/app_brand_mark.dart';
import '../../widgets/navigation/lab_main_bottom_nav.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final session = SessionScope.of(context);
    final user = session.user;
    if (user == null) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (context.mounted) context.go('/login');
      });
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

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
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 20),
        children: [
          const SizedBox(height: 8),
          Center(
            child: Stack(
              children: [
                CircleAvatar(
                  radius: 58,
                  backgroundColor: AppColors.primary.withValues(alpha: 0.12),
                  child: CircleAvatar(
                    radius: 53,
                    backgroundColor: const Color(0xFF121826),
                    child: Text(
                      user.name.isNotEmpty ? user.name[0].toUpperCase() : '?',
                      style: const TextStyle(fontSize: 42, color: Colors.white, fontWeight: FontWeight.w700),
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
                      color: AppColors.primaryLight,
                      shape: BoxShape.circle,
                      border: Border.all(color: Colors.white, width: 2),
                    ),
                    child: const Icon(Icons.edit, size: 18, color: Colors.white),
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
            style: Theme.of(context).textTheme.titleMedium?.copyWith(color: AppColors.onSurfaceVariant),
          ),
          const SizedBox(height: 18),
          _ContactCard(
            icon: Icons.call_outlined,
            iconColor: AppColors.primary,
            label: 'Phone',
            value: user.phone,
            leftBorderColor: AppColors.primaryLight,
          ),
          const SizedBox(height: 12),
          _ContactCard(
            icon: Icons.mail_outline,
            iconColor: const Color(0xFFA33500),
            label: 'Email',
            value: user.email,
            leftBorderColor: const Color(0xFFA33500),
          ),
          const SizedBox(height: 18),
          Text(
            'ACCOUNT SETTINGS',
            style: Theme.of(context).textTheme.labelLarge?.copyWith(
                  color: AppColors.primary,
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
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppColors.primaryLight,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'LOYALTY STATUS',
                  style: Theme.of(context).textTheme.labelLarge?.copyWith(
                        color: Colors.white70,
                        letterSpacing: 1.2,
                      ),
                ),
                const SizedBox(height: 2),
                Text(
                  'Elite Wellness',
                  style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                        color: Colors.white,
                        fontWeight: FontWeight.w800,
                      ),
                ),
                const SizedBox(height: 6),
                Text(
                  '${user.pointsBalance} Points',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        color: Colors.white,
                        fontWeight: FontWeight.w700,
                      ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),
          OutlinedButton.icon(
            onPressed: () {
              session.logout();
              context.go('/login');
            },
            icon: const Icon(Icons.logout, color: AppColors.error),
            label: const Text('Logout', style: TextStyle(color: AppColors.error)),
            style: OutlinedButton.styleFrom(
              side: BorderSide(color: AppColors.error.withValues(alpha: 0.35)),
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
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border(left: BorderSide(color: leftBorderColor, width: 3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, color: iconColor),
              const SizedBox(width: 8),
              Text(label, style: Theme.of(context).textTheme.titleMedium?.copyWith(color: AppColors.onSurfaceVariant)),
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
    return Material(
      color: Colors.white,
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
                  color: const Color(0xFFEAF1FF),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(icon, color: AppColors.primary),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title, style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w700)),
                    const SizedBox(height: 2),
                    Text(
                      subtitle,
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: AppColors.onSurfaceVariant),
                    ),
                  ],
                ),
              ),
              const Icon(Icons.chevron_right, color: AppColors.outline),
            ],
          ),
        ),
      ),
    );
  }
}
