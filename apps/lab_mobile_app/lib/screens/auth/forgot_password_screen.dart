import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';

import '../../app/session_scope.dart';
import '../../services/rest_lab_user_api.dart';
import '../../services/session_controller.dart';
import '../../theme/theme_extensions.dart';
import '../../widgets/common/app_brand_mark.dart';
import '../../widgets/common/app_toast.dart';
import '../../widgets/auth/auth_preference_controls.dart';

class ForgotPasswordScreen extends StatefulWidget {
  const ForgotPasswordScreen({super.key, this.initialEmail});

  final String? initialEmail;

  @override
  State<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends State<ForgotPasswordScreen> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _email;
  late final TextEditingController _code;
  late final TextEditingController _newPassword;
  late final TextEditingController _confirmPassword;

  bool _stepReset = false;
  bool _obscurePassword = true;
  bool _submitting = false;

  @override
  void initState() {
    super.initState();
    _email = TextEditingController(text: widget.initialEmail?.trim() ?? '');
    _code = TextEditingController();
    _newPassword = TextEditingController();
    _confirmPassword = TextEditingController();
  }

  @override
  void dispose() {
    _email.dispose();
    _code.dispose();
    _newPassword.dispose();
    _confirmPassword.dispose();
    super.dispose();
  }

  Future<void> _sendCode(SessionController session) async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _submitting = true);
    try {
      final msg = await session.requestPasswordReset(_email.text.trim());
      if (!mounted) return;
      setState(() => _stepReset = true);
      AppToast.success(context, msg, title: 'Code sent');
    } catch (e) {
      if (!mounted) return;
      AppToast.error(
        context,
        e is LabApiException ? e.message : '$e',
        title: 'Could not send code',
      );
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  Future<void> _resetPassword(SessionController session) async {
    if (!_formKey.currentState!.validate()) return;
    if (_newPassword.text.length < 8) {
      AppToast.error(context, 'Password must be at least 8 characters.');
      return;
    }
    if (_newPassword.text != _confirmPassword.text) {
      AppToast.error(context, 'Passwords do not match.');
      return;
    }
    setState(() => _submitting = true);
    try {
      final msg = await session.resetPasswordWithCode(
        email: _email.text.trim(),
        code: _code.text.trim(),
        newPassword: _newPassword.text,
      );
      if (!mounted) return;
      AppToast.success(context, msg, title: 'Password updated');
      context.go('/login');
    } catch (e) {
      if (!mounted) return;
      AppToast.error(
        context,
        e is LabApiException ? e.message : '$e',
        title: 'Reset failed',
      );
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  Future<void> _resendCode(SessionController session) async {
    setState(() => _submitting = true);
    try {
      final msg = await session.requestPasswordReset(_email.text.trim());
      if (!mounted) return;
      _code.clear();
      AppToast.success(context, msg, title: 'Code sent again');
    } catch (e) {
      if (!mounted) return;
      AppToast.error(
        context,
        e is LabApiException ? e.message : '$e',
        title: 'Could not resend',
      );
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final session = SessionScope.of(context);

    return Scaffold(
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const AuthPreferenceControls(),
            Expanded(
              child: LayoutBuilder(
                builder: (context, constraints) => SingleChildScrollView(
                  padding: const EdgeInsets.fromLTRB(20, 16, 20, 16),
                  child: ConstrainedBox(
                    constraints: BoxConstraints(minHeight: constraints.maxHeight - 16),
                    child: Column(
                      children: [
                        AppBrandMark(maxWidth: constraints.maxWidth - 40),
                  const SizedBox(height: 18),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: context.cardFill,
                      borderRadius: BorderRadius.circular(24),
                      border: Border.all(color: context.cs.outline.withValues(alpha: 0.5)),
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
                          Align(
                            alignment: Alignment.centerLeft,
                            child: Icon(
                              _stepReset ? Icons.pin_outlined : Icons.mark_email_unread_outlined,
                              size: 40,
                              color: context.cs.primary,
                            ),
                          ),
                          const SizedBox(height: 12),
                          Text(
                            _stepReset ? 'Reset password' : 'Forgot password',
                            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                                  fontWeight: FontWeight.w700,
                                ),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            _stepReset
                                ? 'Enter the 6-digit code sent to your email and choose a new password.'
                                : 'We will email you a 6-digit code (valid for 15 minutes).',
                            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                  color: context.cs.onSurfaceVariant,
                                  height: 1.4,
                                ),
                          ),
                          const SizedBox(height: 18),
                          if (!_stepReset) ...[
                            const _FieldLabel(label: 'Email'),
                            _InputShell(
                              child: TextFormField(
                                controller: _email,
                                decoration: const InputDecoration(
                                  prefixIcon: Icon(Icons.mail_outline),
                                  border: InputBorder.none,
                                  enabledBorder: InputBorder.none,
                                  focusedBorder: InputBorder.none,
                                  filled: false,
                                ),
                                keyboardType: TextInputType.emailAddress,
                                textInputAction: TextInputAction.done,
                                validator: (v) {
                                  final t = (v ?? '').trim();
                                  if (t.isEmpty) return 'Enter your email';
                                  if (!t.contains('@')) return 'Enter a valid email';
                                  return null;
                                },
                                onFieldSubmitted: (_) {
                                  if (!_submitting) _sendCode(session);
                                },
                              ),
                            ),
                            const SizedBox(height: 16),
                            SizedBox(
                              height: 58,
                              child: FilledButton(
                                onPressed: _submitting ? null : () => _sendCode(session),
                                child: Text(_submitting ? 'Sending…' : 'Send code'),
                              ),
                            ),
                          ] else ...[
                            const _FieldLabel(label: 'Verification code'),
                            _InputShell(
                              child: TextFormField(
                                controller: _code,
                                decoration: const InputDecoration(
                                  prefixIcon: Icon(Icons.pin_outlined),
                                  hintText: '000000',
                                  border: InputBorder.none,
                                  enabledBorder: InputBorder.none,
                                  focusedBorder: InputBorder.none,
                                  filled: false,
                                ),
                                keyboardType: TextInputType.number,
                                textInputAction: TextInputAction.next,
                                inputFormatters: [
                                  FilteringTextInputFormatter.digitsOnly,
                                  LengthLimitingTextInputFormatter(6),
                                ],
                                validator: (v) {
                                  if ((v ?? '').trim().length != 6) {
                                    return 'Enter the 6-digit code';
                                  }
                                  return null;
                                },
                              ),
                            ),
                            const SizedBox(height: 14),
                            const _FieldLabel(label: 'New password'),
                            _InputShell(
                              child: TextFormField(
                                controller: _newPassword,
                                obscureText: _obscurePassword,
                                decoration: InputDecoration(
                                  prefixIcon: const Icon(Icons.lock_outline),
                                  suffixIcon: IconButton(
                                    onPressed: () {
                                      setState(() => _obscurePassword = !_obscurePassword);
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
                                textInputAction: TextInputAction.next,
                                validator: (v) {
                                  if ((v ?? '').length < 8) {
                                    return 'At least 8 characters';
                                  }
                                  return null;
                                },
                              ),
                            ),
                            const SizedBox(height: 14),
                            const _FieldLabel(label: 'Confirm password'),
                            _InputShell(
                              child: TextFormField(
                                controller: _confirmPassword,
                                obscureText: _obscurePassword,
                                decoration: const InputDecoration(
                                  prefixIcon: Icon(Icons.lock_reset_outlined),
                                  border: InputBorder.none,
                                  enabledBorder: InputBorder.none,
                                  focusedBorder: InputBorder.none,
                                  filled: false,
                                ),
                                textInputAction: TextInputAction.done,
                                validator: (v) {
                                  if ((v ?? '').isEmpty) return 'Confirm your password';
                                  return null;
                                },
                                onFieldSubmitted: (_) {
                                  if (!_submitting) _resetPassword(session);
                                },
                              ),
                            ),
                            const SizedBox(height: 16),
                            SizedBox(
                              height: 58,
                              child: FilledButton(
                                onPressed: _submitting ? null : () => _resetPassword(session),
                                child: Text(_submitting ? 'Updating…' : 'Reset password'),
                              ),
                            ),
                            const SizedBox(height: 8),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                TextButton(
                                  onPressed: _submitting
                                      ? null
                                      : () {
                                          setState(() {
                                            _stepReset = false;
                                            _code.clear();
                                            _newPassword.clear();
                                            _confirmPassword.clear();
                                          });
                                        },
                                  child: const Text('Change email'),
                                ),
                                TextButton(
                                  onPressed: _submitting ? null : () => _resendCode(session),
                                  child: const Text('Resend code'),
                                ),
                              ],
                            ),
                          ],
                          const SizedBox(height: 8),
                          TextButton(
                            onPressed: _submitting ? null : () => context.go('/login'),
                            child: const Text('Back to login'),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
                    ),
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
              color: context.cs.onSurfaceVariant,
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
        color: context.appExtras.surfaceContainer,
        borderRadius: BorderRadius.circular(16),
      ),
      child: child,
    );
  }
}
