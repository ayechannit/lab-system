import 'package:flutter/material.dart';

import '../../theme/app_colors.dart';

class AppBrandMark extends StatelessWidget {
  const AppBrandMark({
    super.key,
    this.size = 32,
    this.iconSize = 16,
    this.borderRadius = 8,
    this.showShadow = true,
  });

  final double size;
  final double iconSize;
  final double borderRadius;
  final bool showShadow;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: AppColors.primaryLight,
        borderRadius: BorderRadius.circular(borderRadius),
        boxShadow: showShadow
            ? const [
                BoxShadow(
                  color: Color(0x330052CC),
                  blurRadius: 16,
                  offset: Offset(0, 8),
                ),
              ]
            : null,
      ),
      child: Icon(Icons.biotech, color: Colors.white, size: iconSize),
    );
  }
}
