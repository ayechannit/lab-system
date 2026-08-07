/// One rung on the loyalty-points membership ladder (`membership_tiers`).
class MembershipTierLevel {
  const MembershipTierLevel({
    required this.id,
    required this.name,
    required this.minPoints,
    required this.discountPercent,
  });

  final String id;
  final String name;
  final int minPoints;
  final int discountPercent;
}

/// Progress from the current tier toward the next (points-based).
class MembershipTierProgress {
  const MembershipTierProgress({
    required this.currentTier,
    required this.nextTier,
    required this.pointsBalance,
    required this.progress,
    required this.remainingPoints,
  });

  final MembershipTierLevel currentTier;
  final MembershipTierLevel? nextTier;
  final int pointsBalance;

  /// 0..1 within the current → next band (1 when at top tier).
  final double progress;
  final int remainingPoints;

  bool get isMaxTier => nextTier == null;

  static MembershipTierProgress resolve({
    required int pointsBalance,
    required List<MembershipTierLevel> tiers,
    String? fallbackTierName,
    int fallbackDiscountPercent = 0,
  }) {
    final points = pointsBalance < 0 ? 0 : pointsBalance;
    final sorted = [...tiers]..sort((a, b) => a.minPoints.compareTo(b.minPoints));

    if (sorted.isEmpty) {
      final fallback = MembershipTierLevel(
        id: '',
        name: (fallbackTierName ?? '').trim().isEmpty ? 'Normal' : fallbackTierName!.trim(),
        minPoints: 0,
        discountPercent: fallbackDiscountPercent,
      );
      return MembershipTierProgress(
        currentTier: fallback,
        nextTier: null,
        pointsBalance: points,
        progress: 1,
        remainingPoints: 0,
      );
    }

    var currentIndex = 0;
    for (var i = 0; i < sorted.length; i++) {
      if (sorted[i].minPoints <= points) {
        currentIndex = i;
      }
    }
    final current = sorted[currentIndex];
    final next = currentIndex + 1 < sorted.length ? sorted[currentIndex + 1] : null;

    if (next == null) {
      return MembershipTierProgress(
        currentTier: current,
        nextTier: null,
        pointsBalance: points,
        progress: 1,
        remainingPoints: 0,
      );
    }

    final floor = current.minPoints;
    final ceil = next.minPoints;
    final span = ceil - floor;
    final raw = span <= 0 ? 1.0 : (points - floor) / span;
    final progress = raw.clamp(0.0, 1.0).toDouble();
    final remaining = (ceil - points).clamp(0, ceil);

    return MembershipTierProgress(
      currentTier: current,
      nextTier: next,
      pointsBalance: points,
      progress: progress,
      remainingPoints: remaining,
    );
  }
}
