import 'package:go_router/go_router.dart';

import '../screens/auth/login_screen.dart';
import '../screens/auth/register_screen.dart';
import '../screens/auth/role_selection_screen.dart';
import '../screens/auth/splash_screen.dart';
import '../screens/feedback/rating_feedback_screen.dart';
import '../screens/home/home_dashboard_screen.dart';
import '../screens/loyalty/loyalty_points_screen.dart';
import '../screens/orders/order_lab_test_screen.dart';
import '../screens/orders/order_success_confirmation_screen.dart';
import '../screens/orders/order_tracking_screen.dart';
import '../screens/profile/edit_profile_screen.dart';
import '../screens/profile/profile_screen.dart';
import '../screens/results/ai_analysis_screen.dart';
import '../screens/results/lab_results_screen.dart';
import '../models/user_role.dart';
import '../services/session_controller.dart';

const _legacyHomePaths = <String>{
  '/home-patient',
  '/home-doctor',
  '/home-clinic',
};

GoRouter createAppRouter(SessionController session) {
  return GoRouter(
    initialLocation: '/splash',
    refreshListenable: session,
    redirect: (context, state) {
      final loggedIn = session.isLoggedIn;
      final loc = state.matchedLocation;
      if (loc == '/splash') return null;
      final authOnly = loc == '/login' || loc == '/register' || loc == '/role-select';
      if (!loggedIn && !authOnly) return '/login';
      if (loggedIn && authOnly) return session.homeRoute;
      if (loggedIn && _legacyHomePaths.contains(loc)) return '/home';
      return null;
    },
    routes: [
      GoRoute(path: '/splash', builder: (_, __) => const SplashScreen()),
      GoRoute(path: '/login', builder: (context, state) => LoginScreen(routeExtra: state.extra)),
      GoRoute(path: '/register', builder: (context, state) {
        final extra = state.extra;
        final role = extra is UserRole ? extra : null;
        return RegisterScreen(initialRole: role);
      }),
      GoRoute(path: '/role-select', builder: (_, __) => const RoleSelectionScreen()),
      GoRoute(path: '/home', builder: (_, __) => const HomeDashboardScreen()),
      GoRoute(path: '/order-lab-test', builder: (_, __) => const OrderLabTestScreen()),
      GoRoute(path: '/order-success', builder: (_, __) => const OrderSuccessConfirmationScreen()),
      GoRoute(path: '/order-tracking', builder: (_, __) => const OrderTrackingScreen()),
      GoRoute(path: '/lab-results', builder: (_, __) => const LabResultsScreen()),
      GoRoute(path: '/ai-analysis', builder: (_, __) => const AiAnalysisScreen()),
      GoRoute(path: '/loyalty', builder: (_, __) => const LoyaltyPointsScreen()),
      GoRoute(path: '/rating-feedback', builder: (_, __) => const RatingFeedbackScreen()),
      GoRoute(path: '/profile', builder: (_, __) => const ProfileScreen()),
      GoRoute(path: '/edit-profile', builder: (_, __) => const EditProfileScreen()),
    ],
  );
}
