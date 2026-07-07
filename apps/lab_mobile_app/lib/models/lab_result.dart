import '../utils/report_delivery.dart' as delivery;

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
    this.pdfGroupId,
    this.pdfDisplaySolo = false,
    this.releasedAt,
    this.lines = const [],
  });

  final String testId;
  final String testName;
  final String testCode;
  final String category;
  final String? pdfUrl;
  final String? pdfGroupId;
  final bool pdfDisplaySolo;
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
    this.patientName = '',
    this.patientAge,
    this.patientPhone = '',
    this.lines = const [],
    this.resultPdfUrl,
    this.resultTestId,
    this.reportDeliveryMethod = 'soft_copy',
  });

  final String orderId;
  final String sampleId;
  final DateTime releasedAt;
  final String patientName;
  final int? patientAge;
  final String patientPhone;

  /// Per-test results for multi-test orders.
  final List<LabResultTestItem> tests;

  /// Legacy flat lines when the API returns structured values (rare).
  final List<LabResultLine> lines;

  /// First test with a PDF — kept for older call sites.
  final String? resultPdfUrl;
  final String? resultTestId;

  /// Backend `report_delivery_method`: `soft_copy` | `hard_copy` | `both`.
  final String reportDeliveryMethod;

  bool get allowsDigitalDelivery => delivery.allowsDigitalResultDelivery(reportDeliveryMethod);

  bool get isHardCopyOnly => delivery.isHardCopyOnlyDelivery(reportDeliveryMethod);

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

  /// Rows for the report detail screen — groups tests that share the same PDF file.
  List<LabResultDisplayRow> get displayRows => buildLabResultDisplayRows(tests);

  int get uniquePdfCount {
    final keys = <String>{};
    for (final test in tests) {
      if (!test.hasPdf) continue;
      final key = labResultPdfGroupKey(test);
      if (key != null && key.isNotEmpty) keys.add(key);
    }
    return keys.length;
  }
}

String? labResultPdfGroupKey(LabResultTestItem test) {
  if (test.pdfDisplaySolo) return 'solo:${test.testId}';
  final groupId = test.pdfGroupId?.trim();
  if (groupId != null && groupId.isNotEmpty) return 'group:$groupId';
  return labResultPdfStorageKey(test.pdfUrl);
}

/// Normalize a result PDF URL to a storage path so shared files group together.
String? labResultPdfStorageKey(String? pdfUrl) {
  final raw = pdfUrl?.trim();
  if (raw == null || raw.isEmpty) return null;
  final uri = Uri.tryParse(raw);
  if (uri != null && uri.hasScheme) {
    final path = uri.path.trim();
    return path.isEmpty ? raw : Uri.decodeComponent(path);
  }
  return raw;
}

sealed class LabResultDisplayRow {
  const LabResultDisplayRow();

  factory LabResultDisplayRow.single(LabResultTestItem test) = LabResultSingleRow;

  factory LabResultDisplayRow.combined({
    required String label,
    required List<LabResultTestItem> tests,
  }) = LabResultCombinedRow;
}

final class LabResultSingleRow extends LabResultDisplayRow {
  const LabResultSingleRow(this.test);

  final LabResultTestItem test;
}

final class LabResultCombinedRow extends LabResultDisplayRow {
  const LabResultCombinedRow({
    required this.label,
    required this.tests,
  });

  final String label;
  final List<LabResultTestItem> tests;

  LabResultTestItem get primaryTest => tests.first;

  bool get hasPdf => tests.any((t) => t.hasPdf);

  DateTime? get latestReleasedAt {
    DateTime? latest;
    for (final test in tests) {
      final released = test.releasedAt;
      if (released == null) continue;
      if (latest == null || released.isAfter(latest)) latest = released;
    }
    return latest;
  }
}

List<LabResultDisplayRow> buildLabResultDisplayRows(List<LabResultTestItem> tests) {
  final buckets = <String, List<LabResultTestItem>>{};
  for (final test in tests) {
    if (!test.hasPdf) continue;
    final key = labResultPdfGroupKey(test);
    if (key == null || key.isEmpty) continue;
    final list = buckets.putIfAbsent(key, () => <LabResultTestItem>[]);
    list.add(test);
  }

  final emitted = <String>{};
  final rows = <LabResultDisplayRow>[];
  var groupIndex = 0;

  for (final test in tests) {
    if (!test.hasPdf) {
      rows.add(LabResultDisplayRow.single(test));
      continue;
    }
    final key = labResultPdfGroupKey(test);
    if (key == null || key.isEmpty) {
      rows.add(LabResultDisplayRow.single(test));
      continue;
    }
    final bucket = buckets[key] ?? [test];
    if (bucket.length > 1) {
      if (emitted.contains(key)) continue;
      emitted.add(key);
      final label = 'Report ${String.fromCharCode(65 + groupIndex)}';
      groupIndex += 1;
      rows.add(
        LabResultDisplayRow.combined(
          label: label,
          tests: List<LabResultTestItem>.unmodifiable(bucket),
        ),
      );
      continue;
    }
    rows.add(LabResultDisplayRow.single(test));
  }
  return rows;
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
