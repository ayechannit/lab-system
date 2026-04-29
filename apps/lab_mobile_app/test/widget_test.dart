import 'package:flutter_test/flutter_test.dart';

import 'package:lab_patient_app/app/lab_patient_app.dart';

void main() {
  testWidgets('MedLab app shows sign in', (WidgetTester tester) async {
    await tester.pumpWidget(const LabPatientApp());
    await tester.pumpAndSettle();
    expect(find.textContaining('MedLab'), findsWidgets);
    expect(find.text('Sign in (demo)'), findsOneWidget);
  });
}
