import 'package:go_router/go_router.dart';

import '../screens/auth/login_screen.dart';
import '../screens/auth/register_screen.dart';
import '../screens/auth/role_selection_screen.dart';
import '../screens/auth/splash_screen.dart';
import '../screens/feedback/rating_feedback_screen.dart';
import '../screens/home/clinic_dashboard_screen.dart';
import '../screens/home/doctor_dashboard_screen.dart';
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

GoRouter createAppRouter(SessionController session) {
  return GoRouter(
    initialLocation: '/splash',
    refreshListenable: session,
    redirect: (context, state) {
      final loggedIn = session.isLoggedIn;
      final loc = state.matchedLocation;
      if (loc == '/splash') return null;
      final authOnly = loc == '/login' ||
          loc == '/register' ||
          loc == '/role-select';
      final role = session.user?.role;
      final patientOnly = <String>{
        '/home-patient',
      };
      final doctorOnly = <String>{
        '/home-doctor',
      };
      final clinicOnly = <String>{
        '/home-clinic',
      };
      if (!loggedIn && !authOnly) return '/login';
      if (loggedIn && authOnly) return session.homeRoute;
      if (loc == '/home') return session.homeRoute;
      if (role != UserRole.patient && patientOnly.contains(loc)) return session.homeRoute;
      if (role != UserRole.doctor && doctorOnly.contains(loc)) return session.homeRoute;
      if (role != UserRole.clinic && clinicOnly.contains(loc)) return session.homeRoute;
      return null;
    },
    routes: [
      GoRoute(path: '/splash', builder: (_, __) => const SplashScreen()),
      GoRoute(path: '/login', builder: (_, __) => const LoginScreen()),
      GoRoute(path: '/register', builder: (_, __) => const RegisterScreen()),
      GoRoute(path: '/role-select', builder: (_, __) => const RoleSelectionScreen()),
      GoRoute(path: '/home', builder: (_, __) => const HomeDashboardScreen()),
      GoRoute(path: '/home-patient', builder: (_, __) => const HomeDashboardScreen()),
      GoRoute(path: '/home-doctor', builder: (_, __) => const DoctorDashboardScreen()),
      GoRoute(path: '/home-clinic', builder: (_, __) => const ClinicDashboardScreen()),
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
