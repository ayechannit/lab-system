import 'dart:io';
import 'dart:typed_data';

import 'package:file_picker/file_picker.dart';

/// Asks the user where to save the PDF, then writes it there.
/// Returns the saved path, or null if the user cancelled the picker.
Future<String?> savePdfBytes(List<int> bytes, String filename) async {
  final safeName = filename.replaceAll(RegExp(r'[\\/:*?"<>|]'), '_');
  final data = Uint8List.fromList(bytes);
  // On Android (Storage Access Framework) and iOS (Files) the system picker
  // writes the bytes itself, so no storage permission is needed.
  final path = await FilePicker.platform.saveFile(
    dialogTitle: 'Save lab report',
    fileName: safeName,
    type: FileType.custom,
    allowedExtensions: const ['pdf'],
    bytes: data,
  );
  if (path == null) return null;
  // Desktop pickers only return the chosen path; write the file ourselves.
  if (!Platform.isAndroid && !Platform.isIOS) {
    await File(path).writeAsBytes(data, flush: true);
  }
  return path;
}
