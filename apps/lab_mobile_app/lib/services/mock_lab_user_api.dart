import '../mock_data/demo_catalog.dart';
import '../models/app_user.dart';
import '../models/lab_order.dart';
import '../models/lab_result.dart';
import '../models/loyalty.dart';
import '../models/rating.dart';
import '../models/user_role.dart';
import 'lab_user_api.dart';

class MockLabUserApi implements LabUserApi {
  final Map<String, AppUser> _usersByEmail = {
    'john.doe@example.com': const AppUser(
      id: 'u1',
      name: 'John Doe',
      phone: '+95 9 123 456 789',
      email: 'john.doe@example.com',
      role: UserRole.patient,
      pointsBalance: 120,
    ),
    'doctor@example.com': const AppUser(
      id: 'u2',
      name: 'Dr. May Thazin',
      phone: '+95 9 555 111 222',
      email: 'doctor@example.com',
      role: UserRole.doctor,
      pointsBalance: 45,
    ),
    'clinic@example.com': const AppUser(
      id: 'u3',
      name: 'CityCare Clinic',
      phone: '+95 9 777 999 888',
      email: 'clinic@example.com',
      role: UserRole.clinic,
      pointsBalance: 80,
    ),
  };

  final Map<String, LabOrderSummary> _ordersByUser = {};
  final Map<String, LabResultReport> _resultsByUser = {};
  final Map<String, AiAnalysisResult> _aiByOrder = {};
  final Map<String, List<RatingDraft>> _ratingsByUser = {};
  final Map<String, List<LoyaltyEntry>> _pointsByUser = {
    'u1': List.of(DemoCatalog.loyaltyHistory),
    'u2': const [],
    'u3': const [],
  };

  int _orderSeq = 1040;

  @override
  Future<AppUser> login(LoginRequest request) async {
    final matched = _usersByEmail[request.email.trim().toLowerCase()];
    if (matched != null) return matched;
    return AppUser(
      id: 'u${_usersByEmail.length + 1}',
      name: request.email.split('@').first,
      phone: '+95 9 000 000 000',
      email: request.email,
      role: request.roleHint ?? UserRole.patient,
      pointsBalance: 0,
    );
  }

  @override
  Future<AppUser> register(RegisterRequest request) async {
    final user = AppUser(
      id: 'u${_usersByEmail.length + 1}',
      name: request.name,
      phone: request.phone,
      email: request.email.trim().toLowerCase(),
      role: request.role,
      pointsBalance: 0,
    );
    _usersByEmail[user.email] = user;
    _pointsByUser[user.id] = <LoyaltyEntry>[];
    return user;
  }

  @override
  Future<void> updateProfile({
    required String userId,
    String? name,
    String? phone,
    String? email,
  }) async {
    final current = _usersByEmail.values.firstWhere((u) => u.id == userId);
    final updated = current.copyWith(name: name, phone: phone, email: email);
    _usersByEmail.remove(current.email);
    _usersByEmail[updated.email] = updated;
  }

  @override
  Future<LabOrderSummary> createOrder({
    required String userId,
    required LabOrderRequest request,
  }) async {
    _orderSeq += 1;
    final id = 'LAB$_orderSeq';
    final summary = LabOrderSummary(
      id: id,
      userId: userId,
      patientName: request.patientName,
      testType: request.testName,
      description: request.description,
      priority: request.priority,
      address: request.address,
      createdAt: request.createdAt,
      createdAtLabel:
          '${request.createdAt.year}-${request.createdAt.month.toString().padLeft(2, '0')}-${request.createdAt.day.toString().padLeft(2, '0')}',
      timeline: [
        OrderTimelineStep(
          title: 'Order Submitted',
          subtitle: 'Received by lab',
          done: true,
          occurredAt: request.createdAt,
        ),
        OrderTimelineStep(
          title: 'Collection Accepted',
          subtitle: 'Tomorrow 10:00 AM · by Ko Aung',
          done: true,
          occurredAt: request.createdAt.add(const Duration(hours: 2)),
          actor: 'Ko Aung',
        ),
        const OrderTimelineStep(
          title: 'Sample Running',
          subtitle: 'In laboratory queue',
          done: true,
        ),
        const OrderTimelineStep(
          title: 'Report Out',
          subtitle: 'Ready for review',
          done: true,
        ),
      ],
      collectionAcceptedAt: request.createdAt.add(const Duration(hours: 2)),
      collectorName: 'Ko Aung',
      runningAt: request.createdAt.add(const Duration(hours: 5)),
      reportOutAt: request.createdAt.add(const Duration(hours: 10)),
    );
    _ordersByUser[userId] = summary;
    _resultsByUser[userId] = LabResultReport(
      orderId: id,
      sampleId: '#8829-XJ',
      releasedAt: DateTime.now().add(const Duration(hours: 10)),
      lines: const [
        LabResultLine(name: 'Hemoglobin', value: '10.2', flag: ResultFlag.low),
        LabResultLine(name: 'WBC', value: '7500', flag: ResultFlag.normal),
      ],
    );
    final rulesPoints = request.priority == OrderPriority.urgent ? 25 : 15;
    final current = _pointsByUser[userId] ?? <LoyaltyEntry>[];
    current.insert(
      0,
      LoyaltyEntry(
        label: 'Order $id completed (lab rule)',
        delta: rulesPoints,
        atLabel: 'Today',
        sourceOrderId: id,
      ),
    );
    _pointsByUser[userId] = current;
    return summary;
  }

  @override
  Future<LabOrderSummary?> getTrackingOrder(String userId) async => _ordersByUser[userId] ?? DemoCatalog.demoTrackingOrder();

  @override
  Future<LabResultReport?> getLatestResult(String userId) async => _resultsByUser[userId] ??
      LabResultReport(
        orderId: 'LAB1021',
        sampleId: '#8829-XJ',
        releasedAt: DateTime(2026, 4, 24, 17, 30),
        lines: const [
          LabResultLine(name: 'Hemoglobin', value: '10.2', flag: ResultFlag.low),
          LabResultLine(name: 'WBC', value: '7500', flag: ResultFlag.normal),
        ],
      );

  @override
  Future<AiAnalysisResult?> getAiAnalysis({
    required String userId,
    required String orderId,
  }) async {
    return _aiByOrder[orderId];
  }

  @override
  Future<AiAnalysisResult> runAiAnalysis({
    required String userId,
    required String orderId,
  }) async {
    final analysis = AiAnalysisResult(
      orderId: orderId,
      generatedAt: DateTime.now(),
      summary: "I've reviewed your latest laboratory results and prepared a simplified explanation.",
      observation: DemoCatalog.aiHemoglobinMessage,
      recommendation: 'Please consult a clinician and consider an iron-rich diet.',
    );
    _aiByOrder[orderId] = analysis;
    return analysis;
  }

  @override
  Future<void> submitRating({
    required String userId,
    required RatingDraft rating,
  }) async {
    final bucket = _ratingsByUser[userId] ?? <RatingDraft>[];
    bucket.add(rating);
    _ratingsByUser[userId] = bucket;
    final points = _pointsByUser[userId] ?? <LoyaltyEntry>[];
    points.insert(
      0,
      LoyaltyEntry(
        label: 'Feedback reward',
        delta: 5,
        atLabel: 'Today',
        sourceOrderId: rating.orderId,
      ),
    );
    _pointsByUser[userId] = points;
  }

  @override
  Future<LoyaltySnapshot> getLoyaltySnapshot(String userId) async {
    final entries = List<LoyaltyEntry>.from(_pointsByUser[userId] ?? const <LoyaltyEntry>[]);
    final balance = entries.fold<int>(0, (acc, e) => acc + e.delta);
    return LoyaltySnapshot(balance: balance, entries: entries);
  }
}
