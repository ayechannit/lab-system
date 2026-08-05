import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../app/session_scope.dart';
import '../../models/post_register_login_hint.dart';
import '../../l10n/app_localizations.dart';
import '../../theme/theme_extensions.dart';
import '../../services/auth_session_storage.dart';
import '../../services/rest_lab_user_api.dart';
import '../../utils/phone_input.dart';
import '../../widgets/common/app_brand_mark.dart';
import '../../widgets/common/app_toast.dart';
import '../../widgets/auth/auth_preference_controls.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key, this.routeExtra});

  /// e.g. [PostRegisterLoginHint] after successful signup.
  final Object? routeExtra;

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _phone;
  late final TextEditingController _password;
  bool _remember = true;
  bool _obscurePassword = true;
  bool _submitting = false;

  @override
  void initState() {
    super.initState();
    _phone = TextEditingController();
    _password = TextEditingController();
    _loadRememberedLogin();
    _applyRegisterHint();
  }

  @override
  void didUpdateWidget(LoginScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.routeExtra != oldWidget.routeExtra) {
      _applyRegisterHint();
    }
  }

  void _applyRegisterHint() {
    final ex = widget.routeExtra;
    if (ex is PostRegisterLoginHint) {
      _phone.text = ex.phone;
    }
  }

  Future<void> _loadRememberedLogin() async {
    final remember = await AuthSessionStorage.readRememberPreference();
    final phone = await AuthSessionStorage.readRememberedPhone();
    if (!mounted) return;
    setState(() {
      _remember = remember;
      if (phone != null && phone.isNotEmpty && _phone.text.isEmpty) {
        _phone.text = phone;
      }
    });
  }

  @override
  void dispose() {
    _phone.dispose();
    _password.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final session = SessionScope.of(context);
    final l10n = AppLocalizations.of(context)!;
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
                        const SizedBox(height: 8),
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
                          _FieldLabel(label: l10n.phone),
                          _InputShell(
                            child: TextFormField(
                              controller: _phone,
                              autovalidateMode: AutovalidateMode.onUserInteraction,
                              decoration: const InputDecoration(
                                prefixIcon: Icon(Icons.call_outlined),
                                hintText: '+959…',
                                border: InputBorder.none,
                                enabledBorder: InputBorder.none,
                                focusedBorder: InputBorder.none,
                                filled: false,
                              ),
                              keyboardType: TextInputType.phone,
                              inputFormatters: const [PhoneNumberInputFormatter()],
                              textInputAction: TextInputAction.next,
                              validator: (v) => validatePhoneNumber(v),
                            ),
                          ),
                          const SizedBox(height: 14),
                          _FieldLabel(label: l10n.password),
                          const SizedBox(height: 6),
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
                                if ((v ?? '').isEmpty) return l10n.passwordRequired;
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
                                l10n.rememberMe,
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
                                          phone: _phone.text.trim(),
                                          password: _password.text,
                                          remember: _remember,
                                        );
                                        if (!context.mounted) return;
                                        context.go(session.homeRoute);
                                      } catch (e) {
                                        if (!context.mounted) return;
                                        final msg = e is LabApiException ? e.message : '$e';
                                        AppToast.error(
                                          context,
                                          msg,
                                          title: 'Couldn\'t sign in',
                                        );
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
                              label: Text(_submitting ? l10n.signingIn : l10n.signIn),
                            ),
                          ),
                          const SizedBox(height: 20),
                          const Divider(height: 1),
                          const SizedBox(height: 18),
                          Text(
                            l10n.noAccountPrompt,
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
                              child: Text(l10n.createNewAccount),
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
              height: 1.35,
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
