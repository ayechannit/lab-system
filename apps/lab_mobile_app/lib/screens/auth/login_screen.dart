import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../app/session_scope.dart';
import '../../models/post_register_login_hint.dart';
import '../../theme/theme_extensions.dart';
import '../../services/auth_session_storage.dart';
import '../../services/rest_lab_user_api.dart';
import '../../widgets/common/app_brand_mark.dart';
import '../../widgets/common/app_toast.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key, this.routeExtra});

  /// e.g. [PostRegisterLoginHint] after successful signup.
  final Object? routeExtra;

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _email;
  late final TextEditingController _password;
  bool _remember = true;
  bool _obscurePassword = true;
  bool _submitting = false;

  @override
  void initState() {
    super.initState();
    _email = TextEditingController();
    _password = TextEditingController();
    _loadRememberedLogin();
    final ex = widget.routeExtra;
    if (ex is PostRegisterLoginHint) {
      _email.text = ex.email;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) return;
        AppToast.info(context, ex.message);
      });
    }
  }

  Future<void> _loadRememberedLogin() async {
    final remember = await AuthSessionStorage.readRememberPreference();
    final email = await AuthSessionStorage.readRememberedEmail();
    if (!mounted) return;
    setState(() {
      _remember = remember;
      if (email != null && email.isNotEmpty && _email.text.isEmpty) {
        _email.text = email;
      }
    });
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
            padding: const EdgeInsets.fromLTRB(20, 64, 20, 16),
            child: ConstrainedBox(
              constraints: BoxConstraints(minHeight: constraints.maxHeight - 72),
              child: Column(
                children: [
                  const SizedBox(height: 16),
                  AppBrandMark(
                    maxWidth: constraints.maxWidth - 40,
                  ),
                  const SizedBox(height: 28),
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
                            crossAxisAlignment: CrossAxisAlignment.center,
                            children: [
                              const Expanded(child: _FieldLabel(label: 'Password')),
                              TextButton(
                                style: TextButton.styleFrom(
                                  padding: EdgeInsets.zero,
                                  minimumSize: Size.zero,
                                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                ),
                                onPressed: () {
                                  context.push('/forgot-password', extra: _email.text.trim());
                                },
                                child: const Text('Forgot password'),
                              ),
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
                          Material(
                            color: Colors.transparent,
                            child: CheckboxListTile(
                              value: _remember,
                              onChanged: (value) {
                                setState(() => _remember = value ?? true);
                              },
                              contentPadding: EdgeInsets.zero,
                              controlAffinity: ListTileControlAffinity.leading,
                              title: Text(
                                'Keep me signed in',
                                style: Theme.of(context)
                                    .textTheme
                                    .bodyLarge
                                    ?.copyWith(color: context.cs.onSurfaceVariant),
                              ),
                              checkboxShape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
                              side: BorderSide(color: context.subtleBorder),
                            ),
                          ),
                          const SizedBox(height: 10),
                          SizedBox(
                            height: 58,
                            child: FilledButton.icon(
                              onPressed: _submitting
                                  ? null
                                  : () async {
                                      if (!_formKey.currentState!.validate()) return;
                                      setState(() => _submitting = true);
                                      try {
                                        await session.login(
                                          email: _email.text.trim(),
                                          password: _password.text,
                                          remember: _remember,
                                        );
                                        if (!context.mounted) return;
                                        context.go(session.homeRoute);
                                      } catch (e) {
                                        if (!context.mounted) return;
                                        final msg = e is LabApiException ? e.message : '$e';
                                        final pending = e is LabApiException && e.statusCode == 403;
                                        if (pending) {
                                          AppToast.warning(
                                            context,
                                            '$msg\n\nAsk lab staff to approve your account in the admin portal.',
                                            title: 'Account pending approval',
                                            duration: const Duration(seconds: 6),
                                          );
                                        } else {
                                          AppToast.error(
                                            context,
                                            msg,
                                            title: 'Couldn\'t sign in',
                                          );
                                        }
                                      } finally {
                                        if (mounted) setState(() => _submitting = false);
                                      }
                                    },
                              iconAlignment: IconAlignment.end,
                              icon: _submitting
                                  ? SizedBox(
                                      width: 20,
                                      height: 20,
                                      child: CircularProgressIndicator(
                                        strokeWidth: 2,
                                        color: context.cs.onPrimary,
                                      ),
                                    )
                                  : const Icon(Icons.arrow_forward, size: 20),
                              label: Text(_submitting ? 'Signing in…' : 'Login'),
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
                                ?.copyWith(color: context.cs.onSurfaceVariant, fontSize: 34 / 2),
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
