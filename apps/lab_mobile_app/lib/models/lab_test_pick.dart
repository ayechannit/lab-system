import 'user_role.dart';

/// Role-specific discount row from `GET /api/tests` (`discounts` on each test).
class LabTestDiscount {
  const LabTestDiscount({
    required this.role,
    required this.discountPercent,
  });

  final String role;
  final int discountPercent;
}

/// One row from `GET /api/tests` for building order line items.
class LabTestPick {
  const LabTestPick({
    required this.id,
    required this.name,
    required this.code,
    required this.basePriceMmk,
    this.discounts = const [],
  });

  final String id;
  final String name;
  final String code;
  final int basePriceMmk;
  final List<LabTestDiscount> discounts;

  /// Same rules as admin: prefer role-specific row, then `all`.
  int discountPercentForUser(UserRole userRole) {
    final want = userRole.name;
    for (final d in discounts) {
      if (d.role == want) return d.discountPercent.clamp(0, 100);
    }
    for (final d in discounts) {
      if (d.role == 'all') return d.discountPercent.clamp(0, 100);
    }
    return 0;
  }

  double lineSubtotalMmk(UserRole userRole) {
    final pct = discountPercentForUser(userRole);
    final raw = basePriceMmk * (100 - pct) / 100.0;
    return (raw * 100).round() / 100.0;
  }
}
