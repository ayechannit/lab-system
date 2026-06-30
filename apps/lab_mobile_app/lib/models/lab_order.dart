import 'dart:typed_data';

/// Two decimal places for `lab_orders` / `lab_order_items` money fields (matches admin rounding).
double roundPriceMmk(double v) => (v * 100).round() / 100.0;

class OrderTimelineStep {
  const OrderTimelineStep({
    required this.title,
    required this.subtitle,
    required this.done,
    this.occurredAt,
    this.actor,
  });

  final String title;
  final String subtitle;
  final bool done;
  final DateTime? occurredAt;
  final String? actor;
}

enum OrderPriority {
  urgent,
  elective;

  String get label => switch (this) {
        OrderPriority.urgent => 'Urgent',
        OrderPriority.elective => 'Elective',
      };
}

class LabAddress {
  const LabAddress({
    required this.line,
    required this.latitude,
    required this.longitude,
    this.placeId,
  });

  final String line;
  final double latitude;
  final double longitude;
  final String? placeId;
}

/// Service zone fee from `GET /api/service-geofences/calculate-fee`.
class ServiceFeeQuote {
  const ServiceFeeQuote({
    required this.serviceGeofenceId,
    required this.zoneName,
    required this.serviceFeeMmk,
  });

  final String serviceGeofenceId;
  final String zoneName;
  final double serviceFeeMmk;
}

/// Standard collection material fee from `GET /api/material-fees/active`.
class MaterialFeeQuote {
  const MaterialFeeQuote({
    required this.name,
    required this.amountMmk,
  });

  final String name;
  final double amountMmk;
}

/// One catalog line on the order (maps to `lab_order_items`).
class CatalogOrderLine {
  const CatalogOrderLine({
    required this.testId,
    required this.testName,
    required this.testCode,
    required this.unitPriceMmk,
    required this.discountPercent,
    required this.subtotalMmk,
  });

  final String testId;
  final String testName;
  final String testCode;
  final double unitPriceMmk;
  final int discountPercent;
  final double subtotalMmk;

  Map<String, dynamic> toItemJson() => {
        'test_id': testId,
        'quantity': 1,
        'unit_price_mmk': roundPriceMmk(unitPriceMmk),
        'subtotal_mmk': roundPriceMmk(subtotalMmk),
      };
}

class LabCollectorPick {
  const LabCollectorPick({
    required this.id,
    required this.name,
    this.profileImageUrl,
  });

  final String id;
  final String name;
  final String? profileImageUrl;
}

class LabOrderRequest {
  const LabOrderRequest({
    required this.testName,
    required this.description,
    required this.priority,
    required this.patientName,
    required this.age,
    required this.phone,
    required this.gender,
    required this.bloodType,
    required this.labFacility,
    required this.preferredDate,
    required this.timeSlot,
    required this.address,
    required this.createdAt,
    this.reportDeliveryMethod = 'soft_copy',
    this.catalogLines = const [],
    this.prescriptionBytes,
    this.prescriptionFilename,
    this.collectorId,
    this.materialFeeMmk = 0,
  });

  /// Local summary for UI only (not a separate API column).
  final String testName;

  /// Maps to API `description` (`lab_orders.description`). Tests are only in `items` JSON — not duplicated here.
  final String description;
  final OrderPriority priority;
  final String patientName;
  final int age;
  final String phone;
  final String gender;
  final String bloodType;
  final String labFacility;
  final DateTime preferredDate;
  final String timeSlot;
  final LabAddress address;
  final DateTime createdAt;

  /// Backend `report_delivery_method`: `soft_copy` | `hard_copy` | `both`.
  final String reportDeliveryMethod;

  /// Selected catalog tests with per-line pricing (empty when prescription-only).
  final List<CatalogOrderLine> catalogLines;

  /// Optional preferred sample collector (`lab_orders.collector_id`).
  final String? collectorId;

  /// Collection material fee (`lab_orders.material_fee_mmk`).
  final double materialFeeMmk;

  /// Optional prescription image/PDF (`multipart` field `prescription`).
  final Uint8List? prescriptionBytes;
  final String? prescriptionFilename;

  bool get isPrescriptionOnly =>
      (prescriptionBytes != null && prescriptionBytes!.isNotEmpty) && catalogLines.isEmpty;
}

class UpcomingTest {
  const UpcomingTest({
    required this.testName,
    required this.whenLabel,
  });

  final String testName;
  final String whenLabel;
}

/// Saved catalog line returned from `GET /api/orders/:id` (`items` array).
class OrderLineSummary {
  const OrderLineSummary({
    required this.testId,
    required this.testName,
    required this.testCode,
    required this.quantity,
    required this.subtotalMmk,
  });

  final String testId;
  final String testName;
  final String testCode;
  final int quantity;
  final double subtotalMmk;
}

class LabOrderSummary {
  const LabOrderSummary({
    required this.id,
    required this.userId,
    required this.patientName,
    required this.testType,
    required this.description,
    required this.priority,
    required this.address,
    required this.createdAt,
    required this.timeline,
    required this.createdAtLabel,
    this.collectionAcceptedAt,
    this.collectorName,
    this.collectorProfileImageUrl,
    this.runningAt,
    this.reportOutAt,
    this.scheduleAcceptedByUser = true,
    this.backendStatus,
    this.lineItems = const [],
  });

  final String id;
  final String userId;
  final String patientName;
  final String testType;
  final String description;
  final OrderPriority priority;
  final LabAddress address;
  final DateTime createdAt;
  final List<OrderTimelineStep> timeline;
  final String createdAtLabel;
  final DateTime? collectionAcceptedAt;
  final String? collectorName;
  final String? collectorProfileImageUrl;
  final DateTime? runningAt;
  final DateTime? reportOutAt;

  /// From lab schedule: user has confirmed proposed collection times.
  final bool scheduleAcceptedByUser;

  /// Raw API status when using REST (`pending`, `scheduled`, …).
  final String? backendStatus;

  /// Line items from the server (`lab_order_items`), with catalog names when available.
  final List<OrderLineSummary> lineItems;

  bool get isReportReady => reportOutAt != null;

  /// True when the lab has proposed at least one schedule field.
  bool get hasLabSchedule =>
      collectorName != null ||
      collectionAcceptedAt != null ||
      runningAt != null ||
      reportOutAt != null;

  bool get canConfirmSchedule =>
      !scheduleAcceptedByUser &&
      (collectionAcceptedAt != null || collectorName != null || runningAt != null);

  LabOrderSummary copyWith({
    bool? scheduleAcceptedByUser,
  }) {
    return LabOrderSummary(
      id: id,
      userId: userId,
      patientName: patientName,
      testType: testType,
      description: description,
      priority: priority,
      address: address,
      createdAt: createdAt,
      timeline: timeline,
      createdAtLabel: createdAtLabel,
      collectionAcceptedAt: collectionAcceptedAt,
      collectorName: collectorName,
      collectorProfileImageUrl: collectorProfileImageUrl,
      runningAt: runningAt,
      reportOutAt: reportOutAt,
      scheduleAcceptedByUser: scheduleAcceptedByUser ?? this.scheduleAcceptedByUser,
      backendStatus: backendStatus,
      lineItems: lineItems,
    );
  }
}
