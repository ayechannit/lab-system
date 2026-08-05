import 'package:flutter/material.dart';

import '../../l10n/app_localizations.dart';
import '../../theme/theme_extensions.dart';

enum MembershipTierTone { gold, silver, bronze, standard }

MembershipTierTone membershipTierToneFor(String? tierName) {
  final n = (tierName ?? '').trim().toLowerCase();
  if (n.contains('gold') || n.contains('ရွှေ')) return MembershipTierTone.gold;
  if (n.contains('silver') || n.contains('ငွေ')) return MembershipTierTone.silver;
  if (n.contains('bronze') || n.contains('ကြေး')) return MembershipTierTone.bronze;
  if (n.contains('platinum') || n.contains('diamond')) return MembershipTierTone.gold;
  return MembershipTierTone.standard;
}

/// Localizes known seed tier names; custom names pass through unchanged.
String localizedMembershipTierName(AppLocalizations l10n, String? tierName) {
  final raw = (tierName ?? '').trim();
  if (raw.isEmpty) return l10n.membershipTierDefaultName;

  final n = raw.toLowerCase();
  if (n == 'normal' || n == 'standard' || n == 'ပုံမှန်') {
    return l10n.membershipTierNameNormal;
  }
  if (n == 'silver' || n == 'ငွေ') return l10n.membershipTierNameSilver;
  if (n == 'gold' || n == 'ရွှေ') return l10n.membershipTierNameGold;
  if (n == 'bronze' || n == 'ကြေး') return l10n.membershipTierNameBronze;
  return raw;
}

class _TierPalette {
  const _TierPalette({
    required this.accent,
    required this.background,
    required this.border,
    required this.icon,
  });

  final Color accent;
  final Color background;
  final Color border;
  final IconData icon;
}

_TierPalette _paletteFor(MembershipTierTone tone, ColorScheme cs) {
  switch (tone) {
    case MembershipTierTone.gold:
      return const _TierPalette(
        accent: Color(0xFF9A6700),
        background: Color(0xFFFFF6E0),
        border: Color(0xFFE8C56A),
        icon: Icons.workspace_premium_rounded,
      );
    case MembershipTierTone.silver:
      return const _TierPalette(
        accent: Color(0xFF4B5568),
        background: Color(0xFFF1F4F8),
        border: Color(0xFFC5CDD8),
        icon: Icons.military_tech_rounded,
      );
    case MembershipTierTone.bronze:
      return const _TierPalette(
        accent: Color(0xFF8B5A2B),
        background: Color(0xFFF8EFE6),
        border: Color(0xFFD2A679),
        icon: Icons.emoji_events_outlined,
      );
    case MembershipTierTone.standard:
      return _TierPalette(
        accent: cs.primary,
        background: cs.primary.withValues(alpha: 0.08),
        border: cs.primary.withValues(alpha: 0.22),
        icon: Icons.verified_outlined,
      );
  }
}

/// Compact membership pill — for dense rows / dark loyalty cards.
class MembershipTierBadge extends StatelessWidget {
  const MembershipTierBadge({
    super.key,
    required this.tierName,
    this.discountPercent = 0,
    this.onDark = false,
    this.dense = false,
  });

  final String tierName;
  final int discountPercent;
  final bool onDark;
  final bool dense;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final name = localizedMembershipTierName(l10n, tierName);
    final tone = membershipTierToneFor(tierName.isEmpty ? name : tierName);
    final palette = _paletteFor(tone, context.cs);
    final accent = onDark ? Colors.white : palette.accent;
    final bg = onDark ? Colors.white.withValues(alpha: 0.14) : palette.background;
    final border = onDark ? Colors.white.withValues(alpha: 0.28) : palette.border;

    return Container(
      padding: EdgeInsets.symmetric(
        horizontal: dense ? 10 : 12,
        vertical: dense ? 6 : 8,
      ),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: border),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(palette.icon, size: dense ? 15 : 17, color: accent),
          const SizedBox(width: 6),
          Flexible(
            child: Text(
              discountPercent > 0
                  ? l10n.membershipTierLabel(name, discountPercent)
                  : name,
              style: Theme.of(context).textTheme.labelLarge?.copyWith(
                    color: accent,
                    fontWeight: FontWeight.w700,
                    height: 1.25,
                    fontSize: dense ? 12.5 : null,
                  ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
    );
  }
}

/// Home / profile membership card — clearer hierarchy and benefit copy.
class MembershipTierCard extends StatelessWidget {
  const MembershipTierCard({
    super.key,
    required this.tierName,
    this.discountPercent = 0,
    this.onTap,
  });

  final String tierName;
  final int discountPercent;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final name = localizedMembershipTierName(l10n, tierName);
    final cs = context.cs;
    final tone = membershipTierToneFor(tierName.trim().isEmpty ? name : tierName);
    final palette = _paletteFor(tone, cs);

    return Material(
      color: palette.background,
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          width: double.infinity,
          padding: const EdgeInsets.fromLTRB(14, 14, 14, 14),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: palette.border),
          ),
          child: Row(
            children: [
              Container(
                width: 46,
                height: 46,
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.72),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: palette.border.withValues(alpha: 0.7)),
                ),
                child: Icon(palette.icon, color: palette.accent, size: 24),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      l10n.membershipTierTitle,
                      style: Theme.of(context).textTheme.labelSmall?.copyWith(
                            color: cs.onSurfaceVariant,
                            letterSpacing: 0.4,
                            height: 1.2,
                          ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      name,
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            color: palette.accent,
                            fontWeight: FontWeight.w800,
                            height: 1.25,
                          ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      discountPercent > 0
                          ? l10n.membershipTierDiscountBenefit(discountPercent)
                          : l10n.membershipTierMemberBenefit,
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: cs.onSurfaceVariant,
                            height: 1.35,
                          ),
                    ),
                  ],
                ),
              ),
              if (discountPercent > 0)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
                  decoration: BoxDecoration(
                    color: palette.accent.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(999),
                  ),
                  child: Text(
                    l10n.membershipTierPercentOff(discountPercent),
                    style: Theme.of(context).textTheme.labelLarge?.copyWith(
                          color: palette.accent,
                          fontWeight: FontWeight.w800,
                          height: 1.2,
                        ),
                  ),
                ),
              if (onTap != null) ...[
                const SizedBox(width: 4),
                Icon(Icons.chevron_right_rounded, color: palette.accent.withValues(alpha: 0.7)),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
