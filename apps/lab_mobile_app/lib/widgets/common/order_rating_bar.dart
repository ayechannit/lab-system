import 'package:flutter/material.dart';

import '../../l10n/app_localizations.dart';
import '../../app/session_scope.dart';
import '../../models/rating.dart';
import '../../theme/theme_extensions.dart';
import 'app_toast.dart';

class OrderRatingBar extends StatelessWidget {
  const OrderRatingBar({
    super.key,
    required this.orderId,
    required this.existing,
    this.compact = true,
  });

  final String orderId;
  final OrderRatingSummary? existing;
  final bool compact;

  Future<void> _submit(BuildContext context, int stars) async {
    final l10n = AppLocalizations.of(context)!;
    try {
      final session = SessionScope.of(context);
      final remarkText = await showModalBottomSheet<String>(
        context: context,
        showDragHandle: true,
        isScrollControlled: true,
        builder: (sheetContext) => _OrderRatingRemarkSheet(
          stars: stars,
          title: l10n.ordersRateThisOrder,
          commentLabel: l10n.ordersCommentOptional,
          commentHint: l10n.ordersCommentHint,
          submitLabel: l10n.ordersSubmitRating,
        ),
      );
      if (remarkText == null || !context.mounted) return;
      await session.submitOrderRating(
        orderId: orderId,
        stars: stars,
        remark: remarkText,
      );
      if (!context.mounted) return;
      AppToast.successInShell(
        context,
        stars == 1 ? l10n.ordersRatedToastSingular : l10n.ordersRatedToast(stars),
        title: l10n.ordersThanksFeedback,
      );
    } catch (e) {
      if (!context.mounted) return;
      AppToast.errorInShell(context, '$e', title: l10n.ordersRatingFailed);
    }
  }

  void _showRatedDetail(BuildContext context, OrderRatingSummary rated) {
    final l10n = AppLocalizations.of(context)!;
    showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      builder: (sheetContext) {
        final cs = Theme.of(sheetContext).colorScheme;
        final remark = rated.remark.trim();
        return Padding(
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 28),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                l10n.ordersYourRating,
                style: Theme.of(sheetContext).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 10),
              Row(
                children: List.generate(5, (i) {
                  final filled = i < rated.stars;
                  return Icon(
                    Icons.star_rounded,
                    color: filled ? cs.primary : context.appExtras.ratingInactive,
                    size: 28,
                  );
                }),
              ),
              if (remark.isNotEmpty) ...[
                const SizedBox(height: 16),
                Text(
                  l10n.ordersYourComment,
                  style: Theme.of(sheetContext).textTheme.labelLarge?.copyWith(
                        color: cs.onSurfaceVariant,
                        fontWeight: FontWeight.w700,
                      ),
                ),
                const SizedBox(height: 6),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: cs.surfaceContainerHighest.withValues(alpha: 0.35),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: cs.outline.withValues(alpha: 0.25)),
                  ),
                  child: Text(
                    remark,
                    style: Theme.of(sheetContext).textTheme.bodyMedium?.copyWith(height: 1.4),
                  ),
                ),
              ] else
                Padding(
                  padding: const EdgeInsets.only(top: 12),
                  child: Text(
                    l10n.ordersNoComment,
                    style: Theme.of(sheetContext).textTheme.bodyMedium?.copyWith(color: cs.onSurfaceVariant),
                  ),
                ),
            ],
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final cs = context.cs;
    final l10n = AppLocalizations.of(context)!;
    final rated = existing;
    final starSize = compact ? 20.0 : 24.0;
    final remark = rated?.remark.trim() ?? '';

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        InkWell(
          onTap: rated != null ? () => _showRatedDetail(context, rated) : null,
          borderRadius: BorderRadius.circular(8),
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 2),
            child: Row(
              children: [
                Text(
                  rated == null ? l10n.ordersRate : l10n.ordersRated,
                  style: Theme.of(context).textTheme.labelSmall?.copyWith(
                        color: cs.onSurfaceVariant,
                        fontWeight: FontWeight.w600,
                      ),
                ),
                const SizedBox(width: 6),
                Expanded(
                  child: FittedBox(
                    fit: BoxFit.scaleDown,
                    alignment: Alignment.centerLeft,
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: List.generate(5, (i) {
                        final starValue = i + 1;
                        final filled = rated != null ? starValue <= rated.stars : false;
                        return InkWell(
                          onTap: rated == null ? () => _submit(context, starValue) : () => _showRatedDetail(context, rated),
                          borderRadius: BorderRadius.circular(6),
                          child: Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 1),
                            child: Icon(
                              filled ? Icons.star_rounded : Icons.star_outline_rounded,
                              size: starSize,
                              color: filled ? cs.primary : context.appExtras.ratingInactive,
                            ),
                          ),
                        );
                      }),
                    ),
                  ),
                ),
                if (rated != null && remark.isNotEmpty)
                  Icon(Icons.chevron_right, size: 18, color: cs.onSurfaceVariant),
              ],
            ),
          ),
        ),
        if (rated != null && remark.isNotEmpty) ...[
          const SizedBox(height: 8),
          Material(
            color: Colors.transparent,
            child: InkWell(
              onTap: () => _showRatedDetail(context, rated),
              borderRadius: BorderRadius.circular(10),
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                decoration: BoxDecoration(
                  color: cs.primary.withValues(alpha: 0.05),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: cs.primary.withValues(alpha: 0.12)),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Padding(
                      padding: const EdgeInsets.only(top: 1),
                      child: Icon(Icons.chat_bubble_outline, size: 15, color: cs.primary),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        remark,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                              color: cs.onSurface,
                              height: 1.35,
                            ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ],
    );
  }
}

class _OrderRatingRemarkSheet extends StatefulWidget {
  const _OrderRatingRemarkSheet({
    required this.stars,
    required this.title,
    required this.commentLabel,
    required this.commentHint,
    required this.submitLabel,
  });

  final int stars;
  final String title;
  final String commentLabel;
  final String commentHint;
  final String submitLabel;

  @override
  State<_OrderRatingRemarkSheet> createState() => _OrderRatingRemarkSheetState();
}

class _OrderRatingRemarkSheetState extends State<_OrderRatingRemarkSheet> {
  late final TextEditingController _remark;

  @override
  void initState() {
    super.initState();
    _remark = TextEditingController();
  }

  @override
  void dispose() {
    _remark.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        left: 20,
        right: 20,
        top: 8,
        bottom: 20 + MediaQuery.viewInsetsOf(context).bottom,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            widget.title,
            style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 6),
          Row(
            children: List.generate(5, (i) {
              final filled = i < widget.stars;
              return Icon(
                Icons.star_rounded,
                color: filled ? context.cs.primary : context.appExtras.ratingInactive,
                size: 28,
              );
            }),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _remark,
            maxLines: 3,
            decoration: InputDecoration(
              labelText: widget.commentLabel,
              hintText: widget.commentHint,
            ),
          ),
          const SizedBox(height: 16),
          FilledButton(
            onPressed: () => Navigator.pop(context, _remark.text.trim()),
            child: Text(widget.submitLabel),
          ),
        ],
      ),
    );
  }
}
