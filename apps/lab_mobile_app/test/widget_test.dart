import 'package:flutter_test/flutter_test.dart';

import 'package:lab_patient_app/app/lab_patient_app.dart';

void main() {
  testWidgets('MedLab app shows login after splash', (WidgetTester tester) async {
    await tester.pumpWidget(const LabPatientApp());
    await tester.pump();
    // Splash navigates to /login after ~1.4s
    await tester.pump(const Duration(milliseconds: 1500));
    await tester.pumpAndSettle();
    expect(find.textContaining('MedLab'), findsWidgets);
    expect(find.text('Login'), findsOneWidget);
  });
}
