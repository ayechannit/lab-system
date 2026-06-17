class UserReportKpis {
  const UserReportKpis({
    required this.totalSpent,
    required this.totalOrders,
    required this.completedOrders,
    required this.pendingOrders,
    required this.loyaltyPoints,
  });

  final double totalSpent;
  final int totalOrders;
  final int completedOrders;
  final int pendingOrders;
  final int loyaltyPoints;
}

class UserSpendTrendPoint {
  const UserSpendTrendPoint({
    required this.date,
    required this.spent,
    required this.orderCount,
  });

  final DateTime? date;
  final double spent;
  final int orderCount;

  String get dateLabel {
    if (date == null) return '—';
    return '${date!.month}/${date!.day}';
  }
}

class UserTopTestRow {
  const UserTopTestRow({
    required this.testName,
    required this.testCode,
    required this.category,
    required this.orderCount,
    required this.totalSpent,
  });

  final String testName;
  final String testCode;
  final String category;
  final int orderCount;
  final double totalSpent;
}

class UserReportSummary {
  const UserReportSummary({
    required this.kpis,
    required this.spendTrend,
    required this.topTests,
  });

  static const empty = UserReportSummary(
    kpis: UserReportKpis(
      totalSpent: 0,
      totalOrders: 0,
      completedOrders: 0,
      pendingOrders: 0,
      loyaltyPoints: 0,
    ),
    spendTrend: [],
    topTests: [],
  );

  final UserReportKpis kpis;
  final List<UserSpendTrendPoint> spendTrend;
  final List<UserTopTestRow> topTests;
}
