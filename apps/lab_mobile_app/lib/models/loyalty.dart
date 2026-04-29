class LoyaltyEntry {
  const LoyaltyEntry({
    required this.label,
    required this.delta,
    required this.atLabel,
    this.sourceOrderId,
  });

  final String label;
  final int delta;
  final String atLabel;
  final String? sourceOrderId;
}

class LoyaltySnapshot {
  const LoyaltySnapshot({
    required this.balance,
    required this.entries,
  });

  final int balance;
  final List<LoyaltyEntry> entries;
}
