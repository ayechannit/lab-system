import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../app/app_settings_scope.dart';
import '../../app/session_scope.dart';
import '../../theme/app_colors.dart';
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
    return Scaffold(
      body: SizedBox.expand(
        child: DecoratedBox(
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: [Color(0xFFF3F2FB), Color(0xFFF7F6FD)],
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
                          color: const Color(0xFF121523),
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
                        color: const Color(0xFFE7E8F2),
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
                                    color: AppColors.primaryLight,
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
                          color: context.cs.onSurfaceVariant.withValues(alpha: 0.85),
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
