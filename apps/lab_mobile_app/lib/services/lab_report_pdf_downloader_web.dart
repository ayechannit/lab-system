// Web-only implementation (conditional import). dart:html is still the standard Flutter web download path.
// ignore_for_file: deprecated_member_use, avoid_web_libraries_in_flutter

import 'dart:html' as html;

Future<String> savePdfBytes(List<int> bytes, String filename) async {
  final blob = html.Blob([bytes]);
  final objectUrl = html.Url.createObjectUrlFromBlob(blob);
  html.AnchorElement(href: objectUrl)
    ..setAttribute('download', filename)
    ..click();
  html.Url.revokeObjectUrl(objectUrl);
  return filename;
}
