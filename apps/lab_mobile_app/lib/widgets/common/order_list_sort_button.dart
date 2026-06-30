import 'package:flutter/material.dart';

import '../../l10n/app_localizations.dart';
import '../../l10n/order_l10n.dart';
import '../../models/order_list_sort.dart';
import '../../theme/theme_extensions.dart';

class OrderListSortButton extends StatelessWidget {
  const OrderListSortButton({
    super.key,
    required this.selected,
    required this.options,
    required this.onSelected,
  });

  final OrderListSort selected;
  final List<OrderListSort> options;
  final ValueChanged<OrderListSort> onSelected;

  Future<void> _openSheet(BuildContext context) async {
    final l10n = AppLocalizations.of(context)!;
    final picked = await showModalBottomSheet<OrderListSort>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (ctx) {
        final cs = ctx.cs;
        return SafeArea(
          child: ListView(
            shrinkWrap: true,
            padding: const EdgeInsets.only(bottom: 8),
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 4, 20, 8),
                child: Text(
                  l10n.ordersSortBy,
                  style: Theme.of(ctx).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
                ),
              ),
              for (final option in options)
                ListTile(
                  leading: Icon(
                    selected == option ? Icons.check_circle_rounded : Icons.circle_outlined,
                    color: selected == option ? cs.primary : cs.onSurfaceVariant,
                  ),
                  title: Text(option.localizedLabel(l10n)),
                  onTap: () => Navigator.pop(ctx, option),
                ),
            ],
          ),
        );
      },
    );
    if (picked != null && picked != selected) {
      onSelected(picked);
    }
  }

  @override
  Widget build(BuildContext context) {
    final cs = context.cs;
    final l10n = AppLocalizations.of(context)!;
    return TextButton.icon(
      onPressed: () => _openSheet(context),
      icon: Icon(Icons.sort_rounded, size: 18, color: cs.primary),
      label: Text(
        selected.localizedLabel(l10n),
        style: Theme.of(context).textTheme.labelLarge?.copyWith(
              color: cs.primary,
              fontWeight: FontWeight.w600,
            ),
      ),
      style: TextButton.styleFrom(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        minimumSize: Size.zero,
        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
      ),
    );
  }
}
