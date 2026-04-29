import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../routing/app_router.dart';
import '../services/mock_lab_user_api.dart';
import '../services/session_controller.dart';
import '../theme/app_theme.dart';
import 'session_scope.dart';

class LabPatientApp extends StatefulWidget {
  const LabPatientApp({super.key});

  @override
  State<LabPatientApp> createState() => _LabPatientAppState();
}

class _LabPatientAppState extends State<LabPatientApp> {
  late final SessionController _session = SessionController(api: MockLabUserApi());
  late final GoRouter _router = createAppRouter(_session);

  @override
  void dispose() {
    _router.dispose();
    _session.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return SessionScope(
      controller: _session,
      child: MaterialApp.router(
        title: 'MedLab',
        theme: buildAppTheme(),
        routerConfig: _router,
        debugShowCheckedModeBanner: false,
      ),
    );
  }
}
