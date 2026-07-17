import 'package:flutter/services.dart';

/// Allows an optional leading `+` followed by digits only.
class PhoneNumberInputFormatter extends TextInputFormatter {
  const PhoneNumberInputFormatter();

  @override
  TextEditingValue formatEditUpdate(
    TextEditingValue oldValue,
    TextEditingValue newValue,
  ) {
    final filtered = sanitizePhoneInput(newValue.text);
    if (filtered == newValue.text) return newValue;

    final offset = filtered.length.clamp(0, filtered.length);
    return TextEditingValue(
      text: filtered,
      selection: TextSelection.collapsed(offset: offset),
    );
  }
}

String sanitizePhoneInput(String value) {
  final buffer = StringBuffer();
  for (var i = 0; i < value.length; i++) {
    final ch = value[i];
    if (ch == '+') {
      if (buffer.isEmpty) buffer.write(ch);
    } else if (ch.codeUnitAt(0) >= 48 && ch.codeUnitAt(0) <= 57) {
      buffer.write(ch);
    }
  }
  return buffer.toString();
}

bool isValidPhoneNumber(String? value, {int minDigits = 6}) {
  final trimmed = value?.trim() ?? '';
  if (!RegExp(r'^\+?\d+$').hasMatch(trimmed)) return false;
  return trimmed.replaceAll('+', '').length >= minDigits;
}

String? validatePhoneNumber(
  String? value, {
  String emptyMessage = 'Required',
  String invalidMessage = 'Use + and digits only (e.g. +959…)',
  int minDigits = 6,
}) {
  final trimmed = value?.trim() ?? '';
  if (trimmed.isEmpty) return emptyMessage;
  if (!isValidPhoneNumber(trimmed, minDigits: minDigits)) return invalidMessage;
  return null;
}
