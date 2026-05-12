import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../app/session_scope.dart';
import '../../theme/app_colors.dart';

class OrderSuccessConfirmationScreen extends StatelessWidget {
  const OrderSuccessConfirmationScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final session = SessionScope.of(context);
    final order = session.trackingOrder;
    final orderId = order?.id ?? '—';

    return Scaffold(
      appBar: AppBar(
        automaticallyImplyLeading: false,
        titleSpacing: 4,
        title: Text(
          'MedLab Smart',
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
            'Order submitted',
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 4),
          Text(
            'The lab has your order reference $orderId.',
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.titleMedium?.copyWith(color: AppColors.onSurfaceVariant),
          ),
          if (order != null) ...[
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
                  Text('Patient', style: Theme.of(context).textTheme.labelMedium?.copyWith(color: AppColors.onSurfaceVariant)),
                  Text(order.patientName, style: Theme.of(context).textTheme.titleMedium),
                  const SizedBox(height: 10),
                  Text('Test', style: Theme.of(context).textTheme.labelMedium?.copyWith(color: AppColors.onSurfaceVariant)),
                  Text(order.testType, style: Theme.of(context).textTheme.titleMedium),
                  const SizedBox(height: 10),
                  Text('Address', style: Theme.of(context).textTheme.labelMedium?.copyWith(color: AppColors.onSurfaceVariant)),
                  Text(order.address.line, style: Theme.of(context).textTheme.bodyMedium),
                  if (order.backendStatus != null) ...[
                    const SizedBox(height: 10),
                    Text('Status', style: Theme.of(context).textTheme.labelMedium?.copyWith(color: AppColors.onSurfaceVariant)),
                    Text('${order.backendStatus}', style: Theme.of(context).textTheme.bodyMedium),
                  ],
                ],
              ),
            ),
          ],
          const SizedBox(height: 16),
          SizedBox(
            height: 56,
            child: FilledButton.icon(
              onPressed: () => context.go('/order-tracking'),
              icon: const Icon(Icons.local_shipping_outlined),
              label: const Text('Track order'),
            ),
          ),
          const SizedBox(height: 10),
          SizedBox(
            height: 56,
            child: OutlinedButton.icon(
              onPressed: () => context.go(session.homeRoute),
              icon: const Icon(Icons.grid_view_rounded),
              label: const Text('Back to home'),
            ),
          ),
        ],
      ),
    );
  }
}
