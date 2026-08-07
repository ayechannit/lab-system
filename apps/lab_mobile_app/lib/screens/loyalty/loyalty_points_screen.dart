import 'package:flutter/material.dart';

import '../../l10n/app_localizations.dart';
import '../../l10n/loyalty_l10n.dart';
import '../../app/session_scope.dart';
import '../../models/loyalty.dart';
import '../../models/membership_tier.dart';
import '../../theme/app_colors.dart';
import '../../theme/theme_extensions.dart';
import '../../widgets/common/app_branding_row.dart';
import '../../widgets/common/membership_tier_badge.dart';
import '../../widgets/common/notification_bell_button.dart';
import '../../widgets/navigation/lab_main_bottom_nav.dart';

class LoyaltyPointsScreen extends StatefulWidget {
  const LoyaltyPointsScreen({super.key});

  @override
  State<LoyaltyPointsScreen> createState() => _LoyaltyPointsScreenState();
}

class _LoyaltyPointsScreenState extends State<LoyaltyPointsScreen> {
  PointTransactionType? _filter;
  bool _loading = true;
  String? _loadError;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadLoyalty());
  }

  Future<void> _loadLoyalty() async {
    final session = SessionScope.of(context);
    setState(() {
      _loading = true;
      _loadError = null;
    });
    try {
      await session.refreshLoyalty();
      if (mounted) setState(() => _loadError = null);
    } catch (e) {
      if (mounted) setState(() => _loadError = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final session = SessionScope.of(context);
    return ListenableBuilder(
      listenable: session,
      builder: (context, _) {
        final loyalty = session.loyalty;
        final filtered = loyalty.filtered(_filter);
        final l10n = AppLocalizations.of(context)!;
        return Scaffold(
          appBar: AppBar(
            automaticallyImplyLeading: false,
            titleSpacing: 4,
            title: const AppBrandingRow(),
            actions: const [NotificationBellButton()],
          ),
          body: RefreshIndicator(
            onRefresh: _loadLoyalty,
            child: ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
              children: [
                if (_loadError != null)
                  Container(
                    margin: const EdgeInsets.only(bottom: 12),
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppColors.error.withValues(alpha: 0.08),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppColors.error.withValues(alpha: 0.25)),
                    ),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Icon(Icons.error_outline, color: AppColors.error, size: 20),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            '${l10n.loyaltyLoadError}\n$_loadError',
                            style: Theme.of(context).textTheme.bodySmall?.copyWith(color: AppColors.error),
                          ),
                        ),
                      ],
                    ),
                  ),
                _BalanceHeroCard(
                  loyalty: loyalty,
                  tierName: session.user?.tierName,
                  tierDiscountPercent: session.user?.tierDiscountPercent ?? 0,
                  tierProgress: session.membershipTierProgress,
                ),
                const SizedBox(height: 16),
                _StatsRow(loyalty: loyalty),
                if (loyalty.earnRules.isNotEmpty) ...[
                  const SizedBox(height: 20),
                  _EarnRulesSection(rules: loyalty.earnRules),
                ],
                const SizedBox(height: 20),
                Text(
                  l10n.loyaltyActivity,
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.w700,
                        color: context.cs.primary,
                      ),
                ),
                const SizedBox(height: 12),
                _ActivityFilterBar(
                  loyalty: loyalty,
                  selected: _filter,
                  onSelected: (next) => setState(() => _filter = next),
                ),
                const SizedBox(height: 12),
                if (_loading && loyalty.entries.isEmpty)
                  const Padding(
                    padding: EdgeInsets.symmetric(vertical: 32),
                    child: Center(child: CircularProgressIndicator()),
                  )
                else if (filtered.isEmpty)
                  _EmptyHistory(
                    hasAny: loyalty.entries.isNotEmpty,
                    filter: _filter,
                  )
                else
                  ...filtered.map((entry) => _TransactionTile(entry: entry)),
              ],
            ),
          ),
          bottomNavigationBar: const LabMainBottomNav(current: LabMainTab.points),
        );
      },
    );
  }
}

class _BalanceHeroCard extends StatelessWidget {
  const _BalanceHeroCard({
    required this.loyalty,
    this.tierName,
    this.tierDiscountPercent = 0,
    this.tierProgress,
  });

  final LoyaltySnapshot loyalty;
  final String? tierName;
  final int tierDiscountPercent;
  final MembershipTierProgress? tierProgress;

  String _formatPoints(int value) {
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

  @override
  Widget build(BuildContext context) {
    final cs = context.cs;
    final l10n = AppLocalizations.of(context)!;
    final progress = tierProgress;
    final currentName = localizedMembershipTierName(
      l10n,
      progress?.currentTier.name ?? tierName,
    );
    final nextName = progress?.nextTier == null
        ? null
        : localizedMembershipTierName(l10n, progress!.nextTier!.name);
    final barValue = progress?.progress ?? 0.0;
    final percentLabel = '${(barValue.clamp(0.0, 1.0) * 100).round()}%';
    final pointsLabel = _formatPoints(progress?.pointsBalance ?? loyalty.balance);
    final targetLabel =
        progress?.nextTier == null ? null : _formatPoints(progress!.nextTier!.minPoints);
    final remainingLabel = progress == null || progress.isMaxTier
        ? null
        : _formatPoints(progress.remainingPoints);

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(24),
        gradient: LinearGradient(
          colors: [cs.primary.withValues(alpha: 0.88), cs.primary],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        boxShadow: [
          BoxShadow(
            color: cs.primary.withValues(alpha: 0.22),
            blurRadius: 18,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.16),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: const Icon(Icons.workspace_premium_rounded, color: Colors.white, size: 26),
              ),
              const Spacer(),
              MembershipTierBadge(
                tierName: tierName?.trim() ?? '',
                discountPercent: tierDiscountPercent,
                onDark: true,
                dense: true,
              ),
            ],
          ),
          const SizedBox(height: 16),
          Text(
            l10n.loyaltyAvailableBalance,
            style: Theme.of(context).textTheme.labelLarge?.copyWith(
                  color: Colors.white70,
                  letterSpacing: 0.6,
                ),
          ),
          const SizedBox(height: 4),
          FittedBox(
            fit: BoxFit.scaleDown,
            alignment: Alignment.centerLeft,
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  '${loyalty.balance}',
                  style: Theme.of(context).textTheme.displaySmall?.copyWith(
                        color: Colors.white,
                        fontWeight: FontWeight.w800,
                        height: 1,
                      ),
                ),
                const SizedBox(width: 8),
                Padding(
                  padding: const EdgeInsets.only(bottom: 4),
                  child: Text(
                    l10n.loyaltyPointsUnit,
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          color: Colors.white70,
                          fontWeight: FontWeight.w600,
                        ),
                  ),
                ),
              ],
            ),
          ),
          if (progress != null) ...[
            const SizedBox(height: 18),
            if (!progress.isMaxTier && nextName != null) ...[
              Row(
                children: [
                  Expanded(
                    child: Text(
                      currentName,
                      style: Theme.of(context).textTheme.labelMedium?.copyWith(
                            color: Colors.white,
                            fontWeight: FontWeight.w800,
                          ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.18),
                      borderRadius: BorderRadius.circular(999),
                      border: Border.all(color: Colors.white.withValues(alpha: 0.35)),
                    ),
                    child: Text(
                      percentLabel,
                      style: Theme.of(context).textTheme.labelSmall?.copyWith(
                            color: Colors.white,
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
                            color: Colors.white.withValues(alpha: 0.85),
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
                accent: Colors.white,
                track: Colors.white.withValues(alpha: 0.22),
              ),
              const SizedBox(height: 10),
              Text(
                l10n.membershipTierPointsOfNext(pointsLabel, targetLabel!),
                style: Theme.of(context).textTheme.labelLarge?.copyWith(
                      color: Colors.white,
                      fontWeight: FontWeight.w700,
                    ),
              ),
              const SizedBox(height: 2),
              Text(
                l10n.membershipTierProgressToNext(remainingLabel!, nextName),
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: Colors.white.withValues(alpha: 0.85),
                      height: 1.35,
                    ),
              ),
            ] else ...[
              MembershipTierProgressBar(
                value: 1,
                accent: Colors.white,
                track: Colors.white.withValues(alpha: 0.22),
              ),
              const SizedBox(height: 10),
              Text(
                l10n.membershipTierProgressMax,
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: Colors.white.withValues(alpha: 0.88),
                      height: 1.35,
                      fontWeight: FontWeight.w600,
                    ),
              ),
            ],
          ] else ...[
            const SizedBox(height: 10),
            Text(
              l10n.loyaltyBalanceHint,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: Colors.white.withValues(alpha: 0.82),
                    height: 1.45,
                  ),
            ),
          ],
        ],
      ),
    );
  }
}

class _EarnRulesSection extends StatelessWidget {
  const _EarnRulesSection({required this.rules});

  final List<PointEarnRule> rules;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          l10n.loyaltyHowToEarn,
          style: Theme.of(context).textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.w700,
                color: context.cs.primary,
              ),
        ),
        const SizedBox(height: 4),
        Text(
          l10n.loyaltyEarnRulesHint,
          style: Theme.of(context).textTheme.bodySmall?.copyWith(color: context.cs.onSurfaceVariant),
        ),
        const SizedBox(height: 10),
        ...rules.map(
          (rule) => Container(
            width: double.infinity,
            margin: const EdgeInsets.only(bottom: 8),
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: context.cardFill,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: context.cs.outline.withValues(alpha: 0.28)),
            ),
            child: Row(
              children: [
                Icon(Icons.card_giftcard, color: context.cs.primary, size: 22),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        rule.name,
                        style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        l10n.loyaltySpendRule(_formatMmk(rule.spendAmountMmk), rule.pointsReward),
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                              color: context.cs.onSurfaceVariant,
                            ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  String _formatMmk(double value) {
    if (value == value.roundToDouble()) return value.toInt().toString();
    return value.toStringAsFixed(0);
  }
}

class _StatsRow extends StatelessWidget {
  const _StatsRow({required this.loyalty});

  final LoyaltySnapshot loyalty;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    return LayoutBuilder(
      builder: (context, constraints) {
        final narrow = constraints.maxWidth < 520;
        final earned = _StatTile(
          label: l10n.loyaltyEarned,
          value: '+${loyalty.totalEarned}',
          icon: Icons.trending_up_rounded,
          color: context.cs.primary,
        );
        final redeemed = _StatTile(
          label: l10n.loyaltyRedeemed,
          value: loyalty.totalRedeemed > 0 ? '-${loyalty.totalRedeemed}' : '0',
          icon: Icons.redeem_rounded,
          color: context.cs.primary,
        );
        final txCount = _StatTile(
          label: narrow ? l10n.loyaltyTxnsShort : l10n.loyaltyTransactions,
          value: '${loyalty.entries.length}',
          icon: Icons.receipt_long_rounded,
          color: context.cs.primary,
        );

        if (narrow) {
          return Column(
            children: [
              earned,
              const SizedBox(height: 10),
              redeemed,
              const SizedBox(height: 10),
              txCount,
            ],
          );
        }

        return Row(
          children: [
            Expanded(child: earned),
            const SizedBox(width: 10),
            Expanded(child: redeemed),
            const SizedBox(width: 10),
            Expanded(child: txCount),
          ],
        );
      },
    );
  }
}

class _StatTile extends StatelessWidget {
  const _StatTile({
    required this.label,
    required this.value,
    required this.icon,
    required this.color,
  });

  final String label;
  final String value;
  final IconData icon;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
      decoration: BoxDecoration(
        color: context.cardFill,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: context.cs.outline.withValues(alpha: 0.35)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 20, color: color),
          const SizedBox(height: 8),
          Text(
            value,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800),
          ),
          Text(
            label,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: Theme.of(context).textTheme.bodySmall?.copyWith(color: context.cs.onSurfaceVariant),
          ),
        ],
      ),
    );
  }
}

class _ActivityFilterBar extends StatelessWidget {
  const _ActivityFilterBar({
    required this.loyalty,
    required this.selected,
    required this.onSelected,
  });

  final LoyaltySnapshot loyalty;
  final PointTransactionType? selected;
  final ValueChanged<PointTransactionType?> onSelected;

  int _countFor(PointTransactionType? type) {
    if (type == null) return loyalty.entries.length;
    return loyalty.entries.where((e) => e.transactionType == type).length;
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final options = <_ActivityFilterOption>[
      _ActivityFilterOption(
        value: null,
        label: l10n.loyaltyFilterAll,
        icon: Icons.grid_view_rounded,
        count: _countFor(null),
      ),
      _ActivityFilterOption(
        value: PointTransactionType.earn,
        label: l10n.loyaltyEarned,
        icon: Icons.trending_up_rounded,
        count: _countFor(PointTransactionType.earn),
      ),
      _ActivityFilterOption(
        value: PointTransactionType.redeem,
        label: l10n.loyaltyRedeemed,
        icon: Icons.redeem_rounded,
        count: _countFor(PointTransactionType.redeem),
      ),
      _ActivityFilterOption(
        value: PointTransactionType.adjustment,
        label: l10n.loyaltyFilterAdjustments,
        icon: Icons.tune_rounded,
        count: _countFor(PointTransactionType.adjustment),
      ),
    ];

    return Container(
      padding: const EdgeInsets.all(5),
      decoration: BoxDecoration(
        color: context.cardFill,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: context.cs.outline.withValues(alpha: 0.28)),
        boxShadow: [
          BoxShadow(
            color: context.cs.shadow.withValues(alpha: 0.04),
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Row(
        children: [
          for (var i = 0; i < options.length; i++) ...[
            if (i > 0) const SizedBox(width: 4),
            Expanded(
              child: _ActivityFilterSegment(
                option: options[i],
                active: selected == options[i].value,
                onTap: () => onSelected(options[i].value),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _ActivityFilterOption {
  const _ActivityFilterOption({
    required this.value,
    required this.label,
    required this.icon,
    required this.count,
  });

  final PointTransactionType? value;
  final String label;
  final IconData icon;
  final int count;
}

class _ActivityFilterSegment extends StatelessWidget {
  const _ActivityFilterSegment({
    required this.option,
    required this.active,
    required this.onTap,
  });

  final _ActivityFilterOption option;
  final bool active;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final cs = context.cs;
    // Match bottom-nav active treatment: soft primary wash + primary ink.
    final fg = active ? cs.primary : cs.onSurfaceVariant;

    return Semantics(
      button: true,
      selected: active,
      label: option.label,
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(12),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 220),
            curve: Curves.easeOutCubic,
            padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 10),
            decoration: BoxDecoration(
              color: active ? cs.primary.withValues(alpha: 0.12) : Colors.transparent,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: active ? cs.primary.withValues(alpha: 0.28) : Colors.transparent,
              ),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(option.icon, size: 18, color: fg),
                const SizedBox(height: 5),
                Text(
                  option.label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.labelSmall?.copyWith(
                        color: fg,
                        fontWeight: active ? FontWeight.w800 : FontWeight.w600,
                        fontSize: 10.5,
                        letterSpacing: 0.1,
                        height: 1.1,
                      ),
                ),
                const SizedBox(height: 4),
                Text(
                  '${option.count}',
                  style: Theme.of(context).textTheme.labelSmall?.copyWith(
                        color: active ? cs.primary : cs.onSurfaceVariant.withValues(alpha: 0.75),
                        fontWeight: FontWeight.w700,
                        fontSize: 11,
                        height: 1,
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

class _TransactionTile extends StatelessWidget {
  const _TransactionTile({required this.entry});

  final LoyaltyEntry entry;

  @override
  Widget build(BuildContext context) {
    final credit = entry.isCredit;
    final accent = credit ? AppColors.accentGreen : context.cs.primary;
    final l10n = AppLocalizations.of(context)!;
    final icon = switch (entry.transactionType) {
      PointTransactionType.earn => Icons.biotech_outlined,
      PointTransactionType.redeem => Icons.shopping_bag_outlined,
      PointTransactionType.adjustment => Icons.tune_rounded,
      PointTransactionType.unknown => Icons.stars_rounded,
    };

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color: context.cardFill,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: context.cs.outline.withValues(alpha: 0.28)),
      ),
      child: IntrinsicHeight(
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Container(
              width: 4,
              decoration: BoxDecoration(
                color: accent,
                borderRadius: const BorderRadius.horizontal(left: Radius.circular(16)),
              ),
            ),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(12, 12, 14, 12),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    CircleAvatar(
                      radius: 20,
                      backgroundColor: accent.withValues(alpha: 0.12),
                      child: Icon(icon, color: accent, size: 20),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            entry.label,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            entry.atLabel,
                            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                  color: context.cs.onSurfaceVariant,
                                ),
                          ),
                          const SizedBox(height: 6),
                          Wrap(
                            spacing: 6,
                            runSpacing: 4,
                            children: [
                              _TypeBadge(type: entry.transactionType),
                              if (entry.sourceOrderId != null)
                                _MetaChip(label: l10n.loyaltyPaymentOrderRef),
                            ],
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 8),
                    Flexible(
                      child: Text(
                        '${credit ? '+' : ''}${entry.delta}',
                        textAlign: TextAlign.end,
                        maxLines: 1,
                        overflow: TextOverflow.fade,
                        softWrap: false,
                        style: Theme.of(context).textTheme.titleLarge?.copyWith(
                              color: accent,
                              fontWeight: FontWeight.w800,
                            ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _TypeBadge extends StatelessWidget {
  const _TypeBadge({required this.type});

  final PointTransactionType type;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: context.cs.surfaceContainerHighest.withValues(alpha: 0.55),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        type.localizedLabel(l10n),
        style: Theme.of(context).textTheme.labelSmall?.copyWith(
              color: context.cs.onSurfaceVariant,
              fontWeight: FontWeight.w600,
            ),
      ),
    );
  }
}

class _MetaChip extends StatelessWidget {
  const _MetaChip({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: context.cs.primary.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: Theme.of(context).textTheme.labelSmall?.copyWith(
              color: context.cs.primary,
              fontWeight: FontWeight.w600,
            ),
      ),
    );
  }
}

class _EmptyHistory extends StatelessWidget {
  const _EmptyHistory({required this.hasAny, required this.filter});

  final bool hasAny;
  final PointTransactionType? filter;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final message = hasAny
        ? l10n.loyaltyNoFilteredTransactions(filter?.localizedLabel(l10n).toLowerCase() ?? '')
        : l10n.loyaltyNoActivityHint;
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(top: 8),
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 28),
      decoration: BoxDecoration(
        color: context.cardFill,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: context.cs.outline.withValues(alpha: 0.25)),
      ),
      child: Column(
        children: [
          Icon(Icons.history_rounded, size: 40, color: context.cs.primary.withValues(alpha: 0.55)),
          const SizedBox(height: 12),
          Text(
            hasAny ? l10n.loyaltyNothingToShow : l10n.loyaltyNoActivityYet,
            style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 6),
          Text(
            message.trim(),
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: context.cs.onSurfaceVariant),
          ),
        ],
      ),
    );
  }
}
