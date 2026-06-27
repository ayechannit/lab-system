import 'package:flutter/material.dart';

import '../../constants/brand_assets.dart';
import 'app_brand_mark.dart';

/// IDHC lockup for in-app app bars (always bundled — not the server logo).
class AppBrandingRow extends StatelessWidget {
  const AppBrandingRow({
    super.key,
    this.size = 32,
  });

  final double size;

  @override
  Widget build(BuildContext context) {
    return Transform.translate(
      offset: const Offset(-6, 0),
      child: AppBrandMark(
        style: AppBrandMarkStyle.lockup,
        height: size,
        maxWidth: size * 4.2,
      ),
    );
  }
}
