import 'dart:async';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:go_router/go_router.dart';

import '../config/lab_api_config.dart';
import '../routing/app_router.dart';
import '../services/app_settings_controller.dart';
import '../services/notification_service.dart';
import '../services/locale_controller.dart';
import '../services/rest_lab_user_api.dart';
import '../services/session_controller.dart';
import '../theme/app_settings_theme.dart';
import '../l10n/app_localizations.dart';
import '../widgets/common/app_toast.dart';
import 'app_settings_scope.dart';
import 'locale_scope.dart';
import 'session_scope.dart';

class LabPatientApp extends StatefulWidget {
  const LabPatientApp({super.key});

  @override
  State<LabPatientApp> createState() => _LabPatientAppState();
}

class _LabPatientAppState extends State<LabPatientApp> with WidgetsBindingObserver {
  late final RestLabUserApi _api = RestLabUserApi(baseUrl: LabApiConfig.baseUrl);
  late final SessionController _session = SessionController(api: _api);
  late final AppSettingsController _settings = AppSettingsController(
    baseUrl: LabApiConfig.baseUrl,
  );
  late final LocaleController _locale = LocaleController();
  late final GoRouter _router = createAppRouter(_session);

  @override
  void initState() {
    super.initState();
    AppToast.navigatorKey = rootNavigatorKey;
    WidgetsBinding.instance.addObserver(this);
    void loadSettings() => _settings.load();
    loadSettings();
    _locale.addListener(_syncApiLocale);
    _syncApiLocale();
    _settings.addListener(_syncOrgLocaleFromSettings);
  }

  void _syncOrgLocaleFromSettings() {
    final code = _settings.uiLocale;
    if (code == 'en' || code == 'my') {
      unawaited(_locale.applyOrgLocale(code));
    }
  }

  void _syncApiLocale() {
    _api.setLocaleCode(_locale.locale.languageCode);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _router.dispose();
    _session.dispose();
    _settings.dispose();
    _locale.removeListener(_syncApiLocale);
    _settings.removeListener(_syncOrgLocaleFromSettings);
    _locale.dispose();
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
      listenable: Listenable.merge([_session, _settings, _locale]),
      builder: (context, _) {
        final s = _settings.settings;
        return LocaleScope(
          controller: _locale,
          child: AppSettingsScope(
            controller: _settings,
            child: SessionScope(
              controller: _session,
              child: MaterialApp.router(
                title: _settings.labName,
                locale: _locale.locale,
                supportedLocales: AppLocalizations.supportedLocales,
                localizationsDelegates: const [
                  AppLocalizations.delegate,
                  GlobalMaterialLocalizations.delegate,
                  GlobalWidgetsLocalizations.delegate,
                  GlobalCupertinoLocalizations.delegate,
                ],
                theme: buildAppThemeForSettings(s, brightness: Brightness.light),
                darkTheme: buildAppThemeForSettings(s, brightness: Brightness.dark),
                themeMode: _settings.themeMode,
                routerConfig: _router,
                debugShowCheckedModeBanner: false,
                builder: (context, child) {
                  return ForegroundNotificationListener(child: child!);
                },
              ),
            ),
          ),
        );
      },
    );
  }
}

class ForegroundNotificationListener extends StatefulWidget {
  final Widget child;
  const ForegroundNotificationListener({super.key, required this.child});

  @override
  State<ForegroundNotificationListener> createState() => _ForegroundNotificationListenerState();
}

class _ForegroundNotificationListenerState extends State<ForegroundNotificationListener> {
  StreamSubscription<RemoteMessage>? _subscription;
  StreamSubscription<RemoteMessage>? _openedSubscription;

  @override
  void initState() {
    super.initState();
    _subscription = MobileNotificationService.onForegroundMessage.listen((message) {
      final title = message.notification?.title;
      final body = message.notification?.body;
      final navContext = rootNavigatorKey.currentContext;
      if (navContext == null || !navContext.mounted) return;

      final session = SessionScope.of(navContext);
      unawaited(session.refreshNotifications(quiet: true));

      if (title != null && body != null) {
        AppToast.warning(
          navContext,
          body,
          title: title,
          position: AppToastPosition.top,
          duration: const Duration(seconds: 4),
        );
      }
    });

    _openedSubscription = MobileNotificationService.onOpenedMessage.listen((message) async {
      final navContext = rootNavigatorKey.currentContext;
      if (navContext == null || !navContext.mounted) return;

      final session = SessionScope.of(navContext);
      unawaited(session.refreshNotifications(quiet: true));

      final route = message.data['route']?.toString();
      final orderId = message.data['order_id']?.toString();

      if (route != null && route.isNotEmpty) {
        if (route == '/lab-results') {
          await session.refreshResultsTab();
        } else if (route == '/orders') {
          await session.refreshOrdersTab();
        }

        if (orderId != null && orderId.isNotEmpty) {
          if (route == '/lab-results') {
            await session.selectResult(orderId);
          } else if (route == '/order-tracking' || route == '/orders') {
            try {
              await session.selectTrackingOrder(orderId);
            } catch (_) {
              // Gracefully handle if not trackable
            }
          }
        }
        if (navContext.mounted) {
          navContext.go(route);
        }
      } else {
        if (navContext.mounted) {
          navContext.go('/notifications');
        }
      }
    });
  }

  @override
  void dispose() {
    _subscription?.cancel();
    _openedSubscription?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return widget.child;
  }
}
