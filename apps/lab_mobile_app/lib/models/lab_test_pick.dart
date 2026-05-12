/// One row from `GET /api/tests` for building an order line item.
class LabTestPick {
  const LabTestPick({
    required this.id,
    required this.name,
    required this.code,
    required this.basePriceMmk,
  });

  final String id;
  final String name;
  final String code;
  final int basePriceMmk;
}
