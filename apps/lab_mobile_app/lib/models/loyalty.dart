class PointEarnRule {
  const PointEarnRule({
    required this.id,
    required this.name,
    required this.spendAmountMmk,
    required this.pointsReward,
  });

  final String id;
  final String name;
  final double spendAmountMmk;
  final int pointsReward;
}

enum PointTransactionType {
  earn,
  redeem,
  adjustment,
  unknown;

  static PointTransactionType from(String? raw) {
    switch (raw?.toLowerCase()) {
      case 'earn':
        return PointTransactionType.earn;
      case 'redeem':
        return PointTransactionType.redeem;
      case 'adjustment':
        return PointTransactionType.adjustment;
      default:
        return PointTransactionType.unknown;
    }
  }

  String get label => switch (this) {
        PointTransactionType.earn => 'Earned',
        PointTransactionType.redeem => 'Redeemed',
        PointTransactionType.adjustment => 'Adjustment',
        PointTransactionType.unknown => 'Points',
      };
}

class LoyaltyEntry {
  const LoyaltyEntry({
    this.id,
    required this.label,
    required this.delta,
    required this.atLabel,
    this.createdAt,
    this.transactionType = PointTransactionType.unknown,
    this.sourceOrderId,
  });

  final String? id;
  final String label;
  final int delta;
  final String atLabel;
  final DateTime? createdAt;
  final PointTransactionType transactionType;
  final String? sourceOrderId;

  bool get isCredit => delta >= 0;
}

class LoyaltySnapshot {
  const LoyaltySnapshot({
    required this.balance,
    required this.entries,
    this.earnRules = const [],
  });

  final int balance;
  final List<LoyaltyEntry> entries;
  final List<PointEarnRule> earnRules;

  /// Sum of positive `points` rows in loaded history (not a separate backend aggregate).
  int get totalEarned => entries.where((e) => e.delta > 0).fold(0, (sum, e) => sum + e.delta);

  /// Sum of negative `points` rows in loaded history (absolute value).
  int get totalRedeemed =>
      entries.where((e) => e.delta < 0).fold(0, (sum, e) => sum + e.delta.abs());

  List<LoyaltyEntry> filtered(PointTransactionType? type) {
    if (type == null) return entries;
    return entries.where((e) => e.transactionType == type).toList();
  }
}
