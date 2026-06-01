import 'package:flutter/material.dart';


class AppBrandMark extends StatelessWidget {
  const AppBrandMark({
    super.key,
    this.size = 32,
    this.iconSize = 16,
    this.borderRadius = 8,
    this.showShadow = true,
    this.logoUrl,
  });

  final double size;
  final double iconSize;
  final double borderRadius;
  final bool showShadow;
  final String? logoUrl;

  @override
  Widget build(BuildContext context) {
    final url = logoUrl?.trim();
    if (url != null && url.isNotEmpty) {
      return Image.network(
        url,
        width: size,
        height: size,
        fit: BoxFit.contain,
        errorBuilder: (_, __, ___) => _defaultMark(context),
      );
    }
    return _defaultMark(context);
  }

  Widget _defaultMark(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: cs.primary.withValues(alpha: 0.85),
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
      child: Icon(Icons.biotech, color: cs.onPrimary, size: iconSize),
    );
  }
}
