import 'package:flutter/foundation.dart';

import '../models/app_user.dart';
import '../models/lab_order.dart';
import '../models/lab_result.dart';
import '../models/lab_test_pick.dart';
import '../models/loyalty.dart';
import '../models/rating.dart';
import '../models/user_role.dart';
import 'lab_user_api.dart';

class SessionController extends ChangeNotifier {
  SessionController({required LabUserApi api}) : _api = api;

  final LabUserApi _api;
  AppUser? _user;
  final List<LabOrderRequest> _orders = <LabOrderRequest>[];
  LabOrderSummary? _trackingOrder;
  LabResultReport? _latestResult;
  AiAnalysisResult? _aiAnalysis;
  LoyaltySnapshot _loyalty = const LoyaltySnapshot(balance: 0, entries: <LoyaltyEntry>[]);
  bool _busy = false;

  AppUser? get user => _user;
  bool get isLoggedIn => _user != null;
  bool get busy => _busy;
  List<LabOrderRequest> get orders => List.unmodifiable(_orders);
  LabOrderSummary? get trackingOrder => _trackingOrder;
  LabResultReport? get latestResult => _latestResult;
  AiAnalysisResult? get aiAnalysis => _aiAnalysis;
  LoyaltySnapshot get loyalty => _loyalty;
  /// All end-user roles (patient, doctor, clinic) share the same home shell.
  String get homeRoute => _user == null ? '/login' : '/home';

  Future<void> login({
    required String email,
    required String password,
  }) async {
    _setBusy(true);
    _user = await _api.login(LoginRequest(email: email, password: password));
    await _hydrateUserData();
    _setBusy(false);
  }

  /// Creates the account on the server only. Caller should navigate to `/login`;
  /// the user is not signed in after this returns.
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
    _user = null;
    _orders.clear();
    _trackingOrder = null;
    _latestResult = null;
    _aiAnalysis = null;
    _loyalty = const LoyaltySnapshot(balance: 0, entries: <LoyaltyEntry>[]);
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

  Future<void> submitLabOrder(LabOrderRequest order) async {
    final u = _user;
    if (u == null) return;
    _setBusy(true);
    try {
      _trackingOrder = await _api.createOrder(userId: u.id, request: order);
      _orders.insert(0, order);
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

  Future<void> refreshTracking() async {
    final u = _user;
    if (u == null) return;
    _trackingOrder = await _api.getTrackingOrder(u.id);
    notifyListeners();
  }

  Future<void> runAiAnalysis() async {
    final u = _user;
    final orderId = _latestResult?.orderId;
    if (u == null || orderId == null) return;
    _setBusy(true);
    _aiAnalysis = await _api.runAiAnalysis(userId: u.id, orderId: orderId);
    _setBusy(false);
  }

  Future<void> submitRating({
    required int stars,
    required String remark,
  }) async {
    final u = _user;
    final orderId = _latestResult?.orderId ?? _trackingOrder?.id;
    if (u == null || orderId == null) return;
    _setBusy(true);
    await _api.submitRating(
      userId: u.id,
      rating: RatingDraft(
        orderId: orderId,
        stars: stars,
        remark: remark,
        createdAt: DateTime.now(),
      ),
    );
    _loyalty = await _api.getLoyaltySnapshot(u.id);
    _setBusy(false);
  }

  Future<void> _hydrateUserData() async {
    final u = _user;
    if (u == null) return;
    _trackingOrder = await _api.getTrackingOrder(u.id);
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
  }

  void _setBusy(bool value) {
    _busy = value;
    notifyListeners();
  }
}
