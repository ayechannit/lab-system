import '../models/app_user.dart';
import '../models/lab_order.dart';
import '../models/lab_result.dart';
import '../models/lab_test_pick.dart';
import '../models/loyalty.dart';
import '../models/rating.dart';
import '../models/user_role.dart';

class RegisterRequest {
  const RegisterRequest({
    required this.name,
    required this.phone,
    required this.email,
    required this.password,
    required this.role,
    this.address = '',
    this.latitude = 0,
    this.longitude = 0,
  });

  final String name;
  final String phone;
  final String email;
  final String password;
  final UserRole role;

  /// Home / clinic address line (admin web signup sends the same to `POST /api/users`).
  final String address;
  final double latitude;
  final double longitude;
}

class LoginRequest {
  const LoginRequest({
    required this.email,
    required this.password,
  });

  final String email;
  final String password;
}

/// Contract-first API for user app features.
abstract class LabUserApi {
  Future<AppUser> register(RegisterRequest request);
  Future<AppUser> login(LoginRequest request);
  Future<void> updateProfile({
    required String userId,
    String? name,
    String? phone,
    String? email,
  });
  Future<List<LabTestPick>> listActiveLabTests();
  Future<LabOrderSummary> createOrder({
    required String userId,
    required LabOrderRequest request,
  });
  Future<LabOrderSummary?> getTrackingOrder(String userId);
  Future<LabResultReport?> getLatestResult(String userId);
  Future<AiAnalysisResult?> getAiAnalysis({
    required String userId,
    required String orderId,
  });
  Future<AiAnalysisResult> runAiAnalysis({
    required String userId,
    required String orderId,
  });
  Future<void> submitRating({
    required String userId,
    required RatingDraft rating,
  });
  Future<LoyaltySnapshot> getLoyaltySnapshot(String userId);

  /// Confirm the lab-proposed collection schedule (quotation: scheduling from lab).
  Future<void> acceptSchedule({
    required String userId,
    required String orderId,
  });

  /// Clear credentials after logout (REST client clears bearer token).
  void clearAuth();
}
