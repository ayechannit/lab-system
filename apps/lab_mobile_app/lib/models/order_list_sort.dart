/// Matches backend `Order.getAll` sort fields (`sortBy` / `sortOrder` query params).
class OrderListSort {
  const OrderListSort({
    required this.sortBy,
    required this.sortOrder,
    required this.label,
  });

  final String sortBy;
  final String sortOrder;
  final String label;

  static const activeDefault = OrderListSort(
    sortBy: 'created_at',
    sortOrder: 'DESC',
    label: 'Newest first',
  );

  static const releasedDefault = OrderListSort(
    sortBy: 'updated_at',
    sortOrder: 'DESC',
    label: 'Recently released',
  );

  static const activeOptions = <OrderListSort>[
    activeDefault,
    OrderListSort(sortBy: 'created_at', sortOrder: 'ASC', label: 'Oldest first'),
    OrderListSort(sortBy: 'updated_at', sortOrder: 'DESC', label: 'Recently updated'),
    OrderListSort(sortBy: 'status', sortOrder: 'ASC', label: 'Status'),
    OrderListSort(sortBy: 'priority', sortOrder: 'DESC', label: 'Priority (urgent first)'),
  ];

  static const releasedOptions = <OrderListSort>[
    releasedDefault,
    OrderListSort(sortBy: 'updated_at', sortOrder: 'ASC', label: 'Oldest released'),
    OrderListSort(sortBy: 'created_at', sortOrder: 'DESC', label: 'Newest placed'),
    OrderListSort(sortBy: 'created_at', sortOrder: 'ASC', label: 'Oldest placed'),
  ];

  @override
  bool operator ==(Object other) =>
      other is OrderListSort && other.sortBy == sortBy && other.sortOrder == sortOrder;

  @override
  int get hashCode => Object.hash(sortBy, sortOrder);
}
