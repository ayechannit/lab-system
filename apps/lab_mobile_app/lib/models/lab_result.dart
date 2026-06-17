enum ResultFlag { low, normal, high }

class LabResultLine {
  const LabResultLine({
    required this.name,
    required this.value,
    required this.flag,
  });

  final String name;
  final String value;
  final ResultFlag flag;

  String get flagLabel => switch (flag) {
        ResultFlag.low => 'Low',
        ResultFlag.normal => 'Normal',
        ResultFlag.high => 'High',
      };
}

/// One catalog test on a released order — each may have its own PDF and AI summary.
class LabResultTestItem {
  const LabResultTestItem({
    required this.testId,
    required this.testName,
    this.testCode = '',
    this.category = '',
    this.pdfUrl,
    this.releasedAt,
    this.lines = const [],
  });

  final String testId;
  final String testName;
  final String testCode;
  final String category;
  final String? pdfUrl;
  final DateTime? releasedAt;
  final List<LabResultLine> lines;

  bool get hasPdf {
    final url = pdfUrl;
    return url != null && url.trim().isNotEmpty;
  }

  bool get hasStructuredLines => lines.isNotEmpty;

  String get displayCode => testCode.trim().isNotEmpty ? testCode.trim() : testId;
}

class LabResultReport {
  const LabResultReport({
    required this.orderId,
    required this.sampleId,
    required this.releasedAt,
    required this.tests,
    this.lines = const [],
    this.resultPdfUrl,
    this.resultTestId,
  });

  final String orderId;
  final String sampleId;
  final DateTime releasedAt;

  /// Per-test results for multi-test orders.
  final List<LabResultTestItem> tests;

  /// Legacy flat lines when the API returns structured values (rare).
  final List<LabResultLine> lines;

  /// First test with a PDF — kept for older call sites.
  final String? resultPdfUrl;
  final String? resultTestId;

  bool get hasPdfPayload {
    if (tests.any((t) => t.hasPdf)) return true;
    final testId = resultTestId;
    final url = resultPdfUrl;
    return (testId != null && testId.isNotEmpty) ||
        (url != null && url.isNotEmpty);
  }

  int get releasedTestCount => tests.where((t) => t.hasPdf).length;

  LabResultTestItem? testById(String testId) {
    final id = testId.trim().toLowerCase();
    if (id.isEmpty) return null;
    for (final t in tests) {
      if (t.testId.toLowerCase() == id) return t;
    }
    return null;
  }
}

class AiAnalysisResult {
  const AiAnalysisResult({
    required this.orderId,
    required this.generatedAt,
    required this.summary,
    required this.observation,
    required this.recommendation,
    this.testId,
    this.testName,
  });

  final String orderId;
  final DateTime generatedAt;
  final String summary;
  final String observation;
  final String recommendation;
  final String? testId;
  final String? testName;
}
