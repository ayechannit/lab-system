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
