import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../app/app_settings_scope.dart';
import '../../app/session_scope.dart';
import '../../theme/theme_extensions.dart';
import '../../widgets/common/app_brand_mark.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> with SingleTickerProviderStateMixin {
  late final AnimationController _loadingController;

  @override
  void initState() {
    super.initState();
    _loadingController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    )..repeat();
    Timer(const Duration(milliseconds: 1400), () {
      if (!mounted) return;
      final session = SessionScope.of(context);
      context.go(session.isLoggedIn ? session.homeRoute : '/login');
    });
  }

  @override
  void dispose() {
    _loadingController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final cs = context.cs;
    final extras = context.appExtras;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: cs.surface,
      body: SizedBox.expand(
        child: DecoratedBox(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: isDark
                  ? [cs.surface, extras.surfaceContainer]
                  : [cs.surface, extras.surfaceContainer.withValues(alpha: 0.65)],
            ),
          ),
          child: SafeArea(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Spacer(flex: 3),
                  Center(
                    child: AppBrandMark(
                      size: 112,
                      iconSize: 52,
                      borderRadius: 28,
                      showShadow: true,
                      logoUrl: AppSettingsScope.of(context).logoUrl,
                    ),
                  ),
                  const SizedBox(height: 24),
                  Text(
                    AppSettingsScope.of(context).labName,
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                          color: cs.primary,
                          fontWeight: FontWeight.w800,
                        ),
                  ),
                  const Spacer(flex: 4),
                  Align(
                    alignment: Alignment.center,
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(99),
                      child: Container(
                        width: 240,
                        height: 4,
                        color: cs.outline.withValues(alpha: isDark ? 0.45 : 0.35),
                        child: AnimatedBuilder(
                          animation: _loadingController,
                          builder: (context, _) {
                            return Transform.translate(
                              offset: Offset((-76) + (240 + 76) * _loadingController.value, 0),
                              child: Align(
                                alignment: Alignment.centerLeft,
                                child: Container(
                                  width: 76,
                                  height: 4,
                                  decoration: BoxDecoration(
                                    color: cs.primary,
                                    borderRadius: BorderRadius.circular(99),
                                  ),
                                ),
                              ),
                            );
                          },
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'Loading…',
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: cs.onSurfaceVariant,
                        ),
                  ),
                  const SizedBox(height: 12),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
