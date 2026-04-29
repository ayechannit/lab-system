import '../models/lab_order.dart';
import '../models/lab_result.dart';
import '../models/loyalty.dart';

/// Demo catalog strings and structures (no backend).
abstract final class DemoCatalog {
  static const testTypes = <String>[
    'CBC Blood Test',
    'COVID PCR',
    'Liver Function Test',
    'Diabetes Test',
  ];

  static LabOrderSummary demoTrackingOrder() {
    final now = DateTime.now();
    return LabOrderSummary(
      id: 'LAB1021',
      userId: 'u1',
      patientName: 'John Doe',
      testType: 'Blood Test',
      description: 'Routine health check',
      priority: OrderPriority.elective,
      address: const LabAddress(
        line: '123 Medical Avenue, Flat 4B, Downtown',
        latitude: 16.8661,
        longitude: 96.1951,
      ),
      createdAt: now.subtract(const Duration(days: 1)),
      createdAtLabel: 'Apr 24, 2026',
      timeline: const [
        OrderTimelineStep(
          title: 'Order Submitted',
          subtitle: 'Received by lab',
          done: true,
        ),
        OrderTimelineStep(
          title: 'Collection Scheduled',
          subtitle: 'Tomorrow 10:00 AM',
          done: true,
        ),
        OrderTimelineStep(
          title: 'Sample Collected',
          subtitle: 'Pending',
          done: false,
        ),
        OrderTimelineStep(
          title: 'Testing',
          subtitle: '—',
          done: false,
        ),
        OrderTimelineStep(
          title: 'Result Ready',
          subtitle: '—',
          done: false,
        ),
      ],
      collectionAcceptedAt: DateTime(2026, 4, 24, 9, 30),
      collectorName: 'Aung Min (Collector)',
      runningAt: DateTime(2026, 4, 24, 11, 15),
      reportOutAt: DateTime(2026, 4, 24, 17, 30),
    );
  }

  static const upcomingTest = UpcomingTest(
    testName: 'Blood Test',
    whenLabel: 'Tomorrow 10:00 AM',
  );

  static const demoResultLines = <LabResultLine>[
    LabResultLine(name: 'Hemoglobin', value: '10.2', flag: ResultFlag.low),
    LabResultLine(name: 'WBC', value: '7500', flag: ResultFlag.normal),
  ];

  static const aiHemoglobinMessage =
      'Your hemoglobin level appears slightly low which may indicate mild anemia. Please consult a doctor.';

  static const loyaltyHistory = <LoyaltyEntry>[
    LoyaltyEntry(label: 'Order #1021', delta: 10, atLabel: 'Apr 22, 2026'),
    LoyaltyEntry(label: 'Order #1022', delta: 10, atLabel: 'Apr 23, 2026'),
  ];
}
