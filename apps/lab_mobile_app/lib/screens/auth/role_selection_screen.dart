import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../app/session_scope.dart';
import '../../models/user_role.dart';
import '../../theme/app_colors.dart';

class RoleSelectionScreen extends StatelessWidget {
  const RoleSelectionScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final session = SessionScope.of(context);
    return Scaffold(
      appBar: AppBar(
        automaticallyImplyLeading: false,
        title: const Text('Select role'),
      ),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              'How will you use MedLab?',
              style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 8),
            Text(
              'Role: Patient / Doctor / Clinic',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: AppColors.onSurfaceVariant),
            ),
            const SizedBox(height: 24),
            ...UserRole.values.map(
              (r) => Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Card(
                  child: ListTile(
                    title: Text(r.label),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () async {
                      await session.register(
                        name: 'User',
                        phone: '+95 9 000 000 000',
                        email: '${r.name}@example.com',
                        password: 'password',
                        role: r,
                      );
                      if (!context.mounted) return;
                      context.go(session.homeRoute);
                    },
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
