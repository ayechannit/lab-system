import 'dart:convert';

import 'package:http/http.dart' as http;

import '../config/lab_api_config.dart';
import '../models/app_user.dart';
import '../models/lab_order.dart';
import '../models/lab_result.dart';
import '../models/lab_test_pick.dart';
import '../models/loyalty.dart';
import '../models/rating.dart';
import '../models/user_role.dart';
import 'lab_user_api.dart';

class LabApiException implements Exception {
  LabApiException(this.message, [this.statusCode]);
  final String message;
  final int? statusCode;

  @override
  String toString() => message;
}

class RestLabUserApi implements LabUserApi {
  RestLabUserApi({required String baseUrl}) : _base = _normalizeBase(baseUrl);

  final String _base;
  String? _token;

  static String _normalizeBase(String b) {
    var s = b.trim();
    while (s.endsWith('/')) {
      s = s.substring(0, s.length - 1);
    }
    return s;
  }

  Map<String, String> _jsonHeaders({bool withAuth = true}) {
    final h = <String, String>{'Content-Type': 'application/json', 'Accept': 'application/json'};
    if (withAuth && _token != null) {
      h['Authorization'] = 'Bearer $_token';
    }
    return h;
  }

  Never _throwFromResponse(http.Response r) {
    String msg = 'Request failed (${r.statusCode})';
    try {
      final j = jsonDecode(r.body);
      if (j is Map) {
        final m = j['message'] ?? j['error'];
        if (m != null) msg = '$m';
      }
    } catch (_) {}
    throw LabApiException(msg, r.statusCode);
  }

  dynamic _gv(Map<String, dynamic>? m, String a, [String? b]) {
    if (m == null) return null;
    if (m.containsKey(a)) return m[a];
    if (b != null && m.containsKey(b)) return m[b];
    return null;
  }

  Map<String, dynamic> _asObj(dynamic v) {
    if (v is Map<String, dynamic>) return v;
    if (v is Map) return Map<String, dynamic>.from(v);
    return <String, dynamic>{};
  }

  int _asInt(dynamic v, [int d = 0]) {
    if (v == null) return d;
    if (v is int) return v;
    if (v is num) return v.toInt();
    return int.tryParse(v.toString()) ?? d;
  }

  double _asDouble(dynamic v, [double d = 0]) {
    if (v == null) return d;
    if (v is double) return v;
    if (v is num) return v.toDouble();
    return double.tryParse(v.toString()) ?? d;
  }

  DateTime? _asDt(dynamic v) {
    if (v == null) return null;
    return DateTime.tryParse(v.toString());
  }

  bool _asBool(dynamic v, [bool d = false]) {
    if (v == null) return d;
    if (v is bool) return v;
    if (v is num) return v != 0;
    final s = v.toString().toLowerCase();
    return s == 'true' || s == '1';
  }

  UserRole _parseRole(String? r) {
    switch ((r ?? '').toLowerCase()) {
      case 'doctor':
        return UserRole.doctor;
      case 'clinic':
        return UserRole.clinic;
      default:
        return UserRole.patient;
    }
  }

  AppUser _userFromMe(Map<String, dynamic> m) {
    final id = '${_gv(m, 'id') ?? ''}';
    return AppUser(
      id: id,
      name: '${_gv(m, 'name') ?? ''}',
      phone: '${_gv(m, 'phone') ?? ''}',
      email: '${_gv(m, 'email') ?? ''}',
      role: _parseRole('${_gv(m, 'role')}'),
      pointsBalance: _asInt(_gv(m, 'total_points')),
    );
  }

  @override
  Future<AppUser> register(RegisterRequest request) async {
    final body = jsonEncode({
      'name': request.name,
      'email': request.email.trim().toLowerCase(),
      'phone': request.phone,
      'role': request.role.name,
      // Admin web sends plaintext in `password_hash`; `User.create` hashes it.
      'password_hash': request.password,
      'address': request.address.trim(),
      'latitude': request.latitude,
      'longitude': request.longitude,
    });
    final r = await http.post(Uri.parse('$_base/api/users'), headers: _jsonHeaders(withAuth: false), body: body);
    if (r.statusCode >= 400) _throwFromResponse(r);
    return login(LoginRequest(email: request.email.trim(), password: request.password));
  }

  @override
  Future<AppUser> login(LoginRequest request) async {
    final r = await http.post(
      Uri.parse('$_base/api/auth/login/user'),
      headers: _jsonHeaders(withAuth: false),
      body: jsonEncode({
        'email': request.email.trim().toLowerCase(),
        'password': request.password,
      }),
    );
    if (r.statusCode >= 400) _throwFromResponse(r);
    final map = _asObj(jsonDecode(r.body));
    _token = map['token']?.toString();
    if (_token == null || _token!.isEmpty) {
      throw LabApiException('Login response missing token');
    }
    final me = await http.get(Uri.parse('$_base/api/auth/me'), headers: _jsonHeaders());
    if (me.statusCode >= 400) _throwFromResponse(me);
    return _userFromMe(_asObj(jsonDecode(me.body)));
  }

  @override
  Future<void> updateProfile({
    required String userId,
    String? name,
    String? phone,
    String? email,
  }) async {
    final body = <String, dynamic>{};
    if (name != null) body['name'] = name;
    if (phone != null) body['phone'] = phone;
    if (email != null) body['email'] = email;
    final r = await http.put(
      Uri.parse('$_base/api/users/$userId'),
      headers: _jsonHeaders(),
      body: jsonEncode(body),
    );
    if (r.statusCode >= 400) _throwFromResponse(r);
  }

  @override
  Future<List<LabTestPick>> listActiveLabTests() async {
    final r = await http.get(
      Uri.parse('$_base/api/tests?is_active=true&limit=200'),
      headers: _jsonHeaders(),
    );
    if (r.statusCode >= 400) _throwFromResponse(r);
    final list = jsonDecode(r.body);
    if (list is! List) return const [];
    return list.map((e) {
      final m = _asObj(e);
      return LabTestPick(
        id: '${_gv(m, 'id')}',
        name: '${_gv(m, 'test_name') ?? _gv(m, 'testName') ?? 'Test'}',
        code: '${_gv(m, 'test_code') ?? _gv(m, 'testCode') ?? ''}',
        basePriceMmk: _asInt(_gv(m, 'base_price_mmk') ?? _gv(m, 'basePriceMmk')),
      );
    }).toList();
  }

  @override
  Future<LabOrderSummary> createOrder({
    required String userId,
    required LabOrderRequest request,
  }) async {
    final tid = request.catalogTestId;
    if (tid == null || tid.isEmpty) {
      throw LabApiException('Select a lab test from the catalog.');
    }
    final price = request.catalogLinePriceMmk > 0 ? request.catalogLinePriceMmk : 0;
    if (price <= 0) {
      throw LabApiException('Invalid test price.');
    }
    final items = [
      {
        'test_id': tid,
        'quantity': 1,
        'unit_price_mmk': price,
        'subtotal_mmk': price,
      },
    ];
    final desc = _composeDescription(request);
    final mp = http.MultipartRequest('POST', Uri.parse('$_base/api/orders'));
    mp.headers['Authorization'] = 'Bearer $_token';
    mp.fields['user_id'] = userId;
    mp.fields['priority'] = request.priority.name;
    mp.fields['patient_name'] = request.patientName;
    mp.fields['patient_age'] = '${request.age}';
    mp.fields['patient_phone'] = request.phone;
    mp.fields['address'] = request.address.line;
    mp.fields['latitude'] = '${request.address.latitude}';
    mp.fields['longitude'] = '${request.address.longitude}';
    mp.fields['report_delivery_method'] = request.reportDeliveryMethod;
    mp.fields['description'] = desc;
    mp.fields['original_price_mmk'] = '$price';
    mp.fields['discount_percent'] = '0';
    mp.fields['final_price_mmk'] = '$price';
    mp.fields['items'] = jsonEncode(items);

    final streamed = await mp.send();
    final r = await http.Response.fromStream(streamed);
    if (r.statusCode >= 400) _throwFromResponse(r);
    final created = _asObj(jsonDecode(r.body));
    final id = '${_gv(created, 'id')}';
    return _hydrateOrderSummary(id);
  }

  String _composeDescription(LabOrderRequest request) {
    final buf = StringBuffer();
    buf.writeln(request.description.trim());
    buf.writeln();
    buf.writeln('Facility / notes: ${request.labFacility}');
    buf.writeln('Gender: ${request.gender} · Blood type: ${request.bloodType}');
    buf.writeln(
      'Preferred collection: ${request.preferredDate.toIso8601String().split('T').first} · ${request.timeSlot}',
    );
    return buf.toString().trim();
  }

  Future<Map<String, dynamic>?> _fetchSchedule(String orderId) async {
    final r = await http.get(Uri.parse('$_base/api/schedules/$orderId'), headers: _jsonHeaders());
    if (r.statusCode == 404) return null;
    if (r.statusCode >= 400) _throwFromResponse(r);
    return _asObj(jsonDecode(r.body));
  }

  Future<LabOrderSummary> _hydrateOrderSummary(String orderId) async {
    final r = await http.get(Uri.parse('$_base/api/orders/$orderId'), headers: _jsonHeaders());
    if (r.statusCode >= 400) _throwFromResponse(r);
    final o = _asObj(jsonDecode(r.body));
    final sched = o['schedule'] != null ? _asObj(o['schedule']) : await _fetchSchedule(orderId);
    return _mapOrderToSummary(o, sched);
  }

  LabOrderSummary _mapOrderToSummary(Map<String, dynamic> o, Map<String, dynamic>? sched) {
    final id = '${_gv(o, 'id')}';
    final userId = '${_gv(o, 'user_id') ?? _gv(o, 'userId')}';
    final patientName = '${_gv(o, 'patient_name') ?? _gv(o, 'patientName') ?? ''}';
    final desc = '${_gv(o, 'description') ?? ''}';
    final priorityRaw = '${_gv(o, 'priority') ?? 'elective'}'.toLowerCase();
    final priority = priorityRaw == 'urgent' ? OrderPriority.urgent : OrderPriority.elective;
    final addressLine = '${_gv(o, 'address') ?? ''}';
    final lat = _asDouble(_gv(o, 'latitude'));
    final lng = _asDouble(_gv(o, 'longitude'));
    final createdAt = _asDt(_gv(o, 'created_at') ?? _gv(o, 'createdAt')) ?? DateTime.now();
    final createdLabel =
        '${createdAt.year}-${createdAt.month.toString().padLeft(2, '0')}-${createdAt.day.toString().padLeft(2, '0')}';

    final items = o['items'];
    String testLabel = 'Lab test';
    if (items is List && items.isNotEmpty) {
      final first = _asObj(items.first);
      final nested = first['test'];
      if (nested is Map) {
        final tm = _asObj(nested);
        testLabel = '${_gv(tm, 'test_name') ?? _gv(tm, 'testName') ?? testLabel}';
      }
    }

    final collectionTime = _asDt(_gv(sched, 'collection_time') ?? _gv(sched, 'collectionTime'));
    final runningTime = _asDt(_gv(sched, 'running_time') ?? _gv(sched, 'runningTime'));
    final reportOutTime = _asDt(_gv(sched, 'report_out_time') ?? _gv(sched, 'reportOutTime'));
    final rawCollector = sched == null
        ? ''
        : '${_gv(sched, 'collecting_person') ?? _gv(sched, 'collectingPerson') ?? ''}'.trim();
    final collectorName = rawCollector.isEmpty ? null : rawCollector;

    final accepted = sched == null ? true : _asBool(_gv(sched, 'accepted_by_user') ?? _gv(sched, 'acceptedByUser'), false);

    final status = '${_gv(o, 'status') ?? 'pending'}'.toLowerCase();
    final timeline = _buildTimeline(status, createdAt, collectionTime, runningTime, reportOutTime, collectorName);

    return LabOrderSummary(
      id: id,
      userId: userId,
      patientName: patientName,
      testType: testLabel,
      description: desc,
      priority: priority,
      address: LabAddress(line: addressLine, latitude: lat, longitude: lng),
      createdAt: createdAt,
      timeline: timeline,
      createdAtLabel: createdLabel,
      collectionAcceptedAt: collectionTime,
      collectorName: collectorName,
      runningAt: runningTime,
      reportOutAt: reportOutTime,
      scheduleAcceptedByUser: accepted,
      backendStatus: status,
    );
  }

  List<OrderTimelineStep> _buildTimeline(
    String status,
    DateTime orderCreated,
    DateTime? collectionTime,
    DateTime? runningTime,
    DateTime? reportOutTime,
    String? collectorName,
  ) {
    int rank(String s) {
      switch (s) {
        case 'delivered':
        case 'completed':
          return 5;
        case 'running':
          return 4;
        case 'collecting':
          return 3;
        case 'scheduled':
          return 2;
        case 'pending':
          return 1;
        default:
          return 0;
      }
    }

    final r = rank(status);
    String colSub = collectionTime == null ? 'Awaiting lab schedule' : _fmtWhen(collectionTime);
    if (collectorName != null && collectorName.isNotEmpty) {
      colSub = '$colSub · $collectorName';
    }
    return [
      OrderTimelineStep(
        title: 'Order submitted',
        subtitle: 'Received by lab',
        done: r >= 1,
        occurredAt: orderCreated,
      ),
      OrderTimelineStep(
        title: 'Collection scheduled',
        subtitle: colSub,
        done: r >= 2 || collectionTime != null,
        occurredAt: collectionTime,
        actor: collectorName,
      ),
      OrderTimelineStep(
        title: 'Sample running',
        subtitle: runningTime == null ? 'Pending' : _fmtWhen(runningTime),
        done: r >= 4,
        occurredAt: runningTime,
      ),
      OrderTimelineStep(
        title: 'Report out',
        subtitle: reportOutTime == null ? 'Pending' : _fmtWhen(reportOutTime),
        done: r >= 5 || reportOutTime != null,
        occurredAt: reportOutTime,
      ),
    ];
  }

  String _fmtWhen(DateTime dt) {
    return '${dt.year}-${dt.month.toString().padLeft(2, '0')}-${dt.day.toString().padLeft(2, '0')} '
        '${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
  }

  @override
  Future<LabOrderSummary?> getTrackingOrder(String userId) async {
    final r = await http.get(
      Uri.parse('$_base/api/users/$userId/orders?limit=1&page=1'),
      headers: _jsonHeaders(),
    );
    if (r.statusCode >= 400) _throwFromResponse(r);
    final list = jsonDecode(r.body);
    if (list is! List || list.isEmpty) return null;
    final first = _asObj(list.first);
    final id = '${_gv(first, 'id')}';
    if (id.isEmpty) return null;
    return _hydrateOrderSummary(id);
  }

  @override
  Future<LabResultReport?> getLatestResult(String userId) async {
    final r = await http.get(
      Uri.parse('$_base/api/users/$userId/orders?limit=30&page=1'),
      headers: _jsonHeaders(),
    );
    if (r.statusCode >= 400) _throwFromResponse(r);
    final list = jsonDecode(r.body);
    if (list is! List) return null;

    for (final raw in list) {
      final summary = _asObj(raw);
      final status = '${_gv(summary, 'status')}'.toLowerCase();
      if (status != 'completed' && status != 'delivered') continue;
      final id = '${_gv(summary, 'id')}';
      final detail = await http.get(Uri.parse('$_base/api/orders/$id'), headers: _jsonHeaders());
      if (detail.statusCode >= 400) continue;
      final o = _asObj(jsonDecode(detail.body));
      final items = o['items'];
      if (items is! List) continue;
      String? pdf;
      DateTime? released;
      var sampleRef = '';
      for (final it in items) {
        final m = _asObj(it);
        final u = _gv(m, 'download_url') ?? _gv(m, 'downloadUrl');
        if (u != null && '$u'.isNotEmpty) {
          pdf = '$u';
          released = _asDt(_gv(m, 'updated_at') ?? _gv(m, 'updatedAt')) ?? DateTime.now();
          sampleRef = '${_gv(m, 'test_name') ?? _gv(m, 'testName')}'.trim();
          break;
        }
      }
      if (pdf == null) continue;
      if (sampleRef.isEmpty) {
        sampleRef = '${_gv(o, 'description')}'.trim();
      }
      if (sampleRef.isEmpty && id.length >= 8) {
        sampleRef = id.substring(0, 8);
      }
      return LabResultReport(
        orderId: id,
        sampleId: sampleRef.isEmpty ? id : sampleRef,
        releasedAt: released ?? DateTime.now(),
        lines: const [],
        resultPdfUrl: pdf,
      );
    }
    return null;
  }

  @override
  Future<AiAnalysisResult?> getAiAnalysis({
    required String userId,
    required String orderId,
  }) async {
    return null;
  }

  Future<String> _resolveAiConfigId() async {
    final fromEnv = LabApiConfig.aiConfigId.trim();
    if (fromEnv.isNotEmpty) return fromEnv;
    final r = await http.get(Uri.parse('$_base/api/ai-configs'), headers: _jsonHeaders());
    if (r.statusCode >= 400) _throwFromResponse(r);
    final list = jsonDecode(r.body);
    if (list is! List || list.isEmpty) {
      throw LabApiException('No AI configuration found. Ask the lab to add one or set LAB_AI_CONFIG_ID.');
    }
    final m = _asObj(list.first);
    return '${_gv(m, 'id')}';
  }

  @override
  Future<AiAnalysisResult> runAiAnalysis({
    required String userId,
    required String orderId,
  }) async {
    final detail = await http.get(Uri.parse('$_base/api/orders/$orderId'), headers: _jsonHeaders());
    if (detail.statusCode >= 400) _throwFromResponse(detail);
    final o = _asObj(jsonDecode(detail.body));
    final owner = '${_gv(o, 'user_id') ?? _gv(o, 'userId')}';
    if (owner.toLowerCase() != userId.toLowerCase()) {
      throw LabApiException('Order does not belong to the current user.');
    }
    final items = o['items'];
    final buffer = StringBuffer('Lab order $orderId.\n');
    if (items is List) {
      for (final it in items) {
        final m = _asObj(it);
        final u = _gv(m, 'download_url') ?? _gv(m, 'downloadUrl');
        if (u != null && '$u'.isNotEmpty) {
          buffer.writeln('Result PDF: $u');
        }
      }
    }
    final aiId = await _resolveAiConfigId();
    final r = await http.post(
      Uri.parse('$_base/api/conversations'),
      headers: _jsonHeaders(),
      body: jsonEncode({
        'ai_config_id': aiId,
        'message':
            'You are assisting a patient. Summarize these lab results in plain language, note any concerns, and suggest next steps (non-diagnostic). Data:\n${buffer.toString()}',
        'stream': false,
      }),
    );
    if (r.statusCode >= 400) _throwFromResponse(r);
    final map = _asObj(jsonDecode(r.body));
    final reply = '${map['reply'] ?? map['message'] ?? 'No reply from AI.'}';
    return AiAnalysisResult(
      orderId: orderId,
      generatedAt: DateTime.now(),
      summary: reply.length > 160 ? '${reply.substring(0, 157)}...' : reply,
      observation: reply,
      recommendation: 'Discuss these findings with your clinician if you have symptoms or concerns.',
    );
  }

  @override
  Future<void> submitRating({
    required String userId,
    required RatingDraft rating,
  }) async {
    final r = await http.post(
      Uri.parse('$_base/api/ratings'),
      headers: _jsonHeaders(),
      body: jsonEncode({
        'order_id': rating.orderId,
        'user_id': userId,
        'rating': rating.stars,
        'remark': rating.remark,
      }),
    );
    if (r.statusCode >= 400) _throwFromResponse(r);
  }

  @override
  Future<LoyaltySnapshot> getLoyaltySnapshot(String userId) async {
    final me = await http.get(Uri.parse('$_base/api/auth/me'), headers: _jsonHeaders());
    if (me.statusCode >= 400) _throwFromResponse(me);
    final m = _asObj(jsonDecode(me.body));
    final bal = _asInt(_gv(m, 'total_points'));
    return LoyaltySnapshot(balance: bal, entries: const []);
  }

  @override
  Future<void> acceptSchedule({
    required String userId,
    required String orderId,
  }) async {
    final existing = await _fetchSchedule(orderId);
    if (existing == null) {
      throw LabApiException('No schedule from the lab yet.');
    }
    final body = <String, dynamic>{
      'order_id': orderId,
      'collecting_person': _gv(existing, 'collecting_person') ?? _gv(existing, 'collectingPerson'),
      'collection_time': _gv(existing, 'collection_time') ?? _gv(existing, 'collectionTime'),
      'running_time': _gv(existing, 'running_time') ?? _gv(existing, 'runningTime'),
      'report_out_time': _gv(existing, 'report_out_time') ?? _gv(existing, 'reportOutTime'),
      'accepted_by_user': true,
    };
    final r = await http.post(
      Uri.parse('$_base/api/schedules'),
      headers: _jsonHeaders(),
      body: jsonEncode(body),
    );
    if (r.statusCode >= 400) _throwFromResponse(r);
  }

  @override
  void clearAuth() {
    _token = null;
  }
}
