import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../models/user_role.dart';
import '../../theme/theme_extensions.dart';
import '../../widgets/auth/signup_role_selector.dart';

class RoleSelectionScreen extends StatefulWidget {
  const RoleSelectionScreen({super.key});

  @override
  State<RoleSelectionScreen> createState() => _RoleSelectionScreenState();
}

class _RoleSelectionScreenState extends State<RoleSelectionScreen> {
  UserRole _selected = UserRole.patient;

  @override
  Widget build(BuildContext context) {
    final cs = context.cs;

    return Scaffold(
      appBar: AppBar(
        automaticallyImplyLeading: false,
        title: const Text('Choose account type'),
      ),
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(20, 8, 20, 16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text(
                      'How will you use MedLab?',
                      style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                            fontWeight: FontWeight.w700,
                            letterSpacing: -0.3,
                          ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Pick the option that best describes you. You can change this on the signup form.',
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            color: cs.onSurfaceVariant,
                            height: 1.4,
                          ),
                    ),
                    const SizedBox(height: 22),
                    Text(
                      'Role',
                      style: Theme.of(context).textTheme.labelLarge?.copyWith(
                            color: cs.onSurfaceVariant,
                            fontWeight: FontWeight.w700,
                          ),
                    ),
                    const SizedBox(height: 8),
                    SignupRoleSelector(
                      selected: _selected,
                      onSelected: (role) => setState(() => _selected = role),
                    ),
                  ],
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  SizedBox(
                    height: 52,
                    child: FilledButton(
                      onPressed: () => context.push('/register', extra: _selected),
                      child: const Text('Continue to signup'),
                    ),
                  ),
                  TextButton(
                    onPressed: () => context.go('/login'),
                    child: const Text('Back to login'),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
