import 'package:flutter/widgets.dart';

import '../services/user_theme_controller.dart';

class UserThemeScope extends InheritedNotifier<UserThemeController> {
  const UserThemeScope({
    super.key,
    required UserThemeController controller,
    required super.child,
  }) : super(notifier: controller);

  static UserThemeController of(BuildContext context) {
    final scope = context.dependOnInheritedWidgetOfExactType<UserThemeScope>();
    assert(scope != null, 'UserThemeScope not found');
    return scope!.notifier!;
  }
}
