import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';

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

/// Sets multipart `Content-Type` so multer accepts the part (fromBytes otherwise often sends `application/octet-stream`).
MediaType? _prescriptionMediaTypeFromFilename(String filename) {
  final dot = filename.lastIndexOf('.');
  if (dot < 0 || dot >= filename.length - 1) return null;
  switch (filename.substring(dot).toLowerCase()) {
    case '.pdf':
      return MediaType('application', 'pdf');
    case '.png':
      return MediaType('image', 'png');
    case '.jpg':
    case '.jpeg':
      return MediaType('image', 'jpeg');
    case '.webp':
      return MediaType('image', 'webp');
    default:
      return null;
  }
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

  String _absoluteUrl(String url) {
    final trimmed = url.trim();
    if (trimmed.isEmpty) return trimmed;
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
    if (trimmed.startsWith('/')) return '$_base$trimmed';
    return '$_base/$trimmed';
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

  List<LabTestDiscount> _parseDiscountList(dynamic raw) {
    if (raw is! List) return const [];
    final out = <LabTestDiscount>[];
    for (final e in raw) {
      final m = _asObj(e);
      final role = '${_gv(m, 'role')}'.trim();
      if (role.isEmpty) continue;
      final pct = _asInt(_gv(m, 'discount_percent') ?? _gv(m, 'discountPercent')).clamp(0, 100);
      out.add(LabTestDiscount(role: role, discountPercent: pct));
    }
    return out;
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
      address: '${_gv(m, 'address') ?? ''}'.trim(),
      latitude: _asDouble(_gv(m, 'latitude')),
      longitude: _asDouble(_gv(m, 'longitude')),
    );
  }

  @override
  Future<void> register(RegisterRequest request) async {
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
  Future<AppUser> updateProfile({
    required String userId,
    String? name,
    String? phone,
    String? email,
    String? address,
    double? latitude,
    double? longitude,
  }) async {
    final body = <String, dynamic>{};
    if (name != null) body['name'] = name;
    if (phone != null) body['phone'] = phone;
    if (email != null) body['email'] = email;
    if (address != null) body['address'] = address;
    if (latitude != null) body['latitude'] = latitude;
    if (longitude != null) body['longitude'] = longitude;
    final r = await http.put(
      Uri.parse('$_base/api/users/$userId'),
      headers: _jsonHeaders(),
      body: jsonEncode(body),
    );
    if (r.statusCode >= 400) _throwFromResponse(r);
    final map = _asObj(jsonDecode(r.body));
    return _userFromMe(map);
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
        discounts: _parseDiscountList(m['discounts']),
      );
    }).toList();
  }

  double _roundMoney(double v) => (v * 100).round() / 100.0;

  /// Body for `POST /api/orders` — matches `orderController.createOrder` / admin web `createOrder`.
  Map<String, dynamic> _orderCreateBody({
    required String userId,
    required LabOrderRequest request,
    required List<CatalogOrderLine> lines,
  }) {
    final original = lines.isEmpty
        ? 0.0
        : _roundMoney(lines.fold<double>(0, (a, b) => a + b.unitPriceMmk));
    final finalSum = lines.isEmpty
        ? 0.0
        : _roundMoney(lines.fold<double>(0, (a, b) => a + b.subtotalMmk));
    final blended =
        original > 0 ? _roundMoney((1 - finalSum / original) * 100) : 0.0;

    return {
      'user_id': userId,
      'priority': request.priority.name,
      'patient_name': request.patientName,
      'patient_age': request.age,
      'patient_phone': request.phone,
      'address': request.address.line,
      'latitude': request.address.latitude,
      'longitude': request.address.longitude,
      'report_delivery_method': request.reportDeliveryMethod,
      'description': _composeDescription(request),
      'status': 'pending',
      'original_price_mmk': original,
      'final_price_mmk': finalSum,
      'discount_percent': blended,
      'items': lines.map((e) => e.toItemJson()).toList(),
    };
  }

  void _applyOrderFieldsToMultipart(
    http.MultipartRequest mp,
    Map<String, dynamic> body,
  ) {
    for (final entry in body.entries) {
      final key = entry.key;
      final value = entry.value;
      if (key == 'items') {
        mp.fields[key] = jsonEncode(value);
      } else if (value is num) {
        mp.fields[key] = value is int ? '$value' : '$value';
      } else {
        mp.fields[key] = '$value';
      }
    }
  }

  @override
  Future<LabOrderSummary> createOrder({
    required String userId,
    required LabOrderRequest request,
  }) async {
    final lines = request.catalogLines;
    final hasFile = request.prescriptionBytes != null &&
        request.prescriptionBytes!.isNotEmpty &&
        (request.prescriptionFilename ?? '').trim().isNotEmpty;

    if (lines.isEmpty && !hasFile) {
      throw LabApiException('Choose one or more tests, or upload a prescription (PDF or image).');
    }
    if (lines.isNotEmpty && hasFile) {
      throw LabApiException('Choose either tests from the catalog or a prescription upload — not both.');
    }

    final body = _orderCreateBody(userId: userId, request: request, lines: lines);

    final http.Response r;
    if (hasFile) {
      final mp = http.MultipartRequest('POST', Uri.parse('$_base/api/orders'));
      if (_token != null) {
        mp.headers['Authorization'] = 'Bearer $_token';
      }
      mp.headers['Accept'] = 'application/json';
      _applyOrderFieldsToMultipart(mp, body);

      final rawName = request.prescriptionFilename!.trim();
      final shortName = rawName.contains('/') ? rawName.split('/').last : rawName.split(r'\').last;
      final nameForPart = shortName.isEmpty ? 'prescription' : shortName;
      final contentType = _prescriptionMediaTypeFromFilename(nameForPart);
      mp.files.add(
        http.MultipartFile.fromBytes(
          'prescription',
          request.prescriptionBytes!,
          filename: nameForPart,
          contentType: contentType,
        ),
      );

      final streamed = await mp.send();
      r = await http.Response.fromStream(streamed);
    } else {
      r = await http.post(
        Uri.parse('$_base/api/orders'),
        headers: _jsonHeaders(),
        body: jsonEncode(body),
      );
    }

    if (r.statusCode >= 400) _throwFromResponse(r);
    final created = _asObj(jsonDecode(r.body));
    final id = '${_gv(created, 'id')}';
    return _hydrateOrderSummary(id);
  }

  /// Maps to API `description` (single `lab_orders.description` column). Catalog lines live in `items` JSON only.
  String _composeDescription(LabOrderRequest request) {
    final buf = StringBuffer();
    final notes = request.description.trim();
    if (notes.isNotEmpty) {
      buf.writeln(notes);
    }
    final extras = <String>[];
    if (request.labFacility.trim().isNotEmpty) {
      extras.add('Facility / collection notes: ${request.labFacility.trim()}');
    }
    extras.add(
      'Gender: ${request.gender} · Blood type: ${request.bloodType.trim().isEmpty ? '—' : request.bloodType.trim()}',
    );
    extras.add(
      'Preferred collection: ${request.preferredDate.toIso8601String().split('T').first} · ${request.timeSlot.trim().isEmpty ? '—' : request.timeSlot.trim()}',
    );
    if (request.catalogLines.isEmpty && request.prescriptionBytes != null && request.prescriptionBytes!.isNotEmpty) {
      extras.add('Order path: prescription upload (catalog tests to be assigned by lab).');
    }
    if (buf.isNotEmpty) buf.writeln();
    buf.write(extras.join('\n'));
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

    final lineItems = _parseOrderLineItems(o['items']);
    String testLabel = 'Lab test';
    if (lineItems.isNotEmpty) {
      if (lineItems.length == 1) {
        testLabel = lineItems.first.testName;
      } else {
        testLabel = '${lineItems.length} tests';
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
      lineItems: lineItems,
    );
  }

  List<OrderLineSummary> _parseOrderLineItems(dynamic raw) {
    if (raw == null) return const [];
    var list = raw;
    if (raw is String) {
      try {
        list = jsonDecode(raw);
      } catch (_) {
        return const [];
      }
    }
    if (list is! List) return const [];
    final out = <OrderLineSummary>[];
    for (final entry in list) {
      final m = _asObj(entry);
      final testId = '${_gv(m, 'test_id') ?? _gv(m, 'testId')}';
      if (testId.isEmpty) continue;
      final nested = m['test'];
      String name = '${_gv(m, 'test_name') ?? _gv(m, 'testName') ?? ''}'.trim();
      String code = '${_gv(m, 'test_code') ?? _gv(m, 'testCode') ?? ''}'.trim();
      if (name.isEmpty && nested is Map) {
        final tm = _asObj(nested);
        name = '${_gv(tm, 'test_name') ?? _gv(tm, 'testName') ?? 'Test'}'.trim();
        code = '${_gv(tm, 'test_code') ?? _gv(tm, 'testCode') ?? ''}'.trim();
      }
      if (name.isEmpty) name = 'Test';
      out.add(
        OrderLineSummary(
          testId: testId,
          testName: name,
          testCode: code,
          quantity: _asInt(_gv(m, 'quantity'), 1),
          subtotalMmk: _asDouble(_gv(m, 'subtotal_mmk') ?? _gv(m, 'subtotalMmk')),
        ),
      );
    }
    return out;
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
  Future<List<LabOrderSummary>> listActiveOrders(
    String userId, {
    String excludeStatus = 'delivered',
    int limit = 50,
    int page = 1,
  }) async {
    final exclude = Uri.encodeQueryComponent(excludeStatus.trim().toLowerCase());
    final r = await http.get(
      Uri.parse('$_base/api/users/$userId/orders?exclude_status=$exclude&limit=$limit&page=$page'),
      headers: _jsonHeaders(),
    );
    if (r.statusCode >= 400) _throwFromResponse(r);
    final list = jsonDecode(r.body);
    if (list is! List) return const [];
    final out = <LabOrderSummary>[];
    for (final raw in list) {
      final row = _asObj(raw);
      final summary = _mapListRowToSummary(row);
      if (summary != null) out.add(summary);
    }
    return out;
  }

  LabOrderSummary? _mapListRowToSummary(Map<String, dynamic> row) {
    final id = '${_gv(row, 'id')}';
    if (id.isEmpty) return null;
    final userId = '${_gv(row, 'user_id') ?? _gv(row, 'userId')}';
    final patientName = '${_gv(row, 'patient_name') ?? _gv(row, 'patientName') ?? ''}';
    final desc = '${_gv(row, 'description') ?? ''}';
    final priorityRaw = '${_gv(row, 'priority') ?? 'elective'}'.toLowerCase();
    final priority = priorityRaw == 'urgent' ? OrderPriority.urgent : OrderPriority.elective;
    final addressLine = '${_gv(row, 'address') ?? ''}';
    final lat = _asDouble(_gv(row, 'latitude'));
    final lng = _asDouble(_gv(row, 'longitude'));
    final createdAt = _asDt(_gv(row, 'created_at') ?? _gv(row, 'createdAt')) ?? DateTime.now();
    final createdLabel =
        '${createdAt.year}-${createdAt.month.toString().padLeft(2, '0')}-${createdAt.day.toString().padLeft(2, '0')}';
    final status = '${_gv(row, 'status') ?? 'pending'}'.toLowerCase();
    final timeline = _buildTimeline(status, createdAt, null, null, null, null);
    return LabOrderSummary(
      id: id,
      userId: userId,
      patientName: patientName,
      testType: desc.trim().isEmpty ? 'Lab test' : desc.split('\n').first.trim(),
      description: desc,
      priority: priority,
      address: LabAddress(line: addressLine, latitude: lat, longitude: lng),
      createdAt: createdAt,
      timeline: timeline,
      createdAtLabel: createdLabel,
      backendStatus: status,
    );
  }

  @override
  Future<LabOrderSummary> getOrderSummary(String orderId) => _hydrateOrderSummary(orderId);

  @override
  Future<List<LabOrderSummary>> listReleasedOrders(
    String userId, {
    int limit = 50,
    int page = 1,
  }) async {
    final r = await http.get(
      Uri.parse('$_base/api/users/$userId/orders?status=delivered&limit=$limit&page=$page'),
      headers: _jsonHeaders(),
    );
    if (r.statusCode >= 400) _throwFromResponse(r);
    final list = jsonDecode(r.body);
    if (list is! List) return const [];
    final out = <LabOrderSummary>[];
    for (final raw in list) {
      final row = _asObj(raw);
      final summary = _mapListRowToSummary(row);
      if (summary != null) out.add(summary);
    }
    return out;
  }

  LabResultReport _mapOrderDetailToResult(Map<String, dynamic> o, String orderId) {
    final items = o['items'];
    String? pdf;
    String? resultTestId;
    DateTime? released;
    var sampleRef = '';
    if (items is List) {
      for (final it in items) {
        final m = _asObj(it);
        final u = _gv(m, 'download_url') ?? _gv(m, 'downloadUrl');
        final fileKey = _gv(m, 'result_file_url') ?? _gv(m, 'resultFileUrl');
        if ((u != null && '$u'.isNotEmpty) || (fileKey != null && '$fileKey'.isNotEmpty)) {
          pdf = u != null && '$u'.isNotEmpty ? '$u' : null;
          resultTestId = '${_gv(m, 'test_id') ?? _gv(m, 'testId')}'.trim();
          if (resultTestId.isEmpty) resultTestId = null;
          released = _asDt(_gv(m, 'updated_at') ?? _gv(m, 'updatedAt')) ?? DateTime.now();
          sampleRef = '${_gv(m, 'test_name') ?? _gv(m, 'testName')}'.trim();
          break;
        }
      }
    }
    if (sampleRef.isEmpty) {
      sampleRef = '${_gv(o, 'description')}'.trim();
    }
    if (sampleRef.isEmpty) {
      sampleRef = '${_gv(o, 'patient_name') ?? _gv(o, 'patientName') ?? ''}'.trim();
    }
    if (sampleRef.isEmpty && orderId.length >= 8) {
      sampleRef = orderId.substring(0, 8);
    }
    return LabResultReport(
      orderId: orderId,
      sampleId: sampleRef.isEmpty ? orderId : sampleRef,
      releasedAt: released ?? DateTime.now(),
      lines: const [],
      resultPdfUrl: pdf,
      resultTestId: resultTestId,
    );
  }

  @override
  Future<List<int>> downloadResultPdf({
    required String orderId,
    required String testId,
  }) async {
    final r = await http.get(
      Uri.parse('$_base/api/orders/$orderId/tests/$testId/result-file'),
      headers: _jsonHeaders(),
    );
    if (r.statusCode >= 400) _throwFromResponse(r);
    if (r.bodyBytes.isEmpty) {
      throw LabApiException('The report file is empty.');
    }
    return r.bodyBytes;
  }

  @override
  Future<LabResultReport?> getResultForOrder({
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
    final status = '${_gv(o, 'status')}'.toLowerCase();
    if (status != 'delivered') return null;
    return _mapOrderDetailToResult(o, orderId);
  }

  @override
  Future<LabOrderSummary?> getTrackingOrder(String userId) async {
    final active = await listActiveOrders(userId, limit: 1, page: 1);
    if (active.isEmpty) return null;
    return getOrderSummary(active.first.id);
  }

  @override
  Future<LabResultReport?> getLatestResult(String userId) async {
    final released = await listReleasedOrders(userId, limit: 30);
    for (final order in released) {
      final report = await getResultForOrder(userId: userId, orderId: order.id);
      if (report?.resultTestId != null ||
          (report?.resultPdfUrl != null && report!.resultPdfUrl!.isNotEmpty)) {
        return report;
      }
    }
    return null;
  }

  bool _historyMessageMatchesOrder(String userMessage, String orderId) {
    try {
      final parsed = jsonDecode(userMessage);
      if (parsed is! Map) return false;
      final m = _asObj(parsed);
      final oid = '${_gv(m, 'order_id') ?? _gv(m, 'orderId')}';
      return oid.toLowerCase() == orderId.toLowerCase();
    } catch (_) {
      return userMessage.toLowerCase().contains(orderId.toLowerCase());
    }
  }

  AiAnalysisResult _mapConversationToAnalysis({
    required String orderId,
    required String reply,
    DateTime? generatedAt,
  }) {
    final trimmed = reply.trim();
    return AiAnalysisResult(
      orderId: orderId,
      generatedAt: generatedAt ?? DateTime.now(),
      summary: trimmed.length > 160 ? '${trimmed.substring(0, 157)}...' : trimmed,
      observation: trimmed,
      recommendation: 'Discuss these findings with your clinician if you have symptoms or concerns.',
    );
  }

  @override
  Future<AiAnalysisResult?> getAiAnalysis({
    required String userId,
    required String orderId,
  }) async {
    try {
      final r = await http.get(
        Uri.parse('$_base/api/conversations/history?limit=50'),
        headers: _jsonHeaders(),
      );
      if (r.statusCode >= 400) return null;
      final list = jsonDecode(r.body);
      if (list is! List) return null;

      for (var i = list.length - 1; i >= 0; i--) {
        final m = _asObj(list[i]);
        final userMsg = '${_gv(m, 'user_message') ?? _gv(m, 'userMessage') ?? ''}';
        final reply = '${_gv(m, 'ai_response') ?? _gv(m, 'aiResponse') ?? ''}'.trim();
        if (reply.isEmpty || !_historyMessageMatchesOrder(userMsg, orderId)) continue;
        return _mapConversationToAnalysis(
          orderId: orderId,
          reply: reply,
          generatedAt: _asDt(_gv(m, 'created_at') ?? _gv(m, 'createdAt')),
        );
      }
    } catch (_) {
      /* optional cache */
    }
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
    final promptId = LabApiConfig.labResultSummarizedPromptId.trim();
    if (promptId.isEmpty) {
      throw LabApiException(
        'Lab result summary prompt is not configured. Set LAB_RESULT_SUMMARIZED_PROMPT_ID.',
      );
    }

    final detail = await http.get(Uri.parse('$_base/api/orders/$orderId'), headers: _jsonHeaders());
    if (detail.statusCode >= 400) _throwFromResponse(detail);
    final o = _asObj(jsonDecode(detail.body));
    final owner = '${_gv(o, 'user_id') ?? _gv(o, 'userId')}';
    if (owner.toLowerCase() != userId.toLowerCase()) {
      throw LabApiException('Order does not belong to the current user.');
    }
    final tests = <Map<String, dynamic>>[];
    final items = o['items'];
    if (items is List) {
      for (final it in items) {
        final m = _asObj(it);
        final url = _gv(m, 'download_url') ?? _gv(m, 'downloadUrl');
        if (url == null || '$url'.isEmpty) continue;
        tests.add({
          'test_id': _gv(m, 'test_id') ?? _gv(m, 'testId'),
          'test_name': _gv(m, 'test_name') ?? _gv(m, 'testName'),
          'test_code': _gv(m, 'test_code') ?? _gv(m, 'testCode'),
          'result_pdf_url': '$url',
        });
      }
    }
    if (tests.isEmpty) {
      throw LabApiException('No result PDF is available for this order yet.');
    }

    final message = jsonEncode({
      'order_id': orderId,
      'patient_name': _gv(o, 'patient_name') ?? _gv(o, 'patientName'),
      'tests': tests,
    });
    final aiId = await _resolveAiConfigId();

    List<int>? pdfBytes;
    final firstTestId = '${tests.first['test_id']}'.trim();
    if (firstTestId.isNotEmpty) {
      try {
        pdfBytes = await downloadResultPdf(orderId: orderId, testId: firstTestId);
      } catch (_) {
        /* fall back to URL fetch below */
      }
    }
    if (pdfBytes == null) {
      final firstPdfUrl = '${tests.first['result_pdf_url']}';
      if (firstPdfUrl.isNotEmpty) {
        try {
          final pdfRes = await http.get(Uri.parse(_absoluteUrl(firstPdfUrl)), headers: _jsonHeaders());
          if (pdfRes.statusCode < 400 && pdfRes.bodyBytes.isNotEmpty) {
            pdfBytes = pdfRes.bodyBytes;
          }
        } catch (_) {
          /* fall back to URL-only message */
        }
      }
    }

    final http.Response r;
    if (pdfBytes != null) {
      final mp = http.MultipartRequest('POST', Uri.parse('$_base/api/conversations'));
      if (_token != null) {
        mp.headers['Authorization'] = 'Bearer $_token';
      }
      mp.headers['Accept'] = 'application/json';
      mp.fields['ai_config_id'] = aiId;
      mp.fields['prompt_id'] = promptId;
      mp.fields['message'] = message;
      mp.fields['stream'] = 'false';
      mp.files.add(
        http.MultipartFile.fromBytes(
          'file',
          pdfBytes,
          filename: 'lab-result.pdf',
          contentType: MediaType('application', 'pdf'),
        ),
      );
      final streamed = await mp.send();
      r = await http.Response.fromStream(streamed);
    } else {
      r = await http.post(
        Uri.parse('$_base/api/conversations'),
        headers: _jsonHeaders(),
        body: jsonEncode({
          'ai_config_id': aiId,
          'prompt_id': promptId,
          'message': message,
          'stream': false,
        }),
      );
    }

    if (r.statusCode >= 400) _throwFromResponse(r);
    final map = _asObj(jsonDecode(r.body));
    final reply = '${map['reply'] ?? map['message'] ?? ''}'.trim();
    if (reply.isEmpty) {
      throw LabApiException('No text returned from AI.');
    }
    return _mapConversationToAnalysis(orderId: orderId, reply: reply);
  }

  OrderRatingSummary? _parseRatingSummary(dynamic raw) {
    final m = _asObj(raw);
    final id = '${_gv(m, 'id')}';
    final orderId = '${_gv(m, 'order_id') ?? _gv(m, 'orderId')}';
    if (id.isEmpty || orderId.isEmpty) return null;
    return OrderRatingSummary(
      id: id,
      orderId: orderId,
      stars: _asInt(_gv(m, 'rating'), 0),
      remark: '${_gv(m, 'remark') ?? ''}',
      createdAt: _asDt(_gv(m, 'created_at') ?? _gv(m, 'createdAt')) ?? DateTime.now(),
    );
  }

  @override
  Future<List<OrderRatingSummary>> listUserRatings(
    String userId, {
    int limit = 100,
    int page = 1,
  }) async {
    final r = await http.get(
      Uri.parse('$_base/api/ratings?user_id=$userId&limit=$limit&page=$page'),
      headers: _jsonHeaders(),
    );
    if (r.statusCode >= 400) _throwFromResponse(r);
    final list = jsonDecode(r.body);
    if (list is! List) return const [];
    final out = <OrderRatingSummary>[];
    for (final raw in list) {
      final parsed = _parseRatingSummary(raw);
      if (parsed != null) out.add(parsed);
    }
    return out;
  }

  @override
  Future<OrderRatingSummary?> getOrderRating(String orderId) async {
    final r = await http.get(
      Uri.parse('$_base/api/ratings/order/$orderId'),
      headers: _jsonHeaders(),
    );
    if (r.statusCode == 404) return null;
    if (r.statusCode >= 400) _throwFromResponse(r);
    return _parseRatingSummary(jsonDecode(r.body));
  }

  @override
  Future<OrderRatingSummary> submitRating({
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
    final saved = _parseRatingSummary(jsonDecode(r.body));
    if (saved == null) {
      throw LabApiException('Rating saved but response was invalid.');
    }
    return saved;
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
