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
