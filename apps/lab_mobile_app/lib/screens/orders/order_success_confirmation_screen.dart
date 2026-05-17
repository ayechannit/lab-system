import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';

import '../../app/session_scope.dart';
import '../../theme/app_colors.dart';
import '../../widgets/common/app_brand_mark.dart';

class OrderSuccessConfirmationScreen extends StatelessWidget {
  const OrderSuccessConfirmationScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final session = SessionScope.of(context);
    final order = session.trackingOrder;

    return Scaffold(
      backgroundColor: AppColors.surface,
      appBar: AppBar(
        automaticallyImplyLeading: false,
        titleSpacing: 12,
        backgroundColor: AppColors.surface,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        title: Row(
          children: [
            const AppBrandMark(size: 32, iconSize: 16, borderRadius: 8),
            const SizedBox(width: 10),
            Text(
              'MedLab Smart',
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                    color: AppColors.primary,
                    fontWeight: FontWeight.w800,
                  ),
            ),
          ],
        ),
      ),
      body: SafeArea(
        child: LayoutBuilder(
          builder: (context, constraints) {
            const maxContent = 420.0;
            final hPad = constraints.maxWidth > maxContent + 48
                ? (constraints.maxWidth - maxContent) / 2
                : 20.0;
            return ListView(
              padding: EdgeInsets.fromLTRB(hPad, 12, hPad, 28),
              children: [
                const SizedBox(height: 12),
                Center(
                  child: Container(
                    width: 76,
                    height: 76,
                    decoration: BoxDecoration(
                      color: AppColors.accentGreen.withValues(alpha: 0.12),
                      shape: BoxShape.circle,
                      border: Border.all(color: AppColors.accentGreen.withValues(alpha: 0.28)),
                    ),
                    child: Icon(Icons.check_rounded, color: AppColors.accentGreen, size: 38),
                  ),
                ),
                const SizedBox(height: 22),
                Text(
                  'Order submitted',
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                        color: AppColors.onSurface,
                        fontWeight: FontWeight.w600,
                        letterSpacing: -0.25,
                      ),
                ),
                const SizedBox(height: 10),
                Text(
                  'Thanks — the lab has your request. You can follow progress from Orders or below.',
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                        color: AppColors.onSurfaceVariant,
                        height: 1.45,
                        fontWeight: FontWeight.w400,
                      ),
                ),
                if (order != null) ...[
                  const SizedBox(height: 26),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.fromLTRB(18, 18, 18, 14),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: const Color(0x66E1E2EC)),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.05),
                          blurRadius: 24,
                          offset: const Offset(0, 10),
                        ),
                      ],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Summary',
                          style: Theme.of(context).textTheme.titleSmall?.copyWith(
                                color: AppColors.primary,
                                fontWeight: FontWeight.w600,
                              ),
                        ),
                        const SizedBox(height: 16),
                        _SuccessField(label: 'Patient', value: order.patientName),
                        _SuccessDivider(),
                        _SuccessField(label: 'Test', value: order.testType),
                        _SuccessDivider(),
                        _SuccessField(label: 'Address', value: order.address.line),
                        if (order.backendStatus != null) ...[
                          _SuccessDivider(),
                          _SuccessField(label: 'Status', value: order.backendStatus!),
                        ],
                        _SuccessDivider(),
                        Text(
                          'Reference (for support)',
                          style: Theme.of(context).textTheme.labelMedium?.copyWith(color: AppColors.onSurfaceVariant),
                        ),
                        const SizedBox(height: 6),
                        SelectableText(
                          order.id,
                          style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                color: AppColors.onSurfaceVariant,
                                height: 1.4,
                              ),
                        ),
                        Align(
                          alignment: Alignment.centerRight,
                          child: TextButton.icon(
                            onPressed: () async {
                              await Clipboard.setData(ClipboardData(text: order.id));
                              if (!context.mounted) return;
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(content: Text('Reference copied')),
                              );
                            },
                            icon: const Icon(Icons.copy_outlined, size: 18),
                            label: const Text('Copy'),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
                const SizedBox(height: 26),
                SizedBox(
                  height: 52,
                  width: double.infinity,
                  child: FilledButton.icon(
                    style: FilledButton.styleFrom(
                      elevation: 0,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    ),
                    onPressed: () => context.go('/order-tracking'),
                    icon: const Icon(Icons.local_shipping_outlined, size: 20),
                    label: Text(
                      'Track order',
                      style: Theme.of(context).textTheme.labelLarge?.copyWith(
                            fontWeight: FontWeight.w500,
                            color: Theme.of(context).colorScheme.onPrimary,
                          ),
                    ),
                  ),
                ),
                const SizedBox(height: 10),
                SizedBox(
                  height: 52,
                  width: double.infinity,
                  child: OutlinedButton.icon(
                    style: OutlinedButton.styleFrom(
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    ),
                    onPressed: () => context.go(session.homeRoute),
                    icon: Icon(Icons.grid_view_rounded, size: 20, color: AppColors.primary),
                    label: Text(
                      'Back to home',
                      style: Theme.of(context).textTheme.labelLarge?.copyWith(
                            fontWeight: FontWeight.w500,
                            color: AppColors.primary,
                          ),
                    ),
                  ),
                ),
              ],
            );
          },
        ),
      ),
    );
  }
}

class _SuccessField extends StatelessWidget {
  const _SuccessField({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: Theme.of(context).textTheme.labelMedium?.copyWith(color: AppColors.onSurfaceVariant),
        ),
        const SizedBox(height: 4),
        Text(
          value,
          style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                color: AppColors.onSurface,
                fontWeight: FontWeight.w400,
                height: 1.35,
              ),
        ),
      ],
    );
  }
}

class _SuccessDivider extends StatelessWidget {
  const _SuccessDivider();
  @override
  Widget build(BuildContext context) {
    return const Padding(
      padding: EdgeInsets.symmetric(vertical: 14),
      child: Divider(height: 1, thickness: 1),
    );
  }
}
