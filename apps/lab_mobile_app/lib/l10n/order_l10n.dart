import '../models/order_list_sort.dart';
import 'app_localizations.dart';

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
