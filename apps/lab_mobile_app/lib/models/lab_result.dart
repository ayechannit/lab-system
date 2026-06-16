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

class LabResultReport {
  const LabResultReport({
    required this.orderId,
    required this.sampleId,
    required this.releasedAt,
    required this.lines,
    this.resultPdfUrl,
    this.resultTestId,
  });

  final String orderId;
  final String sampleId;
  final DateTime releasedAt;
  final List<LabResultLine> lines;

  /// Signed or public URL from API (`download_url` on an order item).
  final String? resultPdfUrl;

  /// Test catalog id for the item that has the result PDF.
  final String? resultTestId;

  bool get hasPdfPayload {
    final testId = resultTestId;
    final url = resultPdfUrl;
    return (testId != null && testId.isNotEmpty) ||
        (url != null && url.isNotEmpty);
  }
}

class AiAnalysisResult {
  const AiAnalysisResult({
    required this.orderId,
    required this.generatedAt,
    required this.summary,
    required this.observation,
    required this.recommendation,
  });

  final String orderId;
  final DateTime generatedAt;
  final String summary;
  final String observation;
  final String recommendation;
}
