import 'package:flutter/material.dart';

import '../../models/user_role.dart';
import '../../theme/theme_extensions.dart';

/// Role dropdown for signup — matches register form field styling.
class SignupRoleSelector extends StatelessWidget {
  const SignupRoleSelector({
    super.key,
    required this.selected,
    required this.onSelected,
  });

  final UserRole selected;
  final ValueChanged<UserRole> onSelected;

  @override
  Widget build(BuildContext context) {
    final cs = context.cs;
    final textStyle = Theme.of(context).textTheme.bodyLarge?.copyWith(
          color: cs.onSurface,
          height: 1.2,
        );

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _RegisterInputShell(
          child: DropdownButtonFormField<UserRole>(
            value: selected,
            isExpanded: true,
            isDense: true,
            icon: Padding(
              padding: const EdgeInsets.only(right: 4),
              child: Icon(Icons.keyboard_arrow_down_rounded, color: cs.onSurfaceVariant),
            ),
            decoration: InputDecoration(
              prefixIcon: Icon(
                selected.icon,
                color: selected.accentColor,
              ),
              border: InputBorder.none,
              enabledBorder: InputBorder.none,
              focusedBorder: InputBorder.none,
              filled: false,
              contentPadding: const EdgeInsets.symmetric(horizontal: 0, vertical: 14),
            ),
            selectedItemBuilder: (context) => [
              for (final role in UserRole.values)
                Align(
                  alignment: Alignment.centerLeft,
                  child: Text(role.label, style: textStyle),
                ),
            ],
            items: [
              for (final role in UserRole.values)
                DropdownMenuItem(
                  value: role,
                  child: _RoleDropdownMenuItem(role: role),
                ),
            ],
            onChanged: (role) {
              if (role != null) onSelected(role);
            },
          ),
        ),
        const SizedBox(height: 8),
        Text(
          selected.signupDescription,
          style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: cs.onSurfaceVariant,
                height: 1.35,
              ),
        ),
        if (selected.requiresStaffApproval) ...[
          const SizedBox(height: 10),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            decoration: BoxDecoration(
              color: cs.primary.withValues(alpha: 0.06),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: cs.primary.withValues(alpha: 0.14)),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(Icons.verified_user_outlined, size: 18, color: cs.primary),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    'Professional accounts need lab staff approval before you can sign in.',
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: cs.onSurfaceVariant,
                          height: 1.35,
                        ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ],
    );
  }
}

class _RegisterInputShell extends StatelessWidget {
  const _RegisterInputShell({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFFF8F8FD),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFD4D7E2)),
      ),
      child: child,
    );
  }
}

class _RoleDropdownMenuItem extends StatelessWidget {
  const _RoleDropdownMenuItem({required this.role});

  final UserRole role;

  @override
  Widget build(BuildContext context) {
    final cs = context.cs;
    final accent = role.accentColor;

    return Row(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        Container(
          width: 32,
          height: 32,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: accent.withValues(alpha: 0.12),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Icon(role.icon, size: 18, color: accent),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                role.label,
                style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                      fontWeight: FontWeight.w600,
                      color: cs.onSurface,
                      height: 1.2,
                    ),
              ),
              const SizedBox(height: 2),
              Text(
                role.signupDescription,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: cs.onSurfaceVariant,
                      height: 1.25,
                    ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
