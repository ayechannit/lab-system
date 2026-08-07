/// One rung on the lifetime-spend membership ladder (`membership_tiers`).
class MembershipTierLevel {
  const MembershipTierLevel({
    required this.id,
    required this.name,
    required this.minSpendMmk,
    required this.discountPercent,
  });

  final String id;
  final String name;
  final double minSpendMmk;
  final int discountPercent;
}

/// Progress from the current tier toward the next (lifetime-spend based).
class MembershipTierProgress {
  const MembershipTierProgress({
    required this.currentTier,
    required this.nextTier,
    required this.spentMmk,
    required this.progress,
    required this.remainingSpendMmk,
  });

  final MembershipTierLevel currentTier;
  final MembershipTierLevel? nextTier;
  final double spentMmk;

  /// 0..1 within the current → next band (1 when at top tier).
  final double progress;
  final double remainingSpendMmk;

  bool get isMaxTier => nextTier == null;

  /// 0..100, rounded for display (e.g. "64%").
  int get progressPercent => (progress * 100).round();

  static MembershipTierProgress resolve({
    required double spentMmk,
    required List<MembershipTierLevel> tiers,
    String? fallbackTierName,
    int fallbackDiscountPercent = 0,
  }) {
    final spent = spentMmk < 0 ? 0.0 : spentMmk;
    final sorted = [...tiers]..sort((a, b) => a.minSpendMmk.compareTo(b.minSpendMmk));

    if (sorted.isEmpty) {
      final fallback = MembershipTierLevel(
        id: '',
        name: (fallbackTierName ?? '').trim().isEmpty ? 'Normal' : fallbackTierName!.trim(),
        minSpendMmk: 0,
        discountPercent: fallbackDiscountPercent,
      );
      return MembershipTierProgress(
        currentTier: fallback,
        nextTier: null,
        spentMmk: spent,
        progress: 1,
        remainingSpendMmk: 0,
      );
    }

    var currentIndex = 0;
    for (var i = 0; i < sorted.length; i++) {
      if (sorted[i].minSpendMmk <= spent) {
        currentIndex = i;
      }
    }
    final current = sorted[currentIndex];
    final next = currentIndex + 1 < sorted.length ? sorted[currentIndex + 1] : null;

    if (next == null) {
      return MembershipTierProgress(
        currentTier: current,
        nextTier: null,
        spentMmk: spent,
        progress: 1,
        remainingSpendMmk: 0,
      );
    }

    final floor = current.minSpendMmk;
    final ceil = next.minSpendMmk;
    final span = ceil - floor;
    final raw = span <= 0 ? 1.0 : (spent - floor) / span;
    final progress = raw.clamp(0.0, 1.0).toDouble();
    final remaining = (ceil - spent).clamp(0.0, ceil).toDouble();

    return MembershipTierProgress(
      currentTier: current,
      nextTier: next,
      spentMmk: spent,
      progress: progress,
      remainingSpendMmk: remaining,
    );
  }
}
