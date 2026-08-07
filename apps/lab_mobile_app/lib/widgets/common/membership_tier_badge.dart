import 'package:flutter/material.dart';

import '../../l10n/app_localizations.dart';
import '../../models/membership_tier.dart';
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

String _formatTierPoints(int value) {
  final n = value.abs();
  if (n >= 1000) {
    final s = n.toString();
    final buf = StringBuffer();
    for (var i = 0; i < s.length; i++) {
      if (i > 0 && (s.length - i) % 3 == 0) buf.write(',');
      buf.write(s[i]);
    }
    return buf.toString();
  }
  return '$n';
}

/// Custom chunky progress track — Material's [LinearProgressIndicator] looks like a hairline on web.
class MembershipTierProgressBar extends StatelessWidget {
  const MembershipTierProgressBar({
    super.key,
    required this.value,
    required this.accent,
    required this.track,
  });

  final double value;
  final Color accent;
  final Color track;

  @override
  Widget build(BuildContext context) {
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0, end: value.clamp(0.0, 1.0)),
      duration: const Duration(milliseconds: 750),
      curve: Curves.easeOutCubic,
      builder: (context, animated, _) {
        return LayoutBuilder(
          builder: (context, constraints) {
            const height = 12.0;
            final width = constraints.maxWidth;
            // Keep a visible nub when the user has any progress but % is tiny.
            final fill = animated <= 0
                ? 0.0
                : (animated * width).clamp(10.0, width);
            return Container(
              height: height,
              width: width,
              decoration: BoxDecoration(
                color: track,
                borderRadius: BorderRadius.circular(999),
                border: Border.all(color: accent.withValues(alpha: 0.18)),
              ),
              clipBehavior: Clip.antiAlias,
              child: Align(
                alignment: Alignment.centerLeft,
                child: Container(
                  width: fill,
                  height: height,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(999),
                    gradient: LinearGradient(
                      colors: [
                        accent.withValues(alpha: 0.85),
                        accent,
                      ],
                    ),
                  ),
                ),
              ),
            );
          },
        );
      },
    );
  }
}

/// Home membership card with points progress toward the next tier.
class MembershipTierCard extends StatelessWidget {
  const MembershipTierCard({
    super.key,
    required this.tierName,
    this.discountPercent = 0,
    this.progress,
    this.onTap,
  });

  final String tierName;
  final int discountPercent;
  final MembershipTierProgress? progress;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final resolvedName = progress?.currentTier.name ?? tierName;
    final name = localizedMembershipTierName(l10n, resolvedName);
    final discount = progress?.currentTier.discountPercent ?? discountPercent;
    final cs = context.cs;
    final tone = membershipTierToneFor(resolvedName.trim().isEmpty ? name : resolvedName);
    final palette = _paletteFor(tone, cs);
    final nextName = progress?.nextTier == null
        ? null
        : localizedMembershipTierName(l10n, progress!.nextTier!.name);
    final pointsLabel = _formatTierPoints(progress?.pointsBalance ?? 0);
    final targetLabel = progress?.nextTier == null
        ? null
        : _formatTierPoints(progress!.nextTier!.minPoints);
    final remainingLabel = progress == null || progress!.isMaxTier
        ? null
        : _formatTierPoints(progress!.remainingPoints);
    final barValue = progress?.progress ?? 0.0;
    final percentLabel = '${(barValue.clamp(0.0, 1.0) * 100).round()}%';

    return Material(
      color: palette.background,
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          width: double.infinity,
          padding: const EdgeInsets.fromLTRB(14, 14, 12, 14),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: palette.border),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.85),
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: palette.border.withValues(alpha: 0.7)),
                    ),
                    child: Icon(palette.icon, color: palette.accent, size: 22),
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
                                height: 1.2,
                              ),
                        ),
                      ],
                    ),
                  ),
                  if (discount > 0)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
                      decoration: BoxDecoration(
                        color: palette.accent.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(999),
                      ),
                      child: Text(
                        l10n.membershipTierPercentOff(discount),
                        style: Theme.of(context).textTheme.labelLarge?.copyWith(
                              color: palette.accent,
                              fontWeight: FontWeight.w800,
                              height: 1.2,
                            ),
                      ),
                    ),
                  if (onTap != null) ...[
                    const SizedBox(width: 2),
                    Icon(Icons.chevron_right_rounded, color: palette.accent.withValues(alpha: 0.7)),
                  ],
                ],
              ),
              if (progress != null) ...[
                const SizedBox(height: 16),
                if (!progress!.isMaxTier && nextName != null) ...[
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          name,
                          style: Theme.of(context).textTheme.labelMedium?.copyWith(
                                color: palette.accent,
                                fontWeight: FontWeight.w800,
                              ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.9),
                          borderRadius: BorderRadius.circular(999),
                          border: Border.all(color: palette.border),
                        ),
                        child: Text(
                          percentLabel,
                          style: Theme.of(context).textTheme.labelSmall?.copyWith(
                                color: palette.accent,
                                fontWeight: FontWeight.w800,
                              ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          nextName,
                          textAlign: TextAlign.end,
                          style: Theme.of(context).textTheme.labelMedium?.copyWith(
                                color: cs.onSurfaceVariant,
                                fontWeight: FontWeight.w700,
                              ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  MembershipTierProgressBar(
                    value: barValue,
                    accent: palette.accent,
                    track: Colors.white.withValues(alpha: 0.92),
                  ),
                  const SizedBox(height: 10),
                  Text(
                    l10n.membershipTierPointsOfNext(pointsLabel, targetLabel!),
                    style: Theme.of(context).textTheme.labelLarge?.copyWith(
                          color: cs.onSurface,
                          fontWeight: FontWeight.w700,
                        ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    l10n.membershipTierProgressToNext(remainingLabel!, nextName),
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: cs.onSurfaceVariant,
                          height: 1.35,
                        ),
                  ),
                ] else ...[
                  MembershipTierProgressBar(
                    value: 1,
                    accent: palette.accent,
                    track: Colors.white.withValues(alpha: 0.92),
                  ),
                  const SizedBox(height: 10),
                  Text(
                    l10n.membershipTierProgressMax,
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: cs.onSurfaceVariant,
                          height: 1.35,
                          fontWeight: FontWeight.w600,
                        ),
                  ),
                ],
              ] else ...[
                const SizedBox(height: 6),
                Text(
                  discount > 0
                      ? l10n.membershipTierDiscountBenefit(discount)
                      : l10n.membershipTierMemberBenefit,
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: cs.onSurfaceVariant,
                        height: 1.35,
                      ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
