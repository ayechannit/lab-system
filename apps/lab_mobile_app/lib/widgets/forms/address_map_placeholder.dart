import 'package:flutter/material.dart';

import '../../theme/app_colors.dart';

/// Demo map area; swap for `google_maps_flutter` or similar when backend is ready.
class AddressMapPlaceholder extends StatelessWidget {
  const AddressMapPlaceholder({
    super.key,
    required this.address,
    required this.onPickDemo,
  });

  final String address;
  final VoidCallback onPickDemo;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        ClipRRect(
          borderRadius: BorderRadius.circular(12),
          child: Container(
            height: 160,
            color: AppColors.surfaceContainer,
            child: Stack(
              fit: StackFit.expand,
              children: [
                CustomPaint(painter: _GridPainter()),
                Center(
                  child: Icon(Icons.map_outlined, size: 48, color: AppColors.primary.withValues(alpha: 0.35)),
                ),
                Positioned(
                  bottom: 8,
                  left: 8,
                  right: 8,
                  child: FilledButton.tonalIcon(
                    onPressed: onPickDemo,
                    icon: const Icon(Icons.my_location, size: 20),
                    label: const Text('Use demo address on map'),
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 8),
        Text(
          address,
          style: Theme.of(context).textTheme.bodyMedium,
        ),
      ],
    );
  }
}

class _GridPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = AppColors.outline.withValues(alpha: 0.25)
      ..strokeWidth = 1;
    const step = 24.0;
    for (double x = 0; x < size.width; x += step) {
      canvas.drawLine(Offset(x, 0), Offset(x, size.height), paint);
    }
    for (double y = 0; y < size.height; y += step) {
      canvas.drawLine(Offset(0, y), Offset(size.width, y), paint);
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
