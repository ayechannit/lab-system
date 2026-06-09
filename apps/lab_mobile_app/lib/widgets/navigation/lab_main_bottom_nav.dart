import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../app/session_scope.dart';
import '../../theme/theme_extensions.dart';

/// Which tab is highlighted in the pill nav (use [none] when no tab matches the current screen).
enum LabMainTab {
  home,
  orders,
  results,
  points,
  profile,
  none,
}

/// Rounded “pill” bottom bar: HOME · ORDERS · RESULTS · POINTS · PROFILE (matches main app shell).
class LabMainBottomNav extends StatelessWidget {
  const LabMainBottomNav({super.key, required this.current});

  final LabMainTab current;

  bool _active(LabMainTab tab) => current != LabMainTab.none && current == tab;

  void _onTap(BuildContext context, LabMainTab tab) {
    final session = SessionScope.of(context);
    if (tab != LabMainTab.home && tab == current) return;
    switch (tab) {
      case LabMainTab.none:
        return;
      case LabMainTab.home:
        context.go(session.homeRoute);
        break;
      case LabMainTab.orders:
        context.go('/orders');
        break;
      case LabMainTab.results:
        context.go('/lab-results');
        break;
      case LabMainTab.points:
        context.push('/loyalty');
        break;
      case LabMainTab.profile:
        context.push('/profile');
        break;
    }
  }

  @override
  Widget build(BuildContext context) {
    final cs = context.cs;
    return SafeArea(
      top: false,
      minimum: const EdgeInsets.fromLTRB(14, 0, 14, 14),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 8),
        decoration: BoxDecoration(
          color: context.cardFill,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: cs.outline.withValues(alpha: 0.45)),
        ),
        child: Row(
          children: [
            Expanded(
              child: _NavCell(
                icon: Icons.grid_view_rounded,
                label: 'HOME',
                active: _active(LabMainTab.home),
                onTap: () => _onTap(context, LabMainTab.home),
              ),
            ),
            Expanded(
              child: _NavCell(
                icon: Icons.biotech_outlined,
                label: 'ORDERS',
                active: _active(LabMainTab.orders),
                onTap: () => _onTap(context, LabMainTab.orders),
              ),
            ),
            Expanded(
              child: _NavCell(
                icon: Icons.assignment_outlined,
                label: 'RESULTS',
                active: _active(LabMainTab.results),
                onTap: () => _onTap(context, LabMainTab.results),
              ),
            ),
            Expanded(
              child: _NavCell(
                icon: Icons.military_tech_outlined,
                label: 'POINTS',
                active: _active(LabMainTab.points),
                onTap: () => _onTap(context, LabMainTab.points),
              ),
            ),
            Expanded(
              child: _NavCell(
                icon: Icons.person_outline,
                label: 'PROFILE',
                active: _active(LabMainTab.profile),
                onTap: () => _onTap(context, LabMainTab.profile),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _NavCell extends StatelessWidget {
  const _NavCell({
    required this.icon,
    required this.label,
    required this.active,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final bool active;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final cs = context.cs;
    final extras = context.appExtras;
    final fg = active ? cs.primary : cs.onSurfaceVariant;
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 2, vertical: 2),
          child: DecoratedBox(
            decoration: BoxDecoration(
              color: active ? extras.navActiveBackground : Colors.transparent,
              borderRadius: BorderRadius.circular(14),
            ),
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 2),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  Icon(icon, size: 22, color: fg),
                  const SizedBox(height: 4),
                  FittedBox(
                    fit: BoxFit.scaleDown,
                    child: Text(
                      label,
                      maxLines: 1,
                      textAlign: TextAlign.center,
                      style: Theme.of(context).textTheme.labelSmall?.copyWith(
                            color: fg,
                            fontWeight: active ? FontWeight.w800 : FontWeight.w600,
                            letterSpacing: 0.2,
                          ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
