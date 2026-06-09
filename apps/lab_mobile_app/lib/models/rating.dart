class RatingDraft {
  const RatingDraft({
    required this.orderId,
    required this.stars,
    required this.remark,
    required this.createdAt,
  });

  final String orderId;
  final int stars;
  final String remark;
  final DateTime createdAt;
}

/// Saved rating from `GET /api/ratings` or `GET /api/ratings/order/:orderId`.
class OrderRatingSummary {
  const OrderRatingSummary({
    required this.id,
    required this.orderId,
    required this.stars,
    required this.remark,
    required this.createdAt,
  });

  final String id;
  final String orderId;
  final int stars;
  final String remark;
  final DateTime createdAt;
}
