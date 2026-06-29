import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';

import '../config/lab_api_config.dart';
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
  String _localeCode = 'en';

  @override
  void setLocaleCode(String? localeCode) {
    _localeCode = localeCode == 'my' ? 'my' : 'en';
  }

  @override
  String? get accessToken => _token;

  @override
  void setAccessToken(String? token) {
    final t = token?.trim();
    _token = (t == null || t.isEmpty) ? null : t;
  }
  Map<String, String>? _collectorProfileImageByName;
  Map<String, LabCollectorPick>? _collectorById;

  @override
  Future<List<LabCollectorPick>> listActiveCollectors() async {
    await _ensureCollectorDirectory();
    return _collectorById?.values.toList(growable: false) ?? const [];
  }

  Future<void> _ensureCollectorDirectory() async {
    if (_collectorById != null) return;
    _collectorById = {};
    _collectorProfileImageByName = {};
    try {
      final r = await http.get(
        Uri.parse('$_base/api/staff?role=collector&is_active=true'),
        headers: _jsonHeaders(),
      );
      if (r.statusCode >= 400) return;
      final data = jsonDecode(r.body);
      if (data is! List) return;
      for (final entry in data) {
        final m = _asObj(entry);
        final id = '${_gv(m, 'id')}'.trim();
        final name = '${_gv(m, 'name')}'.trim();
        final urlRaw = '${_gv(m, 'profile_image_url') ?? ''}'.trim();
        if (id.isEmpty || name.isEmpty) continue;
        final imageUrl = urlRaw.isEmpty ? null : _absoluteUrl(urlRaw);
        final pick = LabCollectorPick(id: id, name: name, profileImageUrl: imageUrl);
        _collectorById![id.toLowerCase()] = pick;
        _collectorProfileImageByName![name.toLowerCase()] = imageUrl ?? '';
      }
    } catch (_) {}
  }

  String? _profileUrlFromSchedule(Map<String, dynamic> sched) {
    for (final key in [
      'collector_profile_image_url',
      'collecting_person_profile_image_url',
      'profile_image_url',
    ]) {
      final raw = '${_gv(sched, key) ?? ''}'.trim();
      if (raw.isNotEmpty) return _absoluteUrl(raw);
    }
    return null;
  }

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

  Map<String, String> _jsonHeaders({bool withAuth = true, bool noCache = false}) {
    final h = <String, String>{'Content-Type': 'application/json', 'Accept': 'application/json'};
    if (noCache) {
      h['Cache-Control'] = 'no-cache';
      h['Pragma'] = 'no-cache';
    }
    if (withAuth && _token != null) {
      h['Authorization'] = 'Bearer $_token';
    }
    h['Accept-Language'] = _localeCode;
    return h;
  }

  dynamic _decodeResponseJson(http.Response r) {
    final body = r.body.trim();
    if (body.isEmpty) {
      if (r.statusCode == 304) return <dynamic>[];
      throw LabApiException('Empty response (${r.statusCode})', r.statusCode);
    }
    return jsonDecode(body);
  }

  Uri _userOrdersUri(
    String userId, {
    String? status,
    String? excludeStatus,
    String sortBy = 'created_at',
    String sortOrder = 'DESC',
    int limit = 50,
    int page = 1,
  }) {
    final q = <String, String>{
      'limit': '$limit',
      'page': '$page',
      'sortBy': sortBy,
      'sortOrder': sortOrder.toUpperCase(),
    };
    if (status != null && status.trim().isNotEmpty) {
      q['status'] = status.trim().toLowerCase();
    }
    if (excludeStatus != null && excludeStatus.trim().isNotEmpty) {
      q['exclude_status'] = excludeStatus.trim().toLowerCase();
    }
    return Uri.parse('$_base/api/users/$userId/orders').replace(queryParameters: q);
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
      case 'phlebotomist':
        return UserRole.phlebotomist;
      default:
        return UserRole.patient;
    }
  }

  String? _profileImageUrlFrom(dynamic raw) {
    final urlRaw = '${raw ?? ''}'.trim();
    if (urlRaw.isEmpty) return null;
    if (urlRaw.startsWith('http://') || urlRaw.startsWith('https://') || urlRaw.startsWith('/')) {
      return _absoluteUrl(urlRaw);
    }
    final segments = urlRaw.replaceFirst(RegExp(r'^/+'), '').split('/').map(Uri.encodeComponent).join('/');
    return '$_base/api/media/$segments';
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
      profileImageUrl: _profileImageUrlFrom(_gv(m, 'profile_image_url') ?? _gv(m, 'profileImageUrl')),
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
  Future<AppUser> getCurrentUser() async {
    if (_token == null || _token!.isEmpty) {
      throw LabApiException('Not signed in');
    }
    final me = await http.get(Uri.parse('$_base/api/auth/me'), headers: _jsonHeaders());
    if (me.statusCode >= 400) _throwFromResponse(me);
    return _userFromMe(_asObj(jsonDecode(me.body)));
  }

  @override
  Future<AppUser> login(LoginRequest request) async {
    final r = await http.post(
      Uri.parse('$_base/api/auth/login/user'),
      headers: _jsonHeaders(withAuth: false),
      body: jsonEncode({
        'email': request.email.trim().toLowerCase(),
        'password': request.password,
        'remember': request.remember,
      }),
    );
    if (r.statusCode >= 400) _throwFromResponse(r);
    final map = _asObj(jsonDecode(r.body));
    _token = map['token']?.toString();
    if (_token == null || _token!.isEmpty) {
      throw LabApiException('Login response missing token');
    }
    return getCurrentUser();
  }

  String _messageFromJsonMap(Map<String, dynamic> map, String fallback) {
    final m = map['message'] ?? map['error'];
    if (m != null && '$m'.trim().isNotEmpty) return '$m'.trim();
    return fallback;
  }

  @override
  Future<String> requestPasswordReset(String email) async {
    final r = await http.post(
      Uri.parse('$_base/api/auth/forgot-password'),
      headers: _jsonHeaders(withAuth: false),
      body: jsonEncode({'email': email.trim().toLowerCase()}),
    );
    if (r.statusCode >= 400) _throwFromResponse(r);
    final map = _asObj(jsonDecode(r.body));
    return _messageFromJsonMap(map, 'A verification code has been sent to your email.');
  }

  @override
  Future<String> resetPasswordWithCode({
    required String email,
    required String code,
    required String newPassword,
  }) async {
    final r = await http.post(
      Uri.parse('$_base/api/auth/reset-password'),
      headers: _jsonHeaders(withAuth: false),
      body: jsonEncode({
        'email': email.trim().toLowerCase(),
        'code': code.trim(),
        'new_password': newPassword,
      }),
    );
    if (r.statusCode >= 400) _throwFromResponse(r);
    final map = _asObj(jsonDecode(r.body));
    return _messageFromJsonMap(map, 'Password has been reset successfully.');
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
  Future<AppUser> uploadProfileImage({
    required String userId,
    required List<int> bytes,
    required String filename,
  }) async {
    final mp = http.MultipartRequest('POST', Uri.parse('$_base/api/users/$userId/profile-image'));
    if (_token != null) {
      mp.headers['Authorization'] = 'Bearer $_token';
    }
    mp.headers['Accept'] = 'application/json';
    final rawName = filename.trim();
    final shortName = rawName.contains('/') ? rawName.split('/').last : rawName.split(r'\').last;
    final nameForPart = shortName.isEmpty ? 'profile.jpg' : shortName;
    mp.files.add(
      http.MultipartFile.fromBytes(
        'image',
        bytes,
        filename: nameForPart,
        contentType: _prescriptionMediaTypeFromFilename(nameForPart),
      ),
    );
    final streamed = await mp.send();
    final r = await http.Response.fromStream(streamed);
    if (r.statusCode >= 400) _throwFromResponse(r);
    final map = _asObj(jsonDecode(r.body));
    final userRaw = map['user'];
    if (userRaw is Map) {
      return _userFromMe(_asObj(userRaw));
    }
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
      if (request.collectorId != null && request.collectorId!.trim().isNotEmpty)
        'collector_id': request.collectorId!.trim(),
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
    await _ensureCollectorDirectory();
    final r = await http.get(Uri.parse('$_base/api/orders/$orderId'), headers: _jsonHeaders());
    if (r.statusCode >= 400) _throwFromResponse(r);
    final o = _asObj(jsonDecode(r.body));
    final sched = o['schedule'] != null ? _asObj(o['schedule']) : await _fetchSchedule(orderId);
    final summary = _mapOrderToSummary(o, sched);
    final collectorImageUrl = summary.collectorProfileImageUrl ??
        await _resolveCollectorProfileImageUrl(summary.collectorName, sched);
    if (collectorImageUrl == null) return summary;
    return LabOrderSummary(
      id: summary.id,
      userId: summary.userId,
      patientName: summary.patientName,
      testType: summary.testType,
      description: summary.description,
      priority: summary.priority,
      address: summary.address,
      createdAt: summary.createdAt,
      timeline: summary.timeline,
      createdAtLabel: summary.createdAtLabel,
      collectionAcceptedAt: summary.collectionAcceptedAt,
      collectorName: summary.collectorName,
      collectorProfileImageUrl: collectorImageUrl,
      runningAt: summary.runningAt,
      reportOutAt: summary.reportOutAt,
      scheduleAcceptedByUser: summary.scheduleAcceptedByUser,
      backendStatus: summary.backendStatus,
      lineItems: summary.lineItems,
    );
  }

  Future<void> _ensureCollectorProfileCache() async {
    await _ensureCollectorDirectory();
  }

  Future<String?> _resolveCollectorProfileImageUrl(
    String? collectorName,
    Map<String, dynamic>? sched,
  ) async {
    if (sched != null) {
      for (final key in [
        'collector_profile_image_url',
        'collecting_person_profile_image_url',
        'profile_image_url',
      ]) {
        final raw = '${_gv(sched, key) ?? ''}'.trim();
        if (raw.isNotEmpty) return _absoluteUrl(raw);
      }
    }
    if (collectorName == null || collectorName.trim().isEmpty) return null;
    await _ensureCollectorProfileCache();
    return _collectorProfileImageByName![collectorName.trim().toLowerCase()];
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
    var collectorName = rawCollector.isEmpty ? null : rawCollector;
    var collectorImageUrl = sched == null
        ? null
        : _profileUrlFromSchedule(sched);

    final preferredCollectorId = '${_gv(o, 'collector_id') ?? ''}'.trim();
    if (collectorName == null && preferredCollectorId.isNotEmpty) {
      final preferred = _collectorById?[preferredCollectorId.toLowerCase()];
      if (preferred != null) {
        collectorName = preferred.name;
        collectorImageUrl = preferred.profileImageUrl;
      }
    }

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
      collectorProfileImageUrl: collectorImageUrl,
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
    String sortBy = 'created_at',
    String sortOrder = 'DESC',
    int limit = 50,
    int page = 1,
  }) async {
    final r = await http.get(
      _userOrdersUri(
        userId,
        excludeStatus: excludeStatus,
        sortBy: sortBy,
        sortOrder: sortOrder,
        limit: limit,
        page: page,
      ),
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
    String sortBy = 'updated_at',
    String sortOrder = 'DESC',
    int limit = 50,
    int page = 1,
  }) async {
    final r = await http.get(
      _userOrdersUri(
        userId,
        status: 'delivered',
        sortBy: sortBy,
        sortOrder: sortOrder,
        limit: limit,
        page: page,
      ),
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
    final tests = <LabResultTestItem>[];
    DateTime? latestReleased;
    final patientName = '${_gv(o, 'patient_name') ?? _gv(o, 'patientName') ?? ''}'.trim();
    final patientPhone = '${_gv(o, 'patient_phone') ?? _gv(o, 'patientPhone') ?? ''}'.trim();
    final patientAgeRaw = _gv(o, 'patient_age') ?? _gv(o, 'patientAge');
    final patientAge = patientAgeRaw == null ? null : int.tryParse('$patientAgeRaw');
    var sampleRef = patientName;

    if (items is List) {
      for (final it in items) {
        final m = _asObj(it);
        final testId = '${_gv(m, 'test_id') ?? _gv(m, 'testId')}'.trim();
        if (testId.isEmpty) continue;

        var name = '${_gv(m, 'test_name') ?? _gv(m, 'testName') ?? ''}'.trim();
        var code = '${_gv(m, 'test_code') ?? _gv(m, 'testCode') ?? ''}'.trim();
        var category = '${_gv(m, 'category') ?? ''}'.trim();
        final nested = m['test'];
        if (nested is Map) {
          final tm = _asObj(nested);
          if (name.isEmpty) {
            name = '${_gv(tm, 'test_name') ?? _gv(tm, 'testName') ?? ''}'.trim();
          }
          if (code.isEmpty) {
            code = '${_gv(tm, 'test_code') ?? _gv(tm, 'testCode') ?? ''}'.trim();
          }
          if (category.isEmpty) {
            category = '${_gv(tm, 'category') ?? ''}'.trim();
          }
        }
        if (name.isEmpty) name = 'Lab test';

        final url = _gv(m, 'download_url') ?? _gv(m, 'downloadUrl');
        final fileKey = _gv(m, 'result_file_url') ?? _gv(m, 'resultFileUrl');
        final pdfGroupId =
            '${_gv(m, 'result_pdf_group_id') ?? _gv(m, 'resultPdfGroupId') ?? ''}'.trim();
        final pdfDisplaySoloRaw = _gv(m, 'result_pdf_display_solo') ?? _gv(m, 'resultPdfDisplaySolo');
        final pdfDisplaySolo = pdfDisplaySoloRaw == true ||
            pdfDisplaySoloRaw == 1 ||
            '$pdfDisplaySoloRaw'.toLowerCase() == 'true';
        final released = _asDt(_gv(m, 'updated_at') ?? _gv(m, 'updatedAt'));
        if (released != null) {
          if (latestReleased == null || released.isAfter(latestReleased)) {
            latestReleased = released;
          }
        }

        tests.add(
          LabResultTestItem(
            testId: testId,
            testName: name,
            testCode: code,
            category: category,
            pdfUrl: (url != null && '$url'.isNotEmpty)
                ? '$url'
                : (fileKey != null && '$fileKey'.isNotEmpty ? fileKey.toString() : null),
            pdfGroupId: pdfGroupId.isEmpty ? null : pdfGroupId,
            pdfDisplaySolo: pdfDisplaySolo,
            releasedAt: released,
          ),
        );
      }
    }

    if (sampleRef.isEmpty) {
      sampleRef = '${_gv(o, 'description')}'.trim();
    }
    if (sampleRef.isEmpty && orderId.length >= 8) {
      sampleRef = orderId.substring(0, 8);
    }

    final withPdf = tests.where((t) => t.hasPdf).toList();
    final firstPdf = withPdf.isNotEmpty ? withPdf.first : null;

    return LabResultReport(
      orderId: orderId,
      sampleId: sampleRef.isEmpty ? orderId : sampleRef,
      releasedAt: latestReleased ?? DateTime.now(),
      patientName: patientName,
      patientAge: patientAge,
      patientPhone: patientPhone,
      tests: tests,
      lines: const [],
      resultPdfUrl: firstPdf?.pdfUrl,
      resultTestId: firstPdf?.testId,
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
      if (report != null && report.hasPdfPayload) {
        return report;
      }
    }
    return null;
  }

  bool _historyMessageMatches({
    required String userMessage,
    required String orderId,
    String? testId,
  }) {
    try {
      final parsed = jsonDecode(userMessage);
      if (parsed is! Map) return false;
      final m = _asObj(parsed);
      final oid = '${_gv(m, 'order_id') ?? _gv(m, 'orderId')}';
      if (oid.toLowerCase() != orderId.toLowerCase()) return false;
      final tid = testId?.trim();
      if (tid != null && tid.isNotEmpty) {
        final msgTestId = '${_gv(m, 'test_id') ?? _gv(m, 'testId') ?? ''}'.trim();
        if (msgTestId.isNotEmpty && msgTestId.toLowerCase() != tid.toLowerCase()) {
          return false;
        }
      }
      return true;
    } catch (_) {
      return userMessage.toLowerCase().contains(orderId.toLowerCase());
    }
  }

  AiAnalysisResult _mapConversationToAnalysis({
    required String orderId,
    required String reply,
    DateTime? generatedAt,
    String? testId,
    String? testName,
  }) {
    final trimmed = reply.trim();
    return AiAnalysisResult(
      orderId: orderId,
      generatedAt: generatedAt ?? DateTime.now(),
      summary: trimmed.length > 160 ? '${trimmed.substring(0, 157)}...' : trimmed,
      observation: trimmed,
      recommendation: 'Discuss these findings with your clinician if you have symptoms or concerns.',
      testId: testId,
      testName: testName,
    );
  }

  @override
  Future<AiAnalysisResult?> getAiAnalysis({
    required String userId,
    required String orderId,
    String? testId,
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
        if (reply.isEmpty ||
            !_historyMessageMatches(userMessage: userMsg, orderId: orderId, testId: testId)) {
          continue;
        }
        String? parsedTestId;
        String? parsedTestName;
        try {
          final parsed = jsonDecode(userMsg);
          if (parsed is Map) {
            final pm = _asObj(parsed);
            parsedTestId = '${_gv(pm, 'test_id') ?? _gv(pm, 'testId') ?? ''}'.trim();
            if (parsedTestId.isEmpty) parsedTestId = null;
            final tests = pm['tests'];
            if (tests is List && tests.isNotEmpty) {
              final tm = _asObj(tests.first);
              parsedTestName = '${_gv(tm, 'test_name') ?? _gv(tm, 'testName') ?? ''}'.trim();
              if (parsedTestName.isEmpty) parsedTestName = null;
            }
          }
        } catch (_) {}
        return _mapConversationToAnalysis(
          orderId: orderId,
          reply: reply,
          generatedAt: _asDt(_gv(m, 'created_at') ?? _gv(m, 'createdAt')),
          testId: parsedTestId ?? testId,
          testName: parsedTestName,
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
    String? testId,
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
        final id = '${_gv(m, 'test_id') ?? _gv(m, 'testId')}'.trim();
        if (id.isEmpty) continue;
        if (testId != null && testId.isNotEmpty && id.toLowerCase() != testId.toLowerCase()) {
          continue;
        }
        final url = _gv(m, 'download_url') ?? _gv(m, 'downloadUrl');
        final fileKey = _gv(m, 'result_file_url') ?? _gv(m, 'resultFileUrl');
        if ((url == null || '$url'.isEmpty) && (fileKey == null || '$fileKey'.isEmpty)) continue;
        tests.add({
          'test_id': id,
          'test_name': _gv(m, 'test_name') ?? _gv(m, 'testName'),
          'test_code': _gv(m, 'test_code') ?? _gv(m, 'testCode'),
          'result_pdf_url': url != null && '$url'.isNotEmpty ? '$url' : null,
        });
      }
    }
    if (tests.isEmpty) {
      throw LabApiException(
        testId != null && testId.isNotEmpty
            ? 'No result PDF is available for this test yet.'
            : 'No result PDF is available for this order yet.',
      );
    }

    final selectedTestId = '${tests.first['test_id']}'.trim();
    final selectedTestName = '${tests.first['test_name'] ?? 'Lab test'}'.trim();

    final message = jsonEncode({
      'order_id': orderId,
      if (selectedTestId.isNotEmpty) 'test_id': selectedTestId,
      'patient_name': _gv(o, 'patient_name') ?? _gv(o, 'patientName'),
      'tests': tests,
    });
    final aiId = await _resolveAiConfigId();

    List<int>? pdfBytes;
    if (selectedTestId.isNotEmpty) {
      try {
        pdfBytes = await downloadResultPdf(orderId: orderId, testId: selectedTestId);
      } catch (_) {
        /* fall back to URL fetch below */
      }
    }
    if (pdfBytes == null) {
      final firstPdfUrl = '${tests.first['result_pdf_url'] ?? ''}';
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
    return _mapConversationToAnalysis(
      orderId: orderId,
      reply: reply,
      testId: selectedTestId.isEmpty ? null : selectedTestId,
      testName: selectedTestName.isEmpty ? null : selectedTestName,
    );
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
    final meRes = await http.get(
      Uri.parse('$_base/api/auth/me'),
      headers: _jsonHeaders(noCache: true),
    );
    if (meRes.statusCode >= 400) _throwFromResponse(meRes);
    final me = _asObj(_decodeResponseJson(meRes));
    final bal = _asInt(_gv(me, 'total_points'));
    final meId = '${_gv(me, 'id') ?? userId}'.trim();

    Future<http.Response> fetchTransactions({required bool withUserId}) {
      final uri = withUserId && meId.isNotEmpty
          ? Uri.parse('$_base/api/point-transactions').replace(
              queryParameters: {'user_id': meId},
            )
          : Uri.parse('$_base/api/point-transactions');
      return http.get(uri, headers: _jsonHeaders(noCache: true));
    }

    var txRes = await fetchTransactions(withUserId: true);
    if (txRes.statusCode == 403) {
      txRes = await fetchTransactions(withUserId: false);
    }
    if (txRes.statusCode >= 400) _throwFromResponse(txRes);
    final entries = _parsePointTransactions(_decodeResponseJson(txRes));
    final earnRules = await _fetchActivePointEarnRules();
    return LoyaltySnapshot(balance: bal, entries: entries, earnRules: earnRules);
  }

  @override
  Future<UserReportSummary> fetchUserReportSummary({
    DateTime? startDate,
    DateTime? endDate,
  }) async {
    final qp = <String, String>{};
    if (startDate != null) qp['startDate'] = startDate.toUtc().toIso8601String();
    if (endDate != null) qp['endDate'] = endDate.toUtc().toIso8601String();
    final uri = Uri.parse('$_base/api/reports/user-summary').replace(
      queryParameters: qp.isEmpty ? null : qp,
    );
    final res = await http.get(uri, headers: _jsonHeaders(noCache: true));
    if (res.statusCode >= 400) _throwFromResponse(res);
    final raw = _decodeResponseJson(res);
    if (raw is Map && raw['data'] != null) {
      return _parseUserReportSummary(_asObj(raw['data']));
    }
    return _parseUserReportSummary(_asObj(raw));
  }

  LabAdvertisement _parseAdvertisement(Map<String, dynamic> json) {
    final displayRaw = '${_gv(json, 'image_display_url') ?? ''}'.trim();
    final imageRaw = '${_gv(json, 'image_url') ?? ''}'.trim();
    String? bannerUrl;
    if (displayRaw.isNotEmpty) {
      bannerUrl = _absoluteUrl(displayRaw);
    } else if (imageRaw.isNotEmpty) {
      if (imageRaw.startsWith('http://') ||
          imageRaw.startsWith('https://') ||
          imageRaw.startsWith('/')) {
        bannerUrl = _absoluteUrl(imageRaw);
      } else {
        final segments = imageRaw
            .replaceFirst(RegExp(r'^/+'), '')
            .split('/')
            .map(Uri.encodeComponent)
            .join('/');
        bannerUrl = '$_base/api/media/$segments';
      }
    }

    final actionRaw = '${_gv(json, 'action_url') ?? ''}'.trim();
    final descRaw = '${_gv(json, 'description') ?? ''}'.trim();

    return LabAdvertisement(
      id: '${json['id'] ?? ''}',
      title: '${json['title'] ?? ''}'.trim(),
      description: descRaw.isEmpty ? null : descRaw,
      bannerImageUrl: bannerUrl,
      actionUrl: actionRaw.isEmpty ? null : actionRaw,
    );
  }

  @override
  Future<List<LabAdvertisement>> fetchActiveAdvertisements() async {
    final now = DateTime.now().toUtc().toIso8601String();
    final uri = Uri.parse('$_base/api/advertisements').replace(
      queryParameters: {
        'is_active': 'true',
        'current_date': now,
        'sortBy': 'created_at',
        'sortOrder': 'DESC',
        'limit': '10',
      },
    );
    final res = await http.get(uri, headers: _jsonHeaders(withAuth: false, noCache: true));
    if (res.statusCode >= 400) _throwFromResponse(res);
    final data = _decodeResponseJson(res);
    if (data is! List) return const [];
    return [
      for (final row in data)
        if (row is Map) _parseAdvertisement(Map<String, dynamic>.from(row)),
    ].where((ad) => ad.hasBanner || ad.title.isNotEmpty).toList();
  }

  UserReportSummary _parseUserReportSummary(Map<String, dynamic> data) {
    final kpisRaw = _asObj(data['kpis']);
    final kpis = UserReportKpis(
      totalSpent: _asDouble(_gv(kpisRaw, 'total_spent')),
      totalOrders: _asInt(_gv(kpisRaw, 'total_orders')),
      completedOrders: _asInt(_gv(kpisRaw, 'completed_orders')),
      pendingOrders: _asInt(_gv(kpisRaw, 'pending_orders')),
      loyaltyPoints: _asInt(_gv(kpisRaw, 'loyalty_points')),
    );
    final trendRaw = data['spendTrend'];
    final spendTrend = trendRaw is List
        ? trendRaw.map((row) {
            final m = _asObj(row);
            return UserSpendTrendPoint(
              date: _asDt(_gv(m, 'date')),
              spent: _asDouble(_gv(m, 'spent') ?? _gv(m, 'revenue')),
              orderCount: _asInt(_gv(m, 'order_count')),
            );
          }).toList()
        : <UserSpendTrendPoint>[];
    final testsRaw = data['topTests'];
    final topTests = testsRaw is List
        ? testsRaw.map((row) {
            final m = _asObj(row);
            return UserTopTestRow(
              testName: '${_gv(m, 'test_name') ?? ''}'.trim(),
              testCode: '${_gv(m, 'test_code') ?? ''}'.trim(),
              category: '${_gv(m, 'category') ?? ''}'.trim(),
              orderCount: _asInt(_gv(m, 'order_count')),
              totalSpent: _asDouble(_gv(m, 'total_spent')),
            );
          }).toList()
        : <UserTopTestRow>[];
    return UserReportSummary(kpis: kpis, spendTrend: spendTrend, topTests: topTests);
  }

  Future<List<PointEarnRule>> _fetchActivePointEarnRules() async {
    final res = await http.get(
      Uri.parse('$_base/api/point-settings'),
      headers: _jsonHeaders(noCache: true),
    );
    if (res.statusCode >= 400) return const [];
    final raw = _decodeResponseJson(res);
    if (raw is! List) return const [];
    final now = DateTime.now();
    final out = <PointEarnRule>[];
    for (final item in raw) {
      final m = _asObj(item);
      if (!_asBool(_gv(m, 'is_active'), false)) continue;
      final start = _asDt(_gv(m, 'start_date') ?? _gv(m, 'startDate'));
      final end = _asDt(_gv(m, 'end_date') ?? _gv(m, 'endDate'));
      if (start != null && now.isBefore(start)) continue;
      if (end != null && now.isAfter(end)) continue;
      final id = '${_gv(m, 'id')}'.trim();
      if (id.isEmpty) continue;
      out.add(
        PointEarnRule(
          id: id,
          name: '${_gv(m, 'name') ?? 'Earn rule'}'.trim(),
          spendAmountMmk: _asDouble(_gv(m, 'spend_amount_mmk') ?? _gv(m, 'spendAmountMmk')),
          pointsReward: _asInt(_gv(m, 'points_reward') ?? _gv(m, 'pointsReward')),
        ),
      );
    }
    out.sort((a, b) => b.spendAmountMmk.compareTo(a.spendAmountMmk));
    return out;
  }

  List<LoyaltyEntry> _parsePointTransactions(dynamic raw) {
    if (raw is! List) return const [];
    final out = <LoyaltyEntry>[];
    for (final item in raw) {
      final m = _asObj(item);
      final id = '${_gv(m, 'id')}'.trim();
      final points = _asInt(_gv(m, 'points'));
      final type = PointTransactionType.from('${_gv(m, 'transaction_type') ?? ''}');
      final desc = '${_gv(m, 'description') ?? ''}'.trim();
      final refRaw = '${_gv(m, 'reference_id') ?? _gv(m, 'referenceId') ?? ''}'.trim();
      final createdAt = _asDt(_gv(m, 'created_at') ?? _gv(m, 'createdAt'));
      out.add(
        LoyaltyEntry(
          id: id.isEmpty ? null : id,
          label: desc.isNotEmpty ? desc : _defaultTransactionLabel(type),
          delta: points,
          atLabel: _formatLoyaltyDate(createdAt),
          createdAt: createdAt,
          transactionType: type,
          sourceOrderId: refRaw.isEmpty ? null : refRaw,
        ),
      );
    }
    return out;
  }

  String _defaultTransactionLabel(PointTransactionType type) {
    return switch (type) {
      PointTransactionType.earn => 'Points earned from lab visit',
      PointTransactionType.redeem => 'Points redeemed',
      PointTransactionType.adjustment => 'Points adjustment by lab',
      PointTransactionType.unknown => 'Point transaction',
    };
  }

  String _formatLoyaltyDate(DateTime? dt) {
    if (dt == null) return '—';
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final day = DateTime(dt.year, dt.month, dt.day);
    final time =
        '${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
    if (day == today) return 'Today · $time';
    if (day == today.subtract(const Duration(days: 1))) return 'Yesterday · $time';
    return '${dt.year}-${dt.month.toString().padLeft(2, '0')}-${dt.day.toString().padLeft(2, '0')} · $time';
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
  Future<void> registerFcmToken(String token) async {
    final r = await http.put(
      Uri.parse('$_base/api/users/fcm-token'),
      headers: _jsonHeaders(),
      body: jsonEncode({'fcm_token': token}),
    );
    if (r.statusCode >= 400) _throwFromResponse(r);
  }

  @override
  Future<List<AppNotification>> fetchNotifications({int limit = 50}) async {
    final r = await http.get(
      Uri.parse('$_base/api/notifications').replace(queryParameters: {'limit': '$limit'}),
      headers: _jsonHeaders(),
    );
    if (r.statusCode >= 400) _throwFromResponse(r);
    final data = _decodeResponseJson(r);
    if (data is! List) return const [];
    return [
      for (final row in data)
        if (row is Map) AppNotification.fromJson(Map<String, dynamic>.from(row)),
    ];
  }

  @override
  Future<void> markNotificationAsRead(String id) async {
    final r = await http.put(
      Uri.parse('$_base/api/notifications/${Uri.encodeComponent(id)}/read'),
      headers: _jsonHeaders(),
    );
    if (r.statusCode >= 400) _throwFromResponse(r);
  }

  @override
  Future<void> markAllNotificationsAsRead() async {
    final r = await http.put(
      Uri.parse('$_base/api/notifications/read-all'),
      headers: _jsonHeaders(),
    );
    if (r.statusCode >= 400) _throwFromResponse(r);
  }

  @override
  void clearAuth() {
    _token = null;
  }
}
