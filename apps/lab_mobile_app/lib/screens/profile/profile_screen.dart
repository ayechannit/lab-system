import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../app/session_scope.dart';
import '../../app/locale_scope.dart';
import '../../l10n/app_localizations.dart';
import '../../theme/theme_extensions.dart';
import '../../widgets/common/app_branding_row.dart';
import '../../widgets/common/app_surface_card.dart';
import '../../widgets/common/app_toast.dart';
import '../../widgets/common/membership_tier_badge.dart';
import '../../widgets/common/notification_bell_button.dart';
import '../../widgets/common/user_profile_avatar.dart';
import '../../widgets/navigation/lab_main_bottom_nav.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  bool _deleting = false;

  Future<void> _confirmDeleteAccount() async {
    final l10n = AppLocalizations.of(context)!;
    final cs = context.cs;
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(
          l10n.deleteAccountTitle,
          style: Theme.of(ctx).textTheme.titleLarge?.copyWith(height: 1.35),
        ),
        content: Text(
          l10n.deleteAccountMessage,
          style: Theme.of(ctx).textTheme.bodyMedium?.copyWith(height: 1.45),
        ),
        actionsPadding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
        actionsAlignment: MainAxisAlignment.end,
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            style: TextButton.styleFrom(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            ),
            child: Text(
              l10n.profileCancel,
              style: TextStyle(color: cs.error, height: 1.4),
            ),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: FilledButton.styleFrom(
              backgroundColor: cs.error,
              foregroundColor: cs.onError,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            ),
            child: Text(
              l10n.deleteAccountConfirm,
              style: const TextStyle(height: 1.4),
            ),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;

    final session = SessionScope.of(context);
    setState(() => _deleting = true);
    try {
      await session.deleteAccount();
      if (!mounted) return;
      AppToast.success(context, l10n.deleteAccountSuccess, title: l10n.deleteAccount);
      context.go('/login');
    } catch (e) {
      if (!mounted) return;
      AppToast.error(context, '$e', title: l10n.deleteAccountFailed);
    } finally {
      if (mounted) setState(() => _deleting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final session = SessionScope.of(context);
    final localeController = LocaleScope.of(context);
    final l10n = AppLocalizations.of(context)!;
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
            child: UserProfileAvatar(
              name: user.name,
              imageUrl: user.profileImageUrl,
              radius: 58,
              showEditBadge: true,
              onEditTap: () => context.push('/edit-profile'),
            ),
          ),
          const SizedBox(height: 14),
          Text(
            user.name,
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.headlineMedium?.copyWith(fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 18),
          _ContactCard(
            icon: Icons.call_outlined,
            iconColor: cs.primary,
            label: l10n.phone,
            value: user.phone,
            leftBorderColor: cs.primary,
          ),
          const SizedBox(height: 18),
          Text(
            l10n.accountSettings,
            style: Theme.of(context).textTheme.labelLarge?.copyWith(
                  color: cs.primary,
                  letterSpacing: 1.4,
                  fontWeight: FontWeight.w700,
                ),
          ),
          const SizedBox(height: 12),
          _SettingTile(
            icon: Icons.person_add_alt_1_outlined,
            title: l10n.editProfile,
            subtitle: l10n.editProfileSubtitle,
            onTap: _deleting ? null : () => context.push('/edit-profile'),
          ),
          const SizedBox(height: 12),
          _SettingTile(
            icon: Icons.palette_outlined,
            title: l10n.labAppearance,
            subtitle: l10n.labAppearanceSubtitle,
            onTap: _deleting ? null : () => context.push('/lab-info'),
          ),
          _SettingTile(
            icon: Icons.translate,
            title: l10n.language,
            subtitle: localeController.locale.languageCode == 'my'
                ? l10n.languageMyanmar
                : l10n.languageEnglish,
            onTap: _deleting
                ? null
                : () async {
                    final picked = await showModalBottomSheet<String>(
                      context: context,
                      showDragHandle: true,
                      builder: (ctx) => SafeArea(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            ListTile(
                              title: Text(l10n.languageEnglish),
                              trailing: localeController.locale.languageCode == 'en'
                                  ? Icon(Icons.check_circle, color: cs.primary)
                                  : null,
                              onTap: () => Navigator.pop(ctx, 'en'),
                            ),
                            ListTile(
                              title: Text(l10n.languageMyanmar),
                              trailing: localeController.locale.languageCode == 'my'
                                  ? Icon(Icons.check_circle, color: cs.primary)
                                  : null,
                              onTap: () => Navigator.pop(ctx, 'my'),
                            ),
                          ],
                        ),
                      ),
                    );
                    if (picked == null || !context.mounted) return;
                    await localeController.setLocale(Locale(picked));
                  },
          ),
          const SizedBox(height: 12),
          _SettingTile(
            icon: Icons.delete_outline,
            title: l10n.deleteAccount,
            subtitle: l10n.deleteAccountSubtitle,
            iconColor: cs.error,
            onTap: _deleting ? null : _confirmDeleteAccount,
          ),
          const SizedBox(height: 12),
          Material(
            color: cs.primary,
            borderRadius: BorderRadius.circular(12),
            child: InkWell(
              onTap: _deleting ? null : () => context.push('/loyalty'),
              borderRadius: BorderRadius.circular(12),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      l10n.loyaltyStatus,
                      style: Theme.of(context).textTheme.labelLarge?.copyWith(
                            color: cs.onPrimary.withValues(alpha: 0.75),
                            letterSpacing: 1.2,
                          ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      session.loyalty.balance > 0
                          ? l10n.pointsCount(session.loyalty.balance)
                          : l10n.viewLoyaltyPoints,
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            color: cs.onPrimary,
                            fontWeight: FontWeight.w700,
                          ),
                    ),
                    const SizedBox(height: 10),
                    MembershipTierBadge(
                      tierName: user.tierName?.trim() ?? '',
                      discountPercent: user.tierDiscountPercent,
                      onDark: true,
                    ),
                  ],
                ),
              ),
            ),
          ),
          const SizedBox(height: 14),
          OutlinedButton.icon(
            onPressed: _deleting
                ? null
                : () {
                    session.logout();
                    context.go('/login');
                  },
            icon: Icon(Icons.logout, color: cs.error),
            label: Text(l10n.signOut, style: TextStyle(color: cs.error)),
            style: OutlinedButton.styleFrom(
              side: BorderSide(color: cs.error.withValues(alpha: 0.35)),
              padding: const EdgeInsets.symmetric(vertical: 14),
            ),
          ),
          if (_deleting) ...[
            const SizedBox(height: 16),
            const Center(child: CircularProgressIndicator()),
          ],
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
    this.iconColor,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback? onTap;
  final Color? iconColor;

  @override
  Widget build(BuildContext context) {
    final cs = context.cs;
    final extras = context.appExtras;
    final accent = iconColor ?? cs.primary;
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
                  color: iconColor != null
                      ? iconColor!.withValues(alpha: 0.12)
                      : extras.iconTileBackground,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(icon, color: accent),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.w700,
                            color: iconColor,
                          ),
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
