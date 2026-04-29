import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../app/session_scope.dart';
import '../../theme/app_colors.dart';

class OrderSuccessConfirmationScreen extends StatelessWidget {
  const OrderSuccessConfirmationScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final session = SessionScope.of(context);
    final orderId = session.trackingOrder?.id ?? 'LAB1021';
    return Scaffold(
      appBar: AppBar(
        automaticallyImplyLeading: false,
        titleSpacing: 4,
        title: Text(
          'MediConfirm',
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                color: AppColors.primary,
                fontWeight: FontWeight.w700,
              ),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 20, 20, 20),
        children: [
          Center(
            child: Container(
              width: 86,
              height: 86,
              decoration: BoxDecoration(
                color: const Color(0xFFEAF8F1),
                borderRadius: BorderRadius.circular(18),
              ),
              child: const Center(
                child: CircleAvatar(
                  radius: 27,
                  backgroundColor: Color(0xFF12B76A),
                  child: Icon(Icons.check, color: Colors.white, size: 30),
                ),
              ),
            ),
          ),
          const SizedBox(height: 14),
          Text(
            'Order Placed Successfully!',
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 4),
          Text(
            'Your lab test order #$orderId has been confirmed.',
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.titleMedium?.copyWith(color: AppColors.onSurfaceVariant),
          ),
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0x66E1E2EC)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Icon(Icons.assignment_turned_in_outlined, color: AppColors.primary),
                    const SizedBox(width: 8),
                    Text('Next Steps', style: Theme.of(context).textTheme.titleMedium),
                  ],
                ),
                const SizedBox(height: 12),
                _nextStep(
                  context,
                  icon: Icons.home_outlined,
                  title: 'Home Sample Collection',
                  subtitle: 'A health technician will arrive at your address between 08:00 AM - 10:00 AM.',
                ),
                const Divider(height: 22),
                _nextStep(
                  context,
                  icon: Icons.badge_outlined,
                  title: 'Verification Required',
                  subtitle: 'Keep your original ID ready for verification upon technician arrival.',
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          Container(
            height: 100,
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(12),
              gradient: const LinearGradient(
                colors: [Color(0xFF0B4BB3), Color(0xFF2B7BCD)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  'MEDICONFIRM PLUS',
                  style: Theme.of(context).textTheme.labelLarge?.copyWith(color: Colors.white, letterSpacing: 1.2),
                ),
                Text(
                  'Get 20% off your next wellness scan',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(color: Colors.white),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          SizedBox(
            height: 56,
            child: FilledButton.icon(
              onPressed: () => context.go('/lab-results'),
              icon: const Icon(Icons.assignment_outlined),
              label: const Text('View Result'),
            ),
          ),
          const SizedBox(height: 10),
          SizedBox(
            height: 56,
            child: OutlinedButton.icon(
              onPressed: () => context.go('/home'),
              icon: const Icon(Icons.grid_view_rounded),
              label: const Text('Return to Dashboard'),
            ),
          ),
          TextButton.icon(
            onPressed: () => context.go('/order-tracking'),
            icon: const Icon(Icons.close, color: AppColors.error),
            label: const Text('Track Order', style: TextStyle(color: AppColors.error)),
          ),
          const SizedBox(height: 6),
          Text(
            'Need help? Contact Support',
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.titleMedium?.copyWith(color: AppColors.onSurfaceVariant),
          ),
        ],
      ),
    );
  }

  Widget _nextStep(
    BuildContext context, {
    required IconData icon,
    required String title,
    required String subtitle,
  }) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: 34,
          height: 34,
          decoration: BoxDecoration(
            color: const Color(0xFFEAF1FF),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Icon(icon, color: AppColors.primary),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
              Text(subtitle, style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: AppColors.onSurfaceVariant)),
            ],
          ),
        ),
      ],
    );
  }
}
