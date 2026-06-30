import 'dart:typed_data';

import 'package:flutter/material.dart';

import '../../theme/theme_extensions.dart';

/// Circular profile avatar with optional photo, initial fallback, and edit badge.
class UserProfileAvatar extends StatelessWidget {
  const UserProfileAvatar({
    super.key,
    required this.name,
    this.imageUrl,
    this.previewBytes,
    this.radius = 48,
    this.onEditTap,
    this.showEditBadge = false,
  });

  final String name;
  final String? imageUrl;
  final Uint8List? previewBytes;
  final double radius;
  final VoidCallback? onEditTap;
  final bool showEditBadge;

  @override
  Widget build(BuildContext context) {
    final cs = context.cs;
    final initial = name.trim().isNotEmpty ? name.trim()[0].toUpperCase() : '?';
    final innerRadius = radius - 5;

    Widget avatarContent;
    if (previewBytes != null && previewBytes!.isNotEmpty) {
      avatarContent = CircleAvatar(
        radius: innerRadius,
        backgroundImage: MemoryImage(previewBytes!),
      );
    } else if (imageUrl != null && imageUrl!.trim().isNotEmpty) {
      avatarContent = CircleAvatar(
        radius: innerRadius,
        backgroundImage: NetworkImage(imageUrl!),
        onBackgroundImageError: (_, __) {},
        child: null,
      );
    } else {
      avatarContent = CircleAvatar(
        radius: innerRadius,
        backgroundColor: cs.primary.withValues(alpha: 0.85),
        child: Text(
          initial,
          style: TextStyle(
            fontSize: innerRadius * 0.84,
            color: cs.onPrimary,
            fontWeight: FontWeight.w700,
          ),
        ),
      );
    }

    final stack = Stack(
      clipBehavior: Clip.none,
      children: [
        CircleAvatar(
          radius: radius,
          backgroundColor: cs.primary.withValues(alpha: 0.12),
          child: avatarContent,
        ),
        if (showEditBadge)
          Positioned(
            right: -2,
            bottom: -2,
            child: Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: cs.primary,
                shape: BoxShape.circle,
                border: Border.all(color: cs.surface, width: 2),
                boxShadow: const [
                  BoxShadow(color: Color(0x140052CC), blurRadius: 8, offset: Offset(0, 2)),
                ],
              ),
              child: Icon(Icons.edit_outlined, size: radius * 0.38, color: cs.onPrimary),
            ),
          ),
      ],
    );

    if (onEditTap == null) return stack;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onEditTap,
        customBorder: CircleBorder(
          side: BorderSide(color: cs.primary.withValues(alpha: 0.08)),
        ),
        child: stack,
      ),
    );
  }
}
