import 'package:flutter/material.dart';

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
    final remark = TextEditingController();
    try {
    final session = SessionScope.of(context);
    final submitted = await showModalBottomSheet<bool>(
      context: context,
      showDragHandle: true,
      isScrollControlled: true,
      builder: (sheetContext) {
        return Padding(
          padding: EdgeInsets.only(
            left: 20,
            right: 20,
            top: 8,
            bottom: 20 + MediaQuery.viewInsetsOf(sheetContext).bottom,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                'Rate this order',
                style: Theme.of(sheetContext).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 6),
              Row(
                children: List.generate(5, (i) {
                  final filled = i < stars;
                  return Icon(
                    Icons.star_rounded,
                    color: filled ? Theme.of(sheetContext).colorScheme.primary : const Color(0xFFC8CCE0),
                    size: 28,
                  );
                }),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: remark,
                maxLines: 3,
                decoration: const InputDecoration(
                  labelText: 'Comment (optional)',
                  hintText: 'Share feedback for the lab team',
                ),
              ),
              const SizedBox(height: 16),
              FilledButton(
                onPressed: () => Navigator.pop(sheetContext, true),
                child: const Text('Submit rating'),
              ),
            ],
          ),
        );
      },
    );
    if (submitted != true || !context.mounted) return;
      await session.submitOrderRating(
        orderId: orderId,
        stars: stars,
        remark: remark.text.trim(),
      );
      if (!context.mounted) return;
      AppToast.successInShell(
        context,
        'You rated this order $stars star${stars == 1 ? '' : 's'}.',
        title: 'Thanks for your feedback',
      );
    } catch (e) {
      if (!context.mounted) return;
      AppToast.errorInShell(context, '$e', title: 'Rating failed');
    } finally {
      remark.dispose();
    }
  }

  @override
  Widget build(BuildContext context) {
    final cs = context.cs;
    final rated = existing;
    final starSize = compact ? 20.0 : 24.0;

    return Row(
      children: [
        Text(
          rated == null ? 'Rate' : 'Rated',
          style: Theme.of(context).textTheme.labelSmall?.copyWith(
                color: cs.onSurfaceVariant,
                fontWeight: FontWeight.w600,
              ),
        ),
        const SizedBox(width: 6),
        ...List.generate(5, (i) {
          final starValue = i + 1;
          final filled = rated != null ? starValue <= rated.stars : false;
          return InkWell(
            onTap: rated == null ? () => _submit(context, starValue) : null,
            borderRadius: BorderRadius.circular(6),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 1),
              child: Icon(
                filled ? Icons.star_rounded : Icons.star_outline_rounded,
                size: starSize,
                color: filled ? cs.primary : const Color(0xFFC8CCE0),
              ),
            ),
          );
        }),
        if (rated != null && rated.remark.trim().isNotEmpty) ...[
          const SizedBox(width: 6),
          Icon(Icons.chat_bubble_outline, size: 14, color: cs.onSurfaceVariant),
        ],
      ],
    );
  }
}
