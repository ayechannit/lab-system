import 'package:flutter/material.dart';

import '../../constants/brand_assets.dart';

/// Lab branding: full IDHC logo on auth screens, lockup inside the app.
class AppBrandMark extends StatelessWidget {
  const AppBrandMark({
    super.key,
    this.style = AppBrandMarkStyle.fullLogo,
    this.height = 40,
    this.maxWidth = 220,
    this.showShadow = false,
    this.logoUrl,
  });

  final AppBrandMarkStyle style;
  final double height;
  final double maxWidth;
  final bool showShadow;
  /// Remote logo from system settings; used only for [AppBrandMarkStyle.fullLogo].
  final String? logoUrl;

  @override
  Widget build(BuildContext context) {
    final Widget image = _buildImage();

    if (!showShadow) return image;

    return DecoratedBox(
      decoration: BoxDecoration(
        boxShadow: [
          BoxShadow(
            color: Theme.of(context).colorScheme.primary.withValues(alpha: 0.18),
            blurRadius: 16,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: image,
    );
  }

  Widget _buildImage() {
    if (style == AppBrandMarkStyle.lockup) {
      return Image.asset(
        BrandAssets.idhcLockup,
        height: height,
        width: maxWidth,
        fit: BoxFit.contain,
        filterQuality: FilterQuality.high,
      );
    }

    final url = logoUrl?.trim();
    if (url != null && url.isNotEmpty) {
      return Image.network(
        url,
        width: maxWidth,
        height: height,
        fit: BoxFit.contain,
        errorBuilder: (_, __, ___) => _bundledFullLogo(),
      );
    }
    return _bundledFullLogo();
  }

  Widget _bundledFullLogo() {
    return Image.asset(
      BrandAssets.idhcLogoMobile,
      width: maxWidth,
      fit: BoxFit.contain,
      filterQuality: FilterQuality.high,
    );
  }
}
