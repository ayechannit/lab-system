/// One row from `GET /api/tests` for building order line items.
class LabTestPick {
  const LabTestPick({
    required this.id,
    required this.name,
    required this.code,
    required this.basePriceMmk,
    this.discountPercent,
  });

  final String id;
  final String name;
  final String code;
  final int basePriceMmk;

  /// Flat active discount percent for this test, or null if none is active.
  final int? discountPercent;

  /// Price after applying [discountPercent], or null if there is no active discount.
  int? get discountedPriceMmk =>
      discountPercent == null ? null : (basePriceMmk * (100 - discountPercent!) / 100).round();
}
