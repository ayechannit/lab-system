import 'dart:async';
import 'dart:io';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'lab_user_api.dart';

class MobileNotificationService {
  static final StreamController<RemoteMessage> _foregroundMessageController = StreamController<RemoteMessage>.broadcast();
  static Stream<RemoteMessage> get onForegroundMessage => _foregroundMessageController.stream;

  /// Request permissions and register the FCM token on the backend.
  static Future<void> initializeAndRegister(LabUserApi api) async {
    // Only run on Android and iOS platforms as FCM setup is platform-specific
    if (kIsWeb || (!Platform.isAndroid && !Platform.isIOS)) {
      debugPrint('FCM is only supported on mobile platforms in this setup. Skipping.');
      return;
    }

    try {
      // 1. Initialize Firebase if not already initialized
      if (Firebase.apps.isEmpty) {
        await Firebase.initializeApp();
      }

      final messaging = FirebaseMessaging.instance;

      // 2. Request permission (especially for iOS and Android 13+)
      final settings = await messaging.requestPermission(
        alert: true,
        announcement: false,
        badge: true,
        carPlay: false,
        criticalAlert: false,
        provisional: false,
        sound: true,
      );

      if (settings.authorizationStatus == AuthorizationStatus.authorized) {
        debugPrint('User granted notification permission.');
      } else if (settings.authorizationStatus == AuthorizationStatus.provisional) {
        debugPrint('User granted provisional notification permission.');
      } else {
        debugPrint('User declined or has not selected notification permission.');
      }

      // 3. Get FCM device token
      final token = await messaging.getToken();
      if (token != null && token.isNotEmpty) {
        debugPrint('FCM Token: $token');
        // Register token with our backend
        await api.registerFcmToken(token);
        debugPrint('FCM Token successfully registered with lab backend.');
      }

      // 4. Listen for token refreshes
      messaging.onTokenRefresh.listen((newToken) async {
        try {
          await api.registerFcmToken(newToken);
          debugPrint('FCM Token refreshed and registered with backend: $newToken');
        } catch (e) {
          debugPrint('Error registering refreshed FCM token: $e');
        }
      });

      // 5. Handle foreground notifications
      FirebaseMessaging.onMessage.listen((RemoteMessage message) {
        debugPrint('Received foreground notification: ${message.notification?.title} - ${message.notification?.body}');
        _foregroundMessageController.add(message);
      });

    } catch (e) {
      debugPrint('Firebase Notification Service initialization warning/error: $e');
      // Gracefully catch to allow the rest of the application to run smoothly even if Firebase config is missing
    }
  }
}
