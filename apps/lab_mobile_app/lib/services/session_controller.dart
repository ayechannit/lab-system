import 'dart:async';

import 'package:flutter/foundation.dart';

import '../models/app_notification.dart';
import '../models/app_user.dart';
import '../models/lab_advertisement.dart';
import '../models/lab_order.dart';
import '../models/lab_result.dart';
import '../models/lab_test_pick.dart';
import '../models/loyalty.dart';
import '../models/rating.dart';
import '../models/user_report.dart';
import '../models/user_role.dart';
import 'lab_user_api.dart';
import 'lab_report_pdf_service.dart';
import 'auth_session_storage.dart';
import 'notification_service.dart';
import '../utils/notification_utils.dart';

class SessionController extends ChangeNotifier {
  SessionController({required LabUserApi api}) : _api = api {
    unawaited(tryRestoreSession());
  }

  final LabUserApi _api;
  AppUser? _user;
  final List<LabOrderRequest> _orders = <LabOrderRequest>[];
  List<LabOrderSummary> _activeOrders = const [];
  List<LabOrderSummary> _releasedOrders = const [];
  Map<String, OrderRatingSummary> _orderRatings = const {};
  LabOrderSummary? _trackingOrder;
  LabResultReport? _latestResult;
  AiAnalysisResult? _aiAnalysis;
  String? _aiAnalysisTestId;
  LoyaltySnapshot _loyalty = const LoyaltySnapshot(balance: 0, entries: <LoyaltyEntry>[], earnRules: <PointEarnRule>[]);
  UserReportSummary? _userReport;
  List<LabAdvertisement> _advertisements = const [];
  bool _homeSummaryLoading = false;
  String? _homeSummaryError;
  List<AppNotification> _notifications = const [];
  bool _notificationsLoading = false;
  String? _notificationsError;
  bool _busy = false;
  bool _sessionRestoreAttempted = false;
  bool _sessionInitializing = true;

  AppUser? get user => _user;
  bool get isLoggedIn => _user != null;
  bool get sessionRestoreAttempted => _sessionRestoreAttempted;
  bool get isInitializingSession => _sessionInitializing;
  bool get busy => _busy;
  List<LabOrderRequest> get orders => List.unmodifiable(_orders);
  List<LabOrderSummary> get activeOrders => List.unmodifiable(_activeOrders);
  List<LabOrderSummary> get releasedOrders => List.unmodifiable(_releasedOrders);
  Map<String, OrderRatingSummary> get orderRatings => Map.unmodifiable(_orderRatings);
  OrderRatingSummary? ratingForOrder(String orderId) => _orderRatings[orderId];
  LabOrderSummary? get trackingOrder => _trackingOrder;
  LabResultReport? get latestResult => _latestResult;
  AiAnalysisResult? get aiAnalysis => _aiAnalysis;
  String? get aiAnalysisTestId => _aiAnalysisTestId;
  LoyaltySnapshot get loyalty => _loyalty;
  UserReportSummary? get userReport => _userReport;
  List<LabAdvertisement> get advertisements => List.unmodifiable(_advertisements);
  bool get homeSummaryLoading => _homeSummaryLoading;
  String? get homeSummaryError => _homeSummaryError;
  List<AppNotification> get notifications => List.unmodifiable(_notifications);
  bool get notificationsLoading => _notificationsLoading;
  String? get notificationsError => _notificationsError;
  int get unreadNotificationCount => _notifications.where((n) => !n.isRead).length;
  /// All end-user roles (patient, doctor, clinic) share the same home shell.
  String get homeRoute => _user == null ? '/login' : '/home';

  Future<void> login({
    required String email,
    required String password,
    bool remember = false,
  }) async {
    _setBusy(true);
    try {
      _user = await _api.login(
        LoginRequest(
          email: email,
          password: password,
          remember: remember,
        ),
      );
      final token = _api.accessToken;
      if (token != null) {
        await AuthSessionStorage.saveSession(
          token: token,
          remember: remember,
          email: email,
        );
      }
      await _hydrateUserData();
    } finally {
      _setBusy(false);
    }
  }

  /// Restores a saved session from device storage (`GET /api/auth/me`).
  Future<void> tryRestoreSession() async {
    if (_sessionRestoreAttempted) return;
    _sessionRestoreAttempted = true;

    try {
      if (_user != null) return;

      final token = await AuthSessionStorage.readAccessToken();
      if (token == null) return;

      _api.setAccessToken(token);
      try {
        _user = await _api.getCurrentUser();
        await _hydrateUserData();
      } catch (_) {
        _api.clearAuth();
        _user = null;
        await AuthSessionStorage.clearAccessToken();
      }
    } finally {
      _sessionInitializing = false;
      notifyListeners();
    }
  }

  /// Creates the account on the server only. Caller should navigate to `/login`;
  /// the user is not signed in after this returns.
  Future<String> requestPasswordReset(String email) => _api.requestPasswordReset(email);

  Future<String> resetPasswordWithCode({
    required String email,
    required String code,
    required String newPassword,
  }) =>
      _api.resetPasswordWithCode(email: email, code: code, newPassword: newPassword);

  Future<void> register({
    required String name,
    required String phone,
    required String email,
    required String password,
    required UserRole role,
    String address = '',
    required double latitude,
    required double longitude,
  }) async {
    _setBusy(true);
    try {
      await _api.register(
        RegisterRequest(
          name: name,
          phone: phone,
          email: email,
          password: password,
          role: role,
          address: address,
          latitude: latitude,
          longitude: longitude,
        ),
      );
      _api.clearAuth();
    } finally {
      _setBusy(false);
    }
  }

  void logout() {
    _api.clearAuth();
    unawaited(AuthSessionStorage.clear());
    _user = null;
    _orders.clear();
    _activeOrders = const [];
    _releasedOrders = const [];
    _orderRatings = const {};
    _trackingOrder = null;
    _latestResult = null;
    _aiAnalysis = null;
    _aiAnalysisTestId = null;
    _loyalty = const LoyaltySnapshot(balance: 0, entries: <LoyaltyEntry>[], earnRules: <PointEarnRule>[]);
    _userReport = null;
    _advertisements = const [];
    _homeSummaryLoading = false;
    _homeSummaryError = null;
    _notifications = const [];
    _notificationsLoading = false;
    _notificationsError = null;
    notifyListeners();
  }

  Future<void> updateProfile({
    String? name,
    String? phone,
    String? email,
    String? address,
    double? latitude,
    double? longitude,
  }) async {
    final u = _user;
    if (u == null) return;
    _user = await _api.updateProfile(
      userId: u.id,
      name: name,
      phone: phone,
      email: email,
      address: address,
      latitude: latitude,
      longitude: longitude,
    );
    notifyListeners();
  }

  Future<void> uploadProfileImage({
    required List<int> bytes,
    required String filename,
  }) async {
    final u = _user;
    if (u == null) return;
    _user = await _api.uploadProfileImage(
      userId: u.id,
      bytes: bytes,
      filename: filename,
    );
    notifyListeners();
  }

  Future<void> submitLabOrder(LabOrderRequest order) async {
    final u = _user;
    if (u == null) return;
    _setBusy(true);
    try {
      _trackingOrder = await _api.createOrder(userId: u.id, request: order);
      _orders.insert(0, order);
      await refreshActiveOrders();
      await refreshReleasedOrders();
      _latestResult = await _api.getLatestResult(u.id);
      _loyalty = await _api.getLoyaltySnapshot(u.id);
      if (_latestResult != null) {
        _aiAnalysis = await _api.getAiAnalysis(
          userId: u.id,
          orderId: _latestResult!.orderId,
        );
      } else {
        _aiAnalysis = null;
      }
      notifyListeners();
    } finally {
      _setBusy(false);
    }
  }

  Future<List<LabTestPick>> fetchActiveLabTests() => _api.listActiveLabTests();

  Future<List<LabCollectorPick>> fetchActiveCollectors() => _api.listActiveCollectors();

  Future<ServiceFeeQuote> calculateServiceFee({
    required double latitude,
    required double longitude,
  }) =>
      _api.calculateServiceFee(latitude: latitude, longitude: longitude);

  Future<MaterialFeeQuote?> fetchActiveMaterialFee() => _api.fetchActiveMaterialFee();

  Future<void> acceptProposedSchedule() async {
    final u = _user;
    final o = _trackingOrder;
    if (u == null || o == null) return;
    _setBusy(true);
    try {
      await _api.acceptSchedule(userId: u.id, orderId: o.id);
      await refreshTracking();
      _latestResult = await _api.getLatestResult(u.id);
      notifyListeners();
    } finally {
      _setBusy(false);
    }
  }

  Future<void> refreshActiveOrders({
    String sortBy = 'created_at',
    String sortOrder = 'DESC',
  }) async {
    final u = _user;
    if (u == null) return;
    _activeOrders = await _api.listActiveOrders(
      u.id,
      sortBy: sortBy,
      sortOrder: sortOrder,
    );
    notifyListeners();
  }

  Future<void> refreshReleasedOrders({
    String sortBy = 'updated_at',
    String sortOrder = 'DESC',
  }) async {
    final u = _user;
    if (u == null) return;
    _releasedOrders = await _api.listReleasedOrders(
      u.id,
      sortBy: sortBy,
      sortOrder: sortOrder,
    );
    notifyListeners();
  }

  Future<void> refreshResultsTab({
    String sortBy = 'updated_at',
    String sortOrder = 'DESC',
  }) async {
    await refreshReleasedOrders(sortBy: sortBy, sortOrder: sortOrder);
    await refreshOrderRatings();
  }

  Future<void> refreshOrdersTab({
    String sortBy = 'created_at',
    String sortOrder = 'DESC',
  }) async {
    await refreshActiveOrders(sortBy: sortBy, sortOrder: sortOrder);
    await refreshOrderRatings();
  }

  Future<void> refreshOrderRatings() async {
    final u = _user;
    if (u == null) return;
    final list = await _api.listUserRatings(u.id);
    _orderRatings = {for (final r in list) r.orderId: r};
    notifyListeners();
  }

  Future<void> selectResult(String orderId) async {
    final u = _user;
    if (u == null) return;
    _setBusy(true);
    try {
      _latestResult = await _api.getResultForOrder(userId: u.id, orderId: orderId);
      _aiAnalysis = null;
      _aiAnalysisTestId = null;
      notifyListeners();
    } finally {
      _setBusy(false);
    }
  }

  Future<AiAnalysisResult?> loadAiAnalysisForTest(String testId) async {
    final u = _user;
    final orderId = _latestResult?.orderId;
    if (u == null || orderId == null) return null;
    final analysis = await _api.getAiAnalysis(
      userId: u.id,
      orderId: orderId,
      testId: testId,
    );
    if (analysis != null) {
      _aiAnalysis = analysis;
      _aiAnalysisTestId = testId;
      notifyListeners();
    }
    return analysis;
  }

  Future<void> selectTrackingOrder(String orderId) async {
    final u = _user;
    if (u == null) return;
    _setBusy(true);
    try {
      _trackingOrder = await _api.getOrderSummary(orderId);
      notifyListeners();
    } finally {
      _setBusy(false);
    }
  }

  Future<void> refreshTracking() async {
    final u = _user;
    if (u == null) return;
    final currentId = _trackingOrder?.id;
    if (currentId != null) {
      _trackingOrder = await _api.getOrderSummary(currentId);
    } else {
      _trackingOrder = await _api.getTrackingOrder(u.id);
    }
    await refreshActiveOrders();
    notifyListeners();
  }

  Future<void> refreshLoyalty() async {
    final u = _user;
    if (u == null) return;
    _loyalty = await _api.getLoyaltySnapshot(u.id);
    notifyListeners();
  }

  /// Reload dashboard metrics, ads, tracking, and notification count (home tab tap / pull-to-refresh).
  Future<void> refreshHomeTab() async {
    await Future.wait([
      refreshHomeSummary(),
      refreshTracking(),
      refreshNotifications(quiet: true),
    ]);
  }

  Future<void> refreshHomeSummary() async {
    final u = _user;
    if (u == null) return;
    _homeSummaryLoading = true;
    _homeSummaryError = null;
    notifyListeners();
    try {
      final reportFuture = _api.fetchUserReportSummary();
      final adsFuture = _api.fetchActiveAdvertisements();
      _userReport = await reportFuture;
      _homeSummaryError = null;
      try {
        _advertisements = await adsFuture;
      } catch (_) {
        _advertisements = const [];
      }
    } catch (e) {
      _homeSummaryError = 'Could not load your summary. Pull down to retry.';
      try {
        _advertisements = await _api.fetchActiveAdvertisements();
      } catch (_) {
        _advertisements = const [];
      }
    } finally {
      _homeSummaryLoading = false;
      notifyListeners();
    }
  }

  Future<void> runAiAnalysis({String? testId}) async {
    final u = _user;
    final orderId = _latestResult?.orderId;
    if (u == null || orderId == null) return;
    _setBusy(true);
    try {
      _aiAnalysisTestId = testId;
      _aiAnalysis = await _api.runAiAnalysis(
        userId: u.id,
        orderId: orderId,
        testId: testId,
      );
      notifyListeners();
    } finally {
      _setBusy(false);
    }
  }

  Future<String> downloadTestResultPdf({
    required LabResultTestItem test,
    required LabResultReport report,
  }) async {
    final filename = LabReportPdfService.buildFilename(
      sampleId: report.patientName.trim().isNotEmpty ? report.patientName : report.sampleId,
      orderId: report.orderId,
      testCode: test.testCode.isNotEmpty ? test.testCode : test.testName,
    );
    if (test.testId.isNotEmpty) {
      final bytes = await _api.downloadResultPdf(orderId: report.orderId, testId: test.testId);
      return LabReportPdfService.saveBytes(bytes: bytes, filename: filename);
    }
    final url = test.pdfUrl;
    if (url == null || url.trim().isEmpty) {
      throw LabReportPdfException('No PDF is available for this test.');
    }
    return LabReportPdfService.download(url: url, filename: filename);
  }

  Future<String> downloadReportPdf(LabResultReport report) async {
    LabResultTestItem? test;
    for (final t in report.tests) {
      if (t.hasPdf) {
        test = t;
        break;
      }
    }
    if (test != null) {
      return downloadTestResultPdf(test: test, report: report);
    }
    final filename = LabReportPdfService.buildFilename(
      sampleId: report.patientName.trim().isNotEmpty ? report.patientName : report.sampleId,
      orderId: report.orderId,
    );
    final testId = report.resultTestId;
    if (testId != null && testId.isNotEmpty) {
      final bytes = await _api.downloadResultPdf(orderId: report.orderId, testId: testId);
      return LabReportPdfService.saveBytes(bytes: bytes, filename: filename);
    }
    final url = report.resultPdfUrl;
    if (url == null || url.trim().isEmpty) {
      throw LabReportPdfException('No PDF is available for this report.');
    }
    return LabReportPdfService.download(url: url, filename: filename);
  }

  Future<void> submitOrderRating({
    required String orderId,
    required int stars,
    String remark = '',
  }) async {
    final u = _user;
    if (u == null) return;
    _setBusy(true);
    try {
      final saved = await _api.submitRating(
        userId: u.id,
        rating: RatingDraft(
          orderId: orderId,
          stars: stars,
          remark: remark,
          createdAt: DateTime.now(),
        ),
      );
      _orderRatings = {..._orderRatings, orderId: saved};
      _loyalty = await _api.getLoyaltySnapshot(u.id);
      notifyListeners();
    } finally {
      _setBusy(false);
    }
  }

  Future<void> submitRating({
    required int stars,
    required String remark,
    String? orderId,
  }) async {
    final id = orderId ?? _latestResult?.orderId ?? _trackingOrder?.id;
    if (id == null) return;
    await submitOrderRating(orderId: id, stars: stars, remark: remark);
  }

  Future<void> refreshNotifications({bool quiet = false}) async {
    if (_user == null) return;
    if (!quiet) {
      _notificationsLoading = true;
      _notificationsError = null;
      notifyListeners();
    }
    try {
      _notifications = await _api.fetchNotifications();
      _notificationsError = null;
    } catch (_) {
      if (!quiet || _notifications.isEmpty) {
        _notificationsError = 'Could not load notifications. Pull down to retry.';
      }
    } finally {
      if (!quiet) {
        _notificationsLoading = false;
      }
      notifyListeners();
    }
  }

  Future<void> markNotificationRead(String id) async {
    if (_user == null) return;
    final index = _notifications.indexWhere((n) => n.id == id);
    if (index < 0 || _notifications[index].isRead) return;

    _notifications = [
      for (var i = 0; i < _notifications.length; i++)
        if (i == index) _notifications[i].markRead() else _notifications[i],
    ];
    notifyListeners();

    try {
      await _api.markNotificationAsRead(id);
    } catch (_) {
      await refreshNotifications(quiet: true);
    }
  }

  Future<void> markAllNotificationsRead() async {
    if (_user == null || unreadNotificationCount == 0) return;
    _notifications = [for (final n in _notifications) n.markRead()];
    notifyListeners();
    try {
      await _api.markAllNotificationsAsRead();
    } catch (_) {
      await refreshNotifications(quiet: true);
    }
  }

  /// Marks read when needed and preloads related data. Returns route to open.
  Future<String?> openNotification(AppNotification notification) async {
    if (!notification.isRead) {
      await markNotificationRead(notification.id);
    }

    final payload = parseNotificationPayload(notification.dataPayload);
    final orderId = payload?['order_id']?.toString();
    final route = notificationRoute(notification);

    if (route == '/lab-results') {
      await refreshResultsTab();
    } else if (route == '/orders') {
      await refreshOrdersTab();
    }

    if (orderId != null && orderId.isNotEmpty) {
      if (route == '/lab-results') {
        await selectResult(orderId);
      } else if (route == '/order-tracking' || route == '/orders') {
        try {
          await selectTrackingOrder(orderId);
        } catch (_) {
          // Fall back to list screens if the order is no longer trackable.
        }
      }
    }
    return route;
  }

  Future<void> _hydrateUserData() async {
    final u = _user;
    if (u == null) return;

    // Initialize Firebase and register FCM device token in background
    MobileNotificationService.initializeAndRegister(_api).catchError((e) {
      debugPrint('FCM background auto-registration warning: $e');
    });
    _activeOrders = await _api.listActiveOrders(u.id);
    _releasedOrders = await _api.listReleasedOrders(u.id);
    final ratings = await _api.listUserRatings(u.id);
    _orderRatings = {for (final r in ratings) r.orderId: r};
    _trackingOrder = await _api.getTrackingOrder(u.id);
    _latestResult = await _api.getLatestResult(u.id);
    _loyalty = await _api.getLoyaltySnapshot(u.id);
    try {
      _userReport = await _api.fetchUserReportSummary();
      _homeSummaryError = null;
    } catch (_) {
      _userReport = null;
      _homeSummaryError = 'Could not load your summary. Pull down to retry.';
    }
    try {
      _advertisements = await _api.fetchActiveAdvertisements();
    } catch (_) {
      _advertisements = const [];
    }
    if (_latestResult != null) {
      _aiAnalysis = await _api.getAiAnalysis(
        userId: u.id,
        orderId: _latestResult!.orderId,
      );
    } else {
      _aiAnalysis = null;
    }
    unawaited(refreshNotifications(quiet: true));
    notifyListeners();
  }

  void _setBusy(bool value) {
    _busy = value;
    notifyListeners();
  }
}
