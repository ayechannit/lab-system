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
  });

  final String testName;
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
}

class UpcomingTest {
  const UpcomingTest({
    required this.testName,
    required this.whenLabel,
  });

  final String testName;
  final String whenLabel;
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
    this.runningAt,
    this.reportOutAt,
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
  final DateTime? runningAt;
  final DateTime? reportOutAt;

  bool get isReportReady => reportOutAt != null;
}
