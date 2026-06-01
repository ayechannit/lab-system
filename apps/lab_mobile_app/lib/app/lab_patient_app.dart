import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../config/lab_api_config.dart';
import '../routing/app_router.dart';
import '../services/app_settings_controller.dart';
import '../services/rest_lab_user_api.dart';
import '../services/session_controller.dart';
import '../theme/app_settings_theme.dart';
import 'app_settings_scope.dart';
import 'session_scope.dart';

class LabPatientApp extends StatefulWidget {
  const LabPatientApp({super.key});

  @override
  State<LabPatientApp> createState() => _LabPatientAppState();
}

class _LabPatientAppState extends State<LabPatientApp> with WidgetsBindingObserver {
  late final SessionController _session = SessionController(
    api: RestLabUserApi(baseUrl: LabApiConfig.baseUrl),
  );
  late final AppSettingsController _settings = AppSettingsController(
    baseUrl: LabApiConfig.baseUrl,
  );
  late final GoRouter _router = createAppRouter(_session);

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    void loadSettings() => _settings.load();
    loadSettings();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _router.dispose();
    _session.dispose();
    _settings.dispose();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      _settings.refresh();
    }
  }

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: Listenable.merge([_session, _settings]),
      builder: (context, _) {
        final s = _settings.settings;
        return AppSettingsScope(
          controller: _settings,
          child: SessionScope(
            controller: _session,
            child: MaterialApp.router(
              title: _settings.labName,
              theme: buildAppThemeForSettings(s, brightness: Brightness.light),
              darkTheme: buildAppThemeForSettings(s, brightness: Brightness.dark),
              themeMode: _settings.themeMode,
              routerConfig: _router,
              debugShowCheckedModeBanner: false,
            ),
          ),
        );
      },
    );
  }
}
