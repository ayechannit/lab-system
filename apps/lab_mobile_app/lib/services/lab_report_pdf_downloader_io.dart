import 'dart:io';

import 'package:open_filex/open_filex.dart';
import 'package:path_provider/path_provider.dart';

Future<String> savePdfBytes(List<int> bytes, String filename) async {
  final dir = await getApplicationDocumentsDirectory();
  final safeName = filename.replaceAll(RegExp(r'[\\/:*?"<>|]'), '_');
  final file = File('${dir.path}/$safeName');
  await file.writeAsBytes(bytes, flush: true);
  // The documents dir is app-private, so open the PDF in the system viewer
  // (iOS Quick Look / Android PDF app) where the user can read, save or share it.
  // A missing viewer isn't fatal: the file is saved (and visible in iOS Files).
  try {
    await OpenFilex.open(file.path, type: 'application/pdf');
  } catch (_) {}
  return file.path;
}
