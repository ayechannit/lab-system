import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:lab_patient_app/app/lab_patient_app.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() {
    SharedPreferences.setMockInitialValues({});
  });

  testWidgets('MedLab app shows login after splash', (WidgetTester tester) async {
    await tester.pumpWidget(const LabPatientApp());
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 100));
    for (var i = 0; i < 30; i++) {
      await tester.pump(const Duration(milliseconds: 100));
      if (find.text('Login').evaluate().isNotEmpty) break;
    }
    expect(find.textContaining('MedLab'), findsWidgets);
    expect(find.text('Login'), findsOneWidget);
  });
}
