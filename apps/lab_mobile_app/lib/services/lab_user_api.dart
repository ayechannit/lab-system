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
    required this.latitude,
    required this.longitude,
  });

  final String name;
  final String phone;
  final String email;
  final String password;
  final UserRole role;

  /// Home / clinic address line (`POST /api/users`).
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
  /// Creates the account via `POST /api/users` only — does not sign the user in.
  Future<void> register(RegisterRequest request);
  Future<AppUser> login(LoginRequest request);
  Future<AppUser> updateProfile({
    required String userId,
    String? name,
    String? phone,
    String? email,
    String? address,
    double? latitude,
    double? longitude,
  });
  Future<List<LabTestPick>> listActiveLabTests();
  Future<LabOrderSummary> createOrder({
    required String userId,
    required LabOrderRequest request,
  });
  /// Orders for the user where status is not [excludeStatus] (default `delivered`).
  Future<List<LabOrderSummary>> listActiveOrders(
    String userId, {
    String excludeStatus = 'delivered',
    int limit = 50,
    int page = 1,
  });

  Future<LabOrderSummary> getOrderSummary(String orderId);

  /// Orders released to the patient (`status=delivered`).
  Future<List<LabOrderSummary>> listReleasedOrders(
    String userId, {
    int limit = 50,
    int page = 1,
  });

  Future<LabOrderSummary?> getTrackingOrder(String userId);
  Future<LabResultReport?> getResultForOrder({
    required String userId,
    required String orderId,
  });
  Future<LabResultReport?> getLatestResult(String userId);
  Future<AiAnalysisResult?> getAiAnalysis({
    required String userId,
    required String orderId,
  });
  Future<AiAnalysisResult> runAiAnalysis({
    required String userId,
    required String orderId,
  });
  Future<List<OrderRatingSummary>> listUserRatings(
    String userId, {
    int limit = 100,
    int page = 1,
  });

  Future<OrderRatingSummary?> getOrderRating(String orderId);

  Future<OrderRatingSummary> submitRating({
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
