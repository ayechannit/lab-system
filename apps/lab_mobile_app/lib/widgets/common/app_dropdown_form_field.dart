import 'package:flutter/material.dart';

import '../../theme/app_colors.dart';
import '../../theme/theme_extensions.dart';
import 'app_field_decoration.dart';

/// Filled dropdown aligned with [AppFieldDecoration] (no heavy outline at rest).
class AppDropdownFormField<T> extends StatelessWidget {
  const AppDropdownFormField({
    super.key,
    required this.value,
    required this.items,
    required this.onChanged,
    this.decoration,
    this.hint,
    this.style,
    this.validator,
    this.isExpanded = true,
  });

  final T? value;
  final List<DropdownMenuItem<T>> items;
  final ValueChanged<T?>? onChanged;
  final InputDecoration? decoration;
  final Widget? hint;
  final TextStyle? style;
  final FormFieldValidator<T>? validator;
  final bool isExpanded;

  @override
  Widget build(BuildContext context) {
    final bodyStyle = style ??
        (Theme.of(context).textTheme.bodyLarge ?? Theme.of(context).textTheme.bodyMedium)
            ?.copyWith(fontWeight: FontWeight.w400);

    return DropdownButtonFormField<T>(
      value: value,
      items: items,
      onChanged: onChanged,
      isExpanded: isExpanded,
      hint: hint,
      validator: validator,
      style: bodyStyle,
      borderRadius: AppFieldDecoration.borderRadius,
      dropdownColor: context.cardFill,
      focusColor: Colors.transparent,
      icon: Icon(
        Icons.keyboard_arrow_down_rounded,
        color: context.cs.onSurfaceVariant,
        size: 22,
      ),
      decoration: decoration ?? AppFieldDecoration.build(context),
    );
  }
}

/// Tap target styled like a dropdown field (e.g. catalog picker sheet).
class AppDropdownTapField extends StatelessWidget {
  const AppDropdownTapField({
    super.key,
    required this.label,
    required this.onTap,
    this.enabled = true,
    this.hasError = false,
  });

  final String label;
  final VoidCallback onTap;
  final bool enabled;
  final bool hasError;

  @override
  Widget build(BuildContext context) {
    final cs = context.cs;
    final textStyle = Theme.of(context).textTheme.bodyLarge?.copyWith(
          fontWeight: FontWeight.w400,
          color: enabled ? cs.onSurface : cs.onSurfaceVariant,
        );

    return Material(
      color: context.appExtras.surfaceContainer,
      borderRadius: AppFieldDecoration.borderRadius,
      child: InkWell(
        onTap: enabled ? onTap : null,
        borderRadius: AppFieldDecoration.borderRadius,
        child: DecoratedBox(
          decoration: BoxDecoration(
            borderRadius: AppFieldDecoration.borderRadius,
            border: hasError
                ? Border.all(color: AppColors.error.withValues(alpha: 0.8))
                : null,
          ),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
            child: Row(
              children: [
                Expanded(child: Text(label, style: textStyle)),
                Icon(
                  Icons.keyboard_arrow_down_rounded,
                  color: cs.onSurfaceVariant.withValues(alpha: enabled ? 1 : 0.5),
                  size: 22,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
