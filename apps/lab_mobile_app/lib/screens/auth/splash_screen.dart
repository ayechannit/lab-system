import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../app/session_scope.dart';
import '../../theme/app_colors.dart';

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
      body: Container(
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
              children: [
                const Spacer(flex: 3),
                Container(
                  width: 112,
                  height: 112,
                  decoration: BoxDecoration(
                    color: AppColors.primaryLight,
                    borderRadius: BorderRadius.circular(28),
                    boxShadow: const [
                      BoxShadow(
                        color: Color(0x1A003D9B),
                        blurRadius: 24,
                        offset: Offset(0, 10),
                      ),
                    ],
                    border: Border.all(color: const Color(0x330052CC)),
                  ),
                  alignment: Alignment.center,
                  child: const Icon(Icons.biotech, size: 52, color: Colors.white),
                ),
                const SizedBox(height: 24),
                Text.rich(
                  TextSpan(
                    children: [
                      TextSpan(
                        text: 'MedLab',
                        style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                              color: const Color(0xFF121523),
                              fontWeight: FontWeight.w800,
                            ),
                      ),
                      TextSpan(
                        text: ' Smart',
                        style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                              color: AppColors.primaryLight,
                              fontWeight: FontWeight.w800,
                            ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  'SMART HEALTHCARE LAB SERVICES',
                  style: Theme.of(context).textTheme.labelLarge?.copyWith(
                        color: AppColors.onSurfaceVariant,
                        letterSpacing: 1.1,
                      ),
                ),
                const Spacer(flex: 4),
                ClipRRect(
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
                const SizedBox(height: 16),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.verified_user_outlined,
                        size: 18, color: AppColors.onSurfaceVariant.withValues(alpha: 0.75)),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        'CLINICALLY VALIDATED PLATFORM',
                        textAlign: TextAlign.center,
                        maxLines: 2,
                        softWrap: true,
                        style: Theme.of(context).textTheme.labelLarge?.copyWith(
                              color: AppColors.onSurfaceVariant.withValues(alpha: 0.75),
                              letterSpacing: 0.8,
                            ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
