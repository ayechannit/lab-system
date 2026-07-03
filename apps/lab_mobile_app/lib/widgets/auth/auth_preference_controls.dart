import 'package:flutter/material.dart';

import '../../app/app_settings_scope.dart';
import '../../app/locale_scope.dart';
import '../../app/user_theme_scope.dart';
import '../../l10n/app_localizations.dart';
import '../../theme/app_theme_presets.dart';
import '../../theme/theme_extensions.dart';

/// Language + theme switches for auth screens (top-right).
class AuthPreferenceControls extends StatelessWidget {
  const AuthPreferenceControls({super.key});

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final locale = LocaleScope.of(context);
    final themeCtrl = UserThemeScope.of(context);
    final settingsCtrl = AppSettingsScope.maybeOf(context);
    final effectivePreset = settingsCtrl == null
        ? themeCtrl.override ?? AppThemePresetId.idhc
        : themeCtrl.effectivePreset(settingsCtrl.settings.themePreset);
    final localeCode = locale.locale.languageCode.toUpperCase();

    return Padding(
      padding: const EdgeInsets.fromLTRB(12, 4, 12, 0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.end,
        children: [
          _AuthPrefChip(
            icon: Icons.translate,
            label: localeCode,
            tooltip: l10n.language,
            onTap: () => _showLanguageSheet(context),
          ),
          const SizedBox(width: 8),
          _AuthPrefChip(
            icon: _themeIcon(effectivePreset),
            label: _themeShortLabel(l10n, effectivePreset),
            tooltip: l10n.chooseTheme,
            onTap: () => _showThemeSheet(context),
          ),
        ],
      ),
    );
  }

  IconData _themeIcon(AppThemePresetId preset) {
    switch (preset) {
      case AppThemePresetId.dark:
        return Icons.dark_mode_outlined;
      case AppThemePresetId.idhc:
        return Icons.palette_outlined;
      case AppThemePresetId.light:
        return Icons.light_mode_outlined;
    }
  }

  String _themeShortLabel(AppLocalizations l10n, AppThemePresetId preset) {
    switch (preset) {
      case AppThemePresetId.dark:
        return l10n.themeDark;
      case AppThemePresetId.idhc:
        return l10n.themeIdhc;
      case AppThemePresetId.light:
        return l10n.themeLight;
    }
  }

  Future<void> _showLanguageSheet(BuildContext context) async {
    final l10n = AppLocalizations.of(context)!;
    final localeCtrl = LocaleScope.of(context);
    final cs = context.cs;

    final picked = await showModalBottomSheet<String>(
      context: context,
      showDragHandle: true,
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 4, 20, 8),
              child: Align(
                alignment: Alignment.centerLeft,
                child: Text(
                  l10n.chooseLanguage,
                  style: Theme.of(ctx).textTheme.titleMedium,
                ),
              ),
            ),
            ListTile(
              title: Text(l10n.languageEnglish),
              trailing: localeCtrl.locale.languageCode == 'en'
                  ? Icon(Icons.check_circle, color: cs.primary)
                  : null,
              onTap: () => Navigator.pop(ctx, 'en'),
            ),
            ListTile(
              title: Text(l10n.languageMyanmar),
              trailing: localeCtrl.locale.languageCode == 'my'
                  ? Icon(Icons.check_circle, color: cs.primary)
                  : null,
              onTap: () => Navigator.pop(ctx, 'my'),
            ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
    if (picked == null || !context.mounted) return;
    await localeCtrl.setLocale(Locale(picked));
  }

  Future<void> _showThemeSheet(BuildContext context) async {
    final l10n = AppLocalizations.of(context)!;
    final themeCtrl = UserThemeScope.of(context);
    final settingsCtrl = AppSettingsScope.maybeOf(context);
    final serverDefault = settingsCtrl?.settings.themePreset ?? AppThemePresetId.idhc;
    final current = themeCtrl.effectivePreset(serverDefault);
    final cs = context.cs;

    final picked = await showModalBottomSheet<AppThemePresetId>(
      context: context,
      showDragHandle: true,
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 4, 20, 8),
              child: Align(
                alignment: Alignment.centerLeft,
                child: Text(
                  l10n.chooseTheme,
                  style: Theme.of(ctx).textTheme.titleMedium,
                ),
              ),
            ),
            for (final preset in AppThemePresetId.values)
              ListTile(
                leading: Icon(_themeIcon(preset), color: cs.onSurfaceVariant),
                title: Text(_themeShortLabel(l10n, preset)),
                trailing: current == preset ? Icon(Icons.check_circle, color: cs.primary) : null,
                onTap: () => Navigator.pop(ctx, preset),
              ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
    if (picked == null || !context.mounted) return;
    await themeCtrl.setPreset(picked);
  }
}

class _AuthPrefChip extends StatelessWidget {
  const _AuthPrefChip({
    required this.icon,
    required this.label,
    required this.tooltip,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final String tooltip;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final cs = context.cs;
    return Tooltip(
      message: tooltip,
      child: Material(
        color: context.cardFill,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(999),
          side: BorderSide(color: cs.outline.withValues(alpha: 0.45)),
        ),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(999),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(icon, size: 17, color: cs.primary),
                const SizedBox(width: 5),
                Text(
                  label,
                  style: Theme.of(context).textTheme.labelLarge?.copyWith(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: cs.onSurface,
                      ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
