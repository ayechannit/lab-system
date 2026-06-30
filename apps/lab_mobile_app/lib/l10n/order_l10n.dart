import '../models/lab_order.dart';
import '../models/order_list_sort.dart';
import 'app_localizations.dart';

String localizedTrackingTestLabel(LabOrderSummary order, AppLocalizations l10n) {
  if (order.lineItems.isEmpty) {
    final fallback = order.testType.trim();
    return fallback.isEmpty ? l10n.trackingLabTestFallback : fallback;
  }
  if (order.lineItems.length == 1) return order.lineItems.first.testName;
  return l10n.trackingTestCount(order.lineItems.length);
}

String formatTrackingDateTime(DateTime? dt, AppLocalizations l10n) {
  if (dt == null) return l10n.collectorPending;
  return '${dt.year}-${dt.month.toString().padLeft(2, '0')}-${dt.day.toString().padLeft(2, '0')} '
      '${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
}

List<OrderTimelineStep> localizedTrackingTimeline(LabOrderSummary order, AppLocalizations l10n) {
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

  final status = (order.backendStatus ?? 'pending').toLowerCase();
  final r = rank(status);
  final collectionTime = order.collectionAcceptedAt;
  final runningTime = order.runningAt;
  final reportOutTime = order.reportOutAt;
  final collectorName = order.collectorName;

  var collectionSubtitle = collectionTime == null
      ? l10n.trackingAwaitingSchedule
      : formatTrackingDateTime(collectionTime, l10n);
  if (collectorName != null && collectorName.trim().isNotEmpty) {
    collectionSubtitle = '$collectionSubtitle · ${collectorName.trim()}';
  }

  return [
    OrderTimelineStep(
      title: l10n.trackingStepSubmitted,
      subtitle: l10n.trackingStepSubmittedSub,
      done: r >= 1,
      occurredAt: order.createdAt,
    ),
    OrderTimelineStep(
      title: l10n.trackingStepCollection,
      subtitle: collectionSubtitle,
      done: r >= 2 || collectionTime != null,
      occurredAt: collectionTime,
      actor: collectorName,
    ),
    OrderTimelineStep(
      title: l10n.trackingStepRunning,
      subtitle: formatTrackingDateTime(runningTime, l10n),
      done: r >= 4,
      occurredAt: runningTime,
    ),
    OrderTimelineStep(
      title: l10n.trackingStepReportOut,
      subtitle: formatTrackingDateTime(reportOutTime, l10n),
      done: r >= 5 || reportOutTime != null,
      occurredAt: reportOutTime,
    ),
  ];
}

extension OrderListSortL10n on OrderListSort {
  String localizedLabel(AppLocalizations l10n) {
    switch (label) {
      case 'Newest first':
        return l10n.ordersSortNewestFirst;
      case 'Oldest first':
        return l10n.ordersSortOldestFirst;
      case 'Recently updated':
        return l10n.ordersSortRecentlyUpdated;
      case 'Status':
        return l10n.ordersSortByStatus;
      case 'Priority (urgent first)':
        return l10n.ordersSortPriority;
      case 'Recently released':
        return l10n.ordersSortRecentlyReleased;
      case 'Oldest released':
        return l10n.ordersSortOldestReleased;
      case 'Newest placed':
        return l10n.ordersSortNewestPlaced;
      case 'Oldest placed':
        return l10n.ordersSortOldestPlaced;
      default:
        return label;
    }
  }
}

String localizedOrderStatusLabel(String? rawStatus, AppLocalizations l10n) {
  final status = (rawStatus ?? 'pending').trim().toLowerCase();
  switch (status) {
    case 'pending':
      return l10n.orderStatusPending;
    case 'scheduled':
      return l10n.orderStatusScheduled;
    case 'collecting':
      return l10n.orderStatusCollecting;
    case 'running':
      return l10n.orderStatusRunning;
    case 'completed':
      return l10n.orderStatusCompleted;
    case 'delivered':
      return l10n.orderStatusDelivered;
    default:
      if (status.isEmpty) return l10n.orderStatusUnknown;
      return status[0].toUpperCase() + status.substring(1).replaceAll('_', ' ');
  }
}
