import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;

import 'lab_report_pdf_downloader.dart';

class LabReportPdfException implements Exception {
  LabReportPdfException(this.message);
  final String message;

  @override
  String toString() => message;
}

abstract final class LabReportPdfService {
  static String buildFilename({required String sampleId, String? orderId}) {
    final base = sampleId.trim().isEmpty ? (orderId ?? 'report') : sampleId;
    final safe = base.replaceAll(RegExp(r'[\\/:*?"<>|\s]+'), '_');
    return 'lab-report-$safe.pdf';
  }

  static Future<String> download({
    required String url,
    required String filename,
    Map<String, String>? headers,
  }) async {
    final uri = Uri.tryParse(url.trim());
    if (uri == null) {
      throw LabReportPdfException('Invalid PDF link from the lab.');
    }

    final response = await http.get(uri, headers: headers);
    if (response.statusCode >= 400) {
      throw LabReportPdfException('Could not download the report (${response.statusCode}).');
    }
    if (response.bodyBytes.isEmpty) {
      throw LabReportPdfException('The report file is empty.');
    }

    final saved = await savePdfBytes(response.bodyBytes, filename);
    if (kIsWeb) {
      return filename;
    }
    return saved;
  }
}
