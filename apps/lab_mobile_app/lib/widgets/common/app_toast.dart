import 'package:flutter/material.dart';

import '../../theme/app_colors.dart';
import '../../theme/theme_extensions.dart';

enum AppToastKind { success, error, info, warning }

enum AppToastPosition { top, bottom }

/// Floating in-app feedback — tinted surfaces, clear hierarchy, safe placement.
abstract final class AppToast {
  static GlobalKey<NavigatorState>? navigatorKey;

  static const Duration _successDuration = Duration(milliseconds: 2600);
  static const Duration _errorDuration = Duration(milliseconds: 4500);
  static const Duration _infoDuration = Duration(milliseconds: 3200);
  static const double _minBottomMargin = 28;
  static const double _topOverlayInset = 16;

  static OverlayEntry? _topOverlay;

  static void success(
    BuildContext context,
    String message, {
    String? title,
    AppToastPosition position = AppToastPosition.top,
  }) {
    show(
      context,
      message: message,
      kind: AppToastKind.success,
      title: title,
      position: position,
    );
  }

  static void error(
    BuildContext context,
    String message, {
    String? title,
    AppToastPosition position = AppToastPosition.top,
  }) {
    show(
      context,
      message: message,
      kind: AppToastKind.error,
      title: title ?? 'Something went wrong',
      position: position,
    );
  }

  static void info(BuildContext context, String message) {
    show(context, message: message, kind: AppToastKind.info);
  }

  static void warning(
    BuildContext context,
    String message, {
    String? title,
    Duration? duration,
    AppToastPosition position = AppToastPosition.top,
  }) {
    show(
      context,
      message: message,
      kind: AppToastKind.warning,
      title: title,
      duration: duration,
      position: position,
    );
  }

  /// Tab screens — top overlay so toasts don't cover lists or bottom nav.
  static void successInShell(BuildContext context, String message, {String? title}) {
    show(
      context,
      message: message,
      kind: AppToastKind.success,
      title: title,
      position: AppToastPosition.top,
    );
  }

  static void errorInShell(BuildContext context, String message, {String? title}) {
    show(
      context,
      message: message,
      kind: AppToastKind.error,
      title: title ?? 'Something went wrong',
      position: AppToastPosition.top,
    );
  }

  static void infoInShell(BuildContext context, String message, {String? title}) {
    show(
      context,
      message: message,
      kind: AppToastKind.info,
      title: title,
      position: AppToastPosition.top,
    );
  }

  static void warningInShell(
    BuildContext context,
    String message, {
    String? title,
    Duration? duration,
  }) {
    show(
      context,
      message: message,
      kind: AppToastKind.warning,
      title: title,
      duration: duration,
      position: AppToastPosition.top,
    );
  }

  static void show(
    BuildContext context, {
    required String message,
    AppToastKind kind = AppToastKind.info,
    String? title,
    AppToastPosition position = AppToastPosition.bottom,
    double? bottomMargin,
    Duration? duration,
  }) {
    final cs = context.cs;
    final style = _styleFor(kind, cs);
    final toastDuration = duration ?? _durationFor(kind);
    final card = _ToastCard(
      style: style,
      title: title,
      message: message,
    );

    if (position == AppToastPosition.top) {
      _showTopOverlay(context, card: card, duration: toastDuration);
      return;
    }

    final messenger = ScaffoldMessenger.maybeOf(context);
    if (messenger == null) return;

    messenger.hideCurrentSnackBar();

    final edge = MediaQuery.paddingOf(context);
    final margin = EdgeInsets.fromLTRB(
      16,
      0,
      16,
      (bottomMargin ?? _minBottomMargin) + edge.bottom,
    );

    messenger.showSnackBar(
      SnackBar(
        elevation: 0,
        backgroundColor: Colors.transparent,
        padding: EdgeInsets.zero,
        margin: margin,
        behavior: SnackBarBehavior.floating,
        dismissDirection: DismissDirection.down,
        duration: toastDuration,
        content: card,
      ),
    );
  }

  static void _showTopOverlay(
    BuildContext context, {
    required _ToastCard card,
    required Duration duration,
  }) {
    _dismissTopOverlay();
    final overlay = navigatorKey?.currentState?.overlay ?? Overlay.maybeOf(context);
    if (overlay == null) return;

    final top = MediaQuery.paddingOf(context).top + _topOverlayInset;
    _topOverlay = OverlayEntry(
      builder: (ctx) => Positioned(
        top: top,
        left: 16,
        right: 16,
        child: Material(
          color: Colors.transparent,
          child: card,
        ),
      ),
    );
    overlay.insert(_topOverlay!);
    Future<void>.delayed(duration, _dismissTopOverlay);
  }

  static void _dismissTopOverlay() {
    _topOverlay?.remove();
    _topOverlay = null;
  }

  static Duration _durationFor(AppToastKind kind) {
    return switch (kind) {
      AppToastKind.success => _successDuration,
      AppToastKind.error => _errorDuration,
      AppToastKind.warning => _errorDuration,
      AppToastKind.info => _infoDuration,
    };
  }

  static _ToastStyle _styleFor(AppToastKind kind, ColorScheme cs) {
    final isDark = cs.brightness == Brightness.dark;
    return switch (kind) {
      AppToastKind.success => _ToastStyle(
          icon: Icons.check_rounded,
          accent: AppColors.accentGreen,
          background: isDark ? const Color(0xFF10251C) : const Color(0xFFEEFBF4),
          border: AppColors.accentGreen.withValues(alpha: 0.45),
          borderWidth: 1,
          iconBackground: AppColors.accentGreen,
          iconForeground: Colors.white,
          titleColor: isDark ? const Color(0xFFD8FBE8) : const Color(0xFF065F46),
          messageColor: isDark ? const Color(0xFFB7E4CE) : const Color(0xFF14532D),
        ),
      AppToastKind.error => _ToastStyle(
          icon: Icons.close_rounded,
          accent: const Color(0xFFFF5A67),
          background: isDark ? const Color(0xFF35161B) : const Color(0xFFFFF1F2),
          border: const Color(0xFFFF5A67).withValues(alpha: 0.55),
          borderWidth: 1.2,
          iconBackground: const Color(0xFFE11D48),
          iconForeground: Colors.white,
          titleColor: isDark ? const Color(0xFFFFD5DA) : const Color(0xFF9F1239),
          messageColor: isDark ? const Color(0xFFFECDD3) : const Color(0xFF881337),
        ),
      AppToastKind.warning => _ToastStyle(
          icon: Icons.priority_high_rounded,
          accent: AppColors.warningLow,
          background: isDark ? const Color(0xFF2B1E10) : const Color(0xFFFFF7ED),
          border: AppColors.warningLow.withValues(alpha: 0.5),
          borderWidth: 1,
          iconBackground: AppColors.warningLow,
          iconForeground: Colors.white,
          titleColor: isDark ? const Color(0xFFFFE4C7) : const Color(0xFF9A3412),
          messageColor: isDark ? const Color(0xFFFED7AA) : const Color(0xFF7C2D12),
        ),
      AppToastKind.info => _ToastStyle(
          icon: Icons.info_outline_rounded,
          accent: cs.primary,
          background: isDark ? const Color(0xFF152238) : const Color(0xFFEFF4FF),
          border: cs.primary.withValues(alpha: 0.4),
          borderWidth: 1,
          iconBackground: cs.primary,
          iconForeground: Colors.white,
          titleColor: isDark ? const Color(0xFFD6E6FF) : cs.primary,
          messageColor: isDark ? const Color(0xFFB8CCEB) : const Color(0xFF1E3A8A),
        ),
    };
  }
}

class _ToastCard extends StatelessWidget {
  const _ToastCard({
    required this.style,
    required this.message,
    this.title,
  });

  final _ToastStyle style;
  final String? title;
  final String message;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: style.background,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: style.border, width: style.borderWidth),
        boxShadow: [
          BoxShadow(
            color: style.accent.withValues(alpha: 0.18),
            blurRadius: 20,
            offset: const Offset(0, 10),
          ),
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.28),
            blurRadius: 14,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(15),
        child: IntrinsicHeight(
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Container(width: 4, color: style.accent),
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(14, 14, 12, 14),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        width: 36,
                        height: 36,
                        decoration: BoxDecoration(
                          color: style.iconBackground,
                          borderRadius: BorderRadius.circular(11),
                        ),
                        child: Icon(
                          style.icon,
                          color: style.iconForeground,
                          size: 20,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            if (title != null && title!.trim().isNotEmpty) ...[
                              Text(
                                title!,
                                style: Theme.of(context).textTheme.titleSmall?.copyWith(
                                      color: style.titleColor,
                                      fontWeight: FontWeight.w700,
                                    ),
                              ),
                              const SizedBox(height: 2),
                            ],
                            Text(
                              message,
                              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                    color: style.messageColor,
                                    height: 1.4,
                                    fontWeight: FontWeight.w500,
                                  ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ToastStyle {
  const _ToastStyle({
    required this.icon,
    required this.accent,
    required this.background,
    required this.border,
    required this.borderWidth,
    required this.iconBackground,
    required this.iconForeground,
    required this.titleColor,
    required this.messageColor,
  });

  final IconData icon;
  final Color accent;
  final Color background;
  final Color border;
  final double borderWidth;
  final Color iconBackground;
  final Color iconForeground;
  final Color titleColor;
  final Color messageColor;
}
