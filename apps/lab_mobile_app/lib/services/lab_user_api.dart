import '../models/app_notification.dart';
import '../models/app_user.dart';
import '../models/lab_advertisement.dart';
import '../models/lab_order.dart';
import '../models/lab_result.dart';
import '../models/lab_test_pick.dart';
import '../models/loyalty.dart';
import '../models/membership_tier.dart';
import '../models/rating.dart';
import '../models/user_report.dart';

class RegisterRequest {
  const RegisterRequest({
    required this.name,
    required this.phone,
    required this.password,
    this.profileImageBytes,
    this.profileImageFilename,
  });

  final String name;
  final String phone;
  final String password;

  /// Optional avatar uploaded with registration (multipart `image`).
  final List<int>? profileImageBytes;
  final String? profileImageFilename;
}

class LoginRequest {
  const LoginRequest({
    required this.phone,
    required this.password,
    this.remember = true,
  });

  final String phone;
  final String password;
  final bool remember;
}

/// Contract-first API for user app features.
abstract class LabUserApi {
  /// In-memory bearer token (also restored from device storage when remember-me is on).
  String? get accessToken;

  void setAccessToken(String? token);

  /// Preferred API locale (`Accept-Language` header).
  void setLocaleCode(String? localeCode);

  /// `GET /api/auth/me` using the current bearer token.
  Future<AppUser> getCurrentUser();

  /// Creates the account via `POST /api/users` only — does not sign the user in.
  Future<void> register(RegisterRequest request);
  Future<AppUser> login(LoginRequest request);

  Future<AppUser> updateProfile({
    required String userId,
    String? name,
    String? phone,
    String? address,
    double? latitude,
    double? longitude,
  });

  /// Soft-deletes the signed-in account (`DELETE /api/users/:id`).
  Future<void> deleteAccount(String userId);

  Future<AppUser> uploadProfileImage({
    required String userId,
    required List<int> bytes,
    required String filename,
  });
  Future<List<LabTestPick>> listActiveLabTests();
  Future<List<LabCollectorPick>> listActiveCollectors();
  Future<ServiceFeeQuote> calculateServiceFee({
    required double latitude,
    required double longitude,
  });
  Future<MaterialFeeQuote?> fetchActiveMaterialFee();
  Future<LabOrderSummary> createOrder({
    required String userId,
    required LabOrderRequest request,
  });
  /// Orders for the user where status is not [excludeStatus] (default `delivered`).
  Future<List<LabOrderSummary>> listActiveOrders(
    String userId, {
    String excludeStatus = 'delivered',
    String sortBy = 'created_at',
    String sortOrder = 'DESC',
    int limit = 50,
    int page = 1,
  });

  Future<LabOrderSummary> getOrderSummary(String orderId);

  /// Orders released to the patient (`status=delivered`).
  Future<List<LabOrderSummary>> listReleasedOrders(
    String userId, {
    String sortBy = 'updated_at',
    String sortOrder = 'DESC',
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
    String? testId,
  });
  Future<AiAnalysisResult> runAiAnalysis({
    required String userId,
    required String orderId,
    String? testId,
  });

  /// Authenticated download of a released result PDF (`GET .../result-file`).
  Future<List<int>> downloadResultPdf({
    required String orderId,
    required String testId,
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

  /// Active membership ladder for progress UI (`GET /api/membership-tiers/active`).
  Future<List<MembershipTierLevel>> listActiveMembershipTiers();

  /// Personalized home metrics from `GET /api/reports/user-summary`.
  Future<UserReportSummary> fetchUserReportSummary({
    DateTime? startDate,
    DateTime? endDate,
  });

  /// Live promotional banners for the home screen (`GET /api/advertisements`).
  Future<List<LabAdvertisement>> fetchActiveAdvertisements();

  /// Confirm the lab-proposed collection schedule (quotation: scheduling from lab).
  Future<void> acceptSchedule({
    required String userId,
    required String orderId,
  });

  /// Register the FCM device token with the server.
  Future<void> registerFcmToken(String token);

  /// In-app notification inbox (`GET /api/notifications`).
  Future<List<AppNotification>> fetchNotifications({int limit = 50});

  Future<void> markNotificationAsRead(String id);

  Future<void> markAllNotificationsAsRead();

  /// Clear credentials after logout (REST client clears bearer token).
  void clearAuth();
}
