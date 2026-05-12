import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../app/session_scope.dart';
import '../../theme/app_colors.dart';
import '../../widgets/common/app_brand_mark.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _email;
  late final TextEditingController _password;
  bool _remember = false;
  bool _obscurePassword = true;

  @override
  void initState() {
    super.initState();
    _email = TextEditingController();
    _password = TextEditingController();
  }

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final session = SessionScope.of(context);
    return Scaffold(
      body: SafeArea(
        child: LayoutBuilder(
          builder: (context, constraints) => SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(20, 40, 20, 16),
            child: ConstrainedBox(
              constraints: BoxConstraints(minHeight: constraints.maxHeight - 32),
              child: Column(
                children: [
                  const AppBrandMark(
                    size: 64,
                    iconSize: 30,
                    borderRadius: 16,
                    showShadow: true,
                  ),
                  const SizedBox(height: 14),
                  Text(
                    'MedLab Smart',
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.headlineMedium?.copyWith(color: AppColors.primary),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    'Sign in with your clinic, doctor, or patient account (email and password). '
                    'Your role is determined by the server.',
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.bodyLarge?.copyWith(color: AppColors.onSurfaceVariant),
                  ),
                  const SizedBox(height: 22),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(24),
                      border: Border.all(color: const Color(0x80E1E2EC)),
                      boxShadow: const [
                        BoxShadow(
                          color: Color(0x14000000),
                          blurRadius: 28,
                          offset: Offset(0, 8),
                        ),
                      ],
                    ),
                    child: Form(
                      key: _formKey,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          const _FieldLabel(label: 'Email'),
                          _InputShell(
                            child: TextFormField(
                              controller: _email,
                              autovalidateMode: AutovalidateMode.onUserInteraction,
                              decoration: const InputDecoration(
                                prefixIcon: Icon(Icons.mail_outline),
                                border: InputBorder.none,
                                enabledBorder: InputBorder.none,
                                focusedBorder: InputBorder.none,
                                filled: false,
                              ),
                              keyboardType: TextInputType.emailAddress,
                              textInputAction: TextInputAction.next,
                              validator: (v) {
                                final t = (v ?? '').trim();
                                if (t.isEmpty) return 'Enter your email';
                                if (!t.contains('@')) return 'Enter a valid email';
                                return null;
                              },
                            ),
                          ),
                          const SizedBox(height: 14),
                          Row(
                            children: [
                              const Expanded(child: _FieldLabel(label: 'Password')),
                              TextButton(onPressed: () {}, child: const Text('Forgot?')),
                            ],
                          ),
                          _InputShell(
                            child: TextFormField(
                              controller: _password,
                              obscureText: _obscurePassword,
                              autovalidateMode: AutovalidateMode.onUserInteraction,
                              decoration: InputDecoration(
                                prefixIcon: const Icon(Icons.lock_outline),
                                suffixIcon: IconButton(
                                  onPressed: () {
                                    setState(() {
                                      _obscurePassword = !_obscurePassword;
                                    });
                                  },
                                  icon: Icon(
                                    _obscurePassword
                                        ? Icons.visibility_outlined
                                        : Icons.visibility_off_outlined,
                                  ),
                                ),
                                border: InputBorder.none,
                                enabledBorder: InputBorder.none,
                                focusedBorder: InputBorder.none,
                                filled: false,
                              ),
                              textInputAction: TextInputAction.done,
                              validator: (v) {
                                if ((v ?? '').isEmpty) return 'Enter your password';
                                return null;
                              },
                            ),
                          ),
                          const SizedBox(height: 10),
                          CheckboxListTile(
                            value: _remember,
                            onChanged: (value) => setState(() => _remember = value ?? false),
                            contentPadding: EdgeInsets.zero,
                            controlAffinity: ListTileControlAffinity.leading,
                            title: Text(
                              'Remember this device',
                              style: Theme.of(context)
                                  .textTheme
                                  .bodyLarge
                                  ?.copyWith(color: AppColors.onSurfaceVariant),
                            ),
                            checkboxShape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
                            side: const BorderSide(color: AppColors.outline),
                          ),
                          const SizedBox(height: 10),
                          SizedBox(
                            height: 58,
                            child: FilledButton.icon(
                              onPressed: () async {
                                if (!_formKey.currentState!.validate()) return;
                                try {
                                  await session.login(
                                    email: _email.text.trim(),
                                    password: _password.text,
                                  );
                                  if (!context.mounted) return;
                                  context.go(session.homeRoute);
                                } catch (e) {
                                  if (!context.mounted) return;
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    SnackBar(content: Text('$e')),
                                  );
                                }
                              },
                              iconAlignment: IconAlignment.end,
                              icon: const Icon(Icons.arrow_forward, size: 20),
                              label: const Text('Login'),
                            ),
                          ),
                          const SizedBox(height: 20),
                          const Divider(height: 1),
                          const SizedBox(height: 18),
                          Text(
                            "Don't have an account?",
                            textAlign: TextAlign.center,
                            style: Theme.of(context)
                                .textTheme
                                .headlineSmall
                                ?.copyWith(color: AppColors.onSurfaceVariant, fontSize: 34 / 2),
                          ),
                          const SizedBox(height: 12),
                          SizedBox(
                            height: 58,
                            child: OutlinedButton(
                              onPressed: () => context.push('/register'),
                              child: const Text('Create New Account'),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 18),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _FieldLabel extends StatelessWidget {
  const _FieldLabel({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(left: 2, bottom: 6),
      child: Text(
        label,
        style: Theme.of(context).textTheme.labelLarge?.copyWith(
              color: AppColors.onSurfaceVariant,
              fontWeight: FontWeight.w700,
            ),
      ),
    );
  }
}

class _InputShell extends StatelessWidget {
  const _InputShell({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFFF1F1FB),
        borderRadius: BorderRadius.circular(16),
      ),
      child: child,
    );
  }
}
