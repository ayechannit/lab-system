import 'package:flutter/material.dart';

import '../../app/session_scope.dart';
import '../../theme/theme_extensions.dart';
import '../../widgets/common/app_branding_row.dart';
import '../../widgets/common/app_toast.dart';
import '../../widgets/navigation/lab_main_bottom_nav.dart';

class RatingFeedbackScreen extends StatefulWidget {
  const RatingFeedbackScreen({super.key});

  @override
  State<RatingFeedbackScreen> createState() => _RatingFeedbackScreenState();
}

class _RatingFeedbackScreenState extends State<RatingFeedbackScreen> {
  int _stars = 0;
  final _comment = TextEditingController();

  @override
  void dispose() {
    _comment.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final session = SessionScope.of(context);
    return Scaffold(
      appBar: AppBar(
        automaticallyImplyLeading: false,
        titleSpacing: 4,
        title: const AppBrandingRow(size: 28),
      ),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Center(
            child: Container(
              width: 72,
              height: 72,
              decoration: BoxDecoration(
                color: context.cs.primary.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(999),
              ),
              child: Icon(Icons.biotech, size: 36, color: context.cs.primary),
            ),
          ),
          const SizedBox(height: 12),
          Text(
            'Rate Your Experience',
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.headlineMedium?.copyWith(fontWeight: FontWeight.w700),
          ),
          Text(
            'Share feedback for the lab. Ratings are sent to the server with your account.',
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.titleMedium?.copyWith(color: context.cs.onSurfaceVariant),
          ),
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: context.cardFill,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: context.subtleBorder),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  'Overall Satisfaction',
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 8),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: List.generate(5, (i) {
                    final filled = i < _stars;
                    return IconButton(
                      onPressed: () => setState(() => _stars = i + 1),
                      icon: Icon(
                        Icons.star_rounded,
                        color: filled ? context.cs.primary : const Color(0xFFC8CCE0),
                        size: 38,
                      ),
                    );
                  }),
                ),
                const SizedBox(height: 4),
                Text(
                  _stars == 0 ? 'Select a star rating' : '$_stars of 5 stars',
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.titleSmall?.copyWith(
                        color: context.cs.onSurfaceVariant,
                        fontWeight: FontWeight.w600,
                      ),
                ),
                const SizedBox(height: 14),
                const Divider(height: 1),
                const SizedBox(height: 14),
                Text(
                  'Optional comment',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 8),
                Container(
                  decoration: BoxDecoration(
                    color: const Color(0xFFF1F1FB),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: TextField(
                    controller: _comment,
                    maxLines: 4,
                    decoration: const InputDecoration(
                      hintText: 'Add details for the lab team',
                      border: InputBorder.none,
                      enabledBorder: InputBorder.none,
                      focusedBorder: InputBorder.none,
                      contentPadding: EdgeInsets.all(14),
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),
          SizedBox(
            height: 62,
            child: FilledButton(
              onPressed: _stars == 0
                  ? null
                  : () {
                      session
                          .submitRating(
                            stars: _stars,
                            remark: _comment.text.trim(),
                          )
                          .then((_) {
                        if (!context.mounted) return;
                        AppToast.successInShell(
                          context,
                          'You rated $_stars star${_stars == 1 ? '' : 's'}.',
                          title: 'Thanks for your feedback',
                        );
                      });
                    },
              child: const Text('Submit Review'),
            ),
          ),
          const SizedBox(height: 14),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.verified_user_outlined, color: context.cs.onSurfaceVariant.withValues(alpha: 0.8), size: 18),
              const SizedBox(width: 6),
              Text(
                'Secure and confidential feedback',
                style: Theme.of(context).textTheme.titleMedium?.copyWith(color: context.cs.onSurfaceVariant),
              ),
            ],
          ),
        ],
      ),
      bottomNavigationBar: const LabMainBottomNav(current: LabMainTab.none),
    );
  }
}
