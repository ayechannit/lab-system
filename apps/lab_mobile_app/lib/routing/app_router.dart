import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../screens/auth/login_screen.dart';
import '../screens/auth/register_screen.dart';
import '../screens/auth/splash_screen.dart';
import '../screens/feedback/rating_feedback_screen.dart';
import '../screens/home/home_dashboard_screen.dart';
import '../screens/loyalty/loyalty_points_screen.dart';
import '../screens/notifications/notifications_screen.dart';
import '../screens/orders/orders_list_screen.dart';
import '../screens/orders/order_lab_test_screen.dart';
import '../screens/orders/order_success_confirmation_screen.dart';
import '../screens/orders/order_tracking_screen.dart';
import '../screens/profile/edit_profile_screen.dart';
import '../screens/profile/profile_screen.dart';
import '../screens/settings/lab_info_screen.dart';
import '../screens/results/ai_analysis_screen.dart';
import '../screens/results/lab_result_detail_screen.dart';
import '../screens/results/results_list_screen.dart';
import '../services/session_controller.dart';

const _legacyHomePaths = <String>{
  '/home-patient',
  '/home-doctor',
  '/home-clinic',
};

final GlobalKey<NavigatorState> rootNavigatorKey = GlobalKey<NavigatorState>();

GoRouter createAppRouter(SessionController session) {
  return GoRouter(
    navigatorKey: rootNavigatorKey,
    initialLocation: '/splash',
    refreshListenable: session,
    redirect: (context, state) {
      final loggedIn = session.isLoggedIn;
      final loc = state.matchedLocation;

      if (session.isInitializingSession) {
        return loc == '/splash' ? null : '/splash';
      }

      if (loc == '/splash') {
        return loggedIn ? session.homeRoute : '/login';
      }

      final authOnly = loc == '/login' || loc == '/register';
      if (!loggedIn && !authOnly) return '/login';
      if (loggedIn && authOnly) return session.homeRoute;
      if (loggedIn && _legacyHomePaths.contains(loc)) return '/home';
      return null;
    },
    routes: [
      GoRoute(path: '/splash', builder: (_, __) => const SplashScreen()),
      GoRoute(path: '/login', builder: (context, state) => LoginScreen(routeExtra: state.extra)),
      GoRoute(path: '/register', builder: (_, __) => const RegisterScreen()),
      GoRoute(path: '/home', builder: (_, __) => const HomeDashboardScreen()),
      GoRoute(path: '/notifications', builder: (_, __) => const NotificationsScreen()),
      GoRoute(path: '/orders', builder: (_, __) => const OrdersListScreen()),
      GoRoute(path: '/order-lab-test', builder: (_, __) => const OrderLabTestScreen()),
      GoRoute(path: '/order-success', builder: (_, __) => const OrderSuccessConfirmationScreen()),
      GoRoute(path: '/order-tracking', builder: (_, __) => const OrderTrackingScreen()),
      GoRoute(path: '/lab-results', builder: (_, __) => const ResultsListScreen()),
      GoRoute(path: '/lab-result-detail', builder: (_, __) => const LabResultDetailScreen()),
      GoRoute(path: '/ai-analysis', builder: (_, __) => const AiAnalysisScreen()),
      GoRoute(path: '/loyalty', builder: (_, __) => const LoyaltyPointsScreen()),
      GoRoute(path: '/rating-feedback', builder: (_, __) => const RatingFeedbackScreen()),
      GoRoute(path: '/profile', builder: (_, __) => const ProfileScreen()),
      GoRoute(path: '/edit-profile', builder: (_, __) => const EditProfileScreen()),
      GoRoute(path: '/lab-info', builder: (_, __) => const LabInfoScreen()),
    ],
  );
}
