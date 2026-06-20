import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

import 'app/lab_patient_app.dart';
import 'config/firebase_options.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  // FCM is Android/iOS only; skip Firebase on web (Chrome dev via script.sh).
  if (!kIsWeb) {
    await Firebase.initializeApp(
      options: DefaultFirebaseOptions.currentPlatform,
    );
  }
  runApp(const LabPatientApp());
}
