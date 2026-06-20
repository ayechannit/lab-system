import 'package:flutter/material.dart';

import '../../app/session_scope.dart';
import '../../models/loyalty.dart';
import '../../theme/app_colors.dart';
import '../../theme/theme_extensions.dart';
import '../../widgets/common/app_branding_row.dart';
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
        return Scaffold(
          appBar: AppBar(
            automaticallyImplyLeading: false,
            titleSpacing: 12,
            title: const AppBrandingRow(markSize: 32, iconSize: 16, borderRadius: 8),
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
                            'Could not load point history. Pull down to retry.\n$_loadError',
                            style: Theme.of(context).textTheme.bodySmall?.copyWith(color: AppColors.error),
                          ),
                        ),
                      ],
                    ),
                  ),
                _BalanceHeroCard(loyalty: loyalty),
                const SizedBox(height: 16),
                _StatsRow(loyalty: loyalty),
                if (loyalty.earnRules.isNotEmpty) ...[
                  const SizedBox(height: 20),
                  _EarnRulesSection(rules: loyalty.earnRules),
                ],
                const SizedBox(height: 20),
                Text(
                  'Activity',
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.w700,
                        color: context.cs.primary,
                      ),
                ),
                const SizedBox(height: 10),
                _FilterChips(
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
  const _BalanceHeroCard({required this.loyalty});

  final LoyaltySnapshot loyalty;

  @override
  Widget build(BuildContext context) {
    final cs = context.cs;
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
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.16),
              borderRadius: BorderRadius.circular(14),
            ),
            child: const Icon(Icons.workspace_premium_rounded, color: Colors.white, size: 26),
          ),
          const SizedBox(height: 16),
          Text(
            'Available balance',
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
                    'pts',
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          color: Colors.white70,
                          fontWeight: FontWeight.w600,
                        ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 10),
          Text(
            'Balance comes from your account total_points. Points are earned when the lab verifies a payment, using the rules below.',
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: Colors.white.withValues(alpha: 0.82),
                  height: 1.45,
                ),
          ),
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
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'How to earn',
          style: Theme.of(context).textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.w700,
                color: context.cs.primary,
              ),
        ),
        const SizedBox(height: 4),
        Text(
          'Active rules from your lab (point_settings).',
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
                        'Spend ${_formatMmk(rule.spendAmountMmk)} MMK → +${rule.pointsReward} pts',
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
    return LayoutBuilder(
      builder: (context, constraints) {
        final narrow = constraints.maxWidth < 520;
        final earned = _StatTile(
          label: 'Earned',
          value: '+${loyalty.totalEarned}',
          icon: Icons.trending_up_rounded,
          color: AppColors.accentGreen,
        );
        final redeemed = _StatTile(
          label: 'Redeemed',
          value: loyalty.totalRedeemed > 0 ? '-${loyalty.totalRedeemed}' : '0',
          icon: Icons.redeem_rounded,
          color: context.cs.primary,
        );
        final txCount = _StatTile(
          label: narrow ? 'Txns' : 'Transactions',
          value: '${loyalty.entries.length}',
          icon: Icons.receipt_long_rounded,
          color: AppColors.warningLow,
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

class _FilterChips extends StatelessWidget {
  const _FilterChips({
    required this.selected,
    required this.onSelected,
  });

  final PointTransactionType? selected;
  final ValueChanged<PointTransactionType?> onSelected;

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: [
          _chip(context, label: 'All', value: null),
          _chip(context, label: 'Earned', value: PointTransactionType.earn),
          _chip(context, label: 'Redeemed', value: PointTransactionType.redeem),
          _chip(context, label: 'Adjustments', value: PointTransactionType.adjustment),
        ],
      ),
    );
  }

  Widget _chip(BuildContext context, {required String label, required PointTransactionType? value}) {
    final active = selected == value;
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: FilterChip(
        label: Text(label),
        selected: active,
        showCheckmark: false,
        onSelected: (_) => onSelected(value),
        selectedColor: context.cs.primary.withValues(alpha: 0.14),
        labelStyle: TextStyle(
          color: active ? context.cs.primary : context.cs.onSurfaceVariant,
          fontWeight: active ? FontWeight.w700 : FontWeight.w500,
        ),
        side: BorderSide(
          color: active ? context.cs.primary.withValues(alpha: 0.45) : context.cs.outline.withValues(alpha: 0.5),
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
                                _MetaChip(label: 'Payment / order ref.'),
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
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: context.cs.surfaceContainerHighest.withValues(alpha: 0.55),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        type.label,
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
    final message = hasAny
        ? 'No ${filter?.label.toLowerCase() ?? ''} transactions in this filter.'
        : 'Your point activity will appear here after lab visits, ratings, or rewards from the lab.';
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
            hasAny ? 'Nothing to show' : 'No activity yet',
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
