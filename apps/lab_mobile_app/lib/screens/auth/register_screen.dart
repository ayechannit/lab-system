import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../app/session_scope.dart';
import '../../config/map_defaults.dart';
import '../../models/post_register_login_hint.dart';
import '../../models/user_role.dart';
import '../../theme/app_colors.dart';
import '../../theme/theme_extensions.dart';
import '../../app/app_settings_scope.dart';
import '../../widgets/auth/signup_role_selector.dart';
import '../../widgets/common/app_brand_mark.dart';
import '../../widgets/common/app_toast.dart';
import '../../widgets/location/address_location_fields.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key, this.initialRole});

  /// When set (e.g. from role selection), pre-selects the signup role.
  final UserRole? initialRole;

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  static const int _minPasswordLength = 8;

  final _name = TextEditingController();
  final _phone = TextEditingController();
  final _email = TextEditingController();
  String _addressLine = '';
  final _password = TextEditingController();
  final _confirmPassword = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  bool _obscurePassword = true;
  bool _agreeTerms = false;
  bool _submitting = false;
  late UserRole _selectedRole;
  double _addressLat = 0;
  double _addressLng = 0;

  @override
  void initState() {
    super.initState();
    _selectedRole = widget.initialRole ?? UserRole.patient;
  }

  @override
  void dispose() {
    _name.dispose();
    _phone.dispose();
    _email.dispose();
    _password.dispose();
    _confirmPassword.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final session = SessionScope.of(context);
    return Scaffold(
      body: SafeArea(
        child: Form(
          key: _formKey,
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(20, 26, 20, 16),
            child: Column(
              children: [
                AppBrandMark(
                  size: 64,
                  iconSize: 30,
                  borderRadius: 16,
                  showShadow: true,
                  logoUrl: AppSettingsScope.of(context).logoUrl,
                ),
                const SizedBox(height: 14),
                Text(
                  AppSettingsScope.of(context).labName,
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.headlineMedium?.copyWith(color: context.cs.primary),
                ),
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
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Text(
                        'Create your account',
                        style: Theme.of(context).textTheme.titleLarge?.copyWith(
                              fontWeight: FontWeight.w700,
                              letterSpacing: -0.3,
                            ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Tell us who you are, then fill in your details.',
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                              color: context.cs.onSurfaceVariant,
                              height: 1.35,
                            ),
                      ),
                      const SizedBox(height: 18),
                      _RegisterLabel(text: 'Role'),
                      const SizedBox(height: 8),
                      SignupRoleSelector(
                        selected: _selectedRole,
                        onSelected: (role) => setState(() => _selectedRole = role),
                      ),
                      const SizedBox(height: 18),
                      _RegisterLabel(text: 'Full Name'),
                      _RegisterInputShell(
                        child: TextFormField(
                          controller: _name,
                          decoration: const InputDecoration(
                            prefixIcon: Icon(Icons.person_outline),
                            border: InputBorder.none,
                            enabledBorder: InputBorder.none,
                            focusedBorder: InputBorder.none,
                            filled: false,
                          ),
                          validator: (v) => (v == null || v.trim().isEmpty) ? 'Required' : null,
                          textInputAction: TextInputAction.next,
                        ),
                      ),
                      const SizedBox(height: 12),
                      _RegisterLabel(text: 'Email'),
                      _RegisterInputShell(
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
                          validator: (v) {
                            final t = (v ?? '').trim();
                            if (t.isEmpty) return 'Required';
                            if (!t.contains('@')) return 'Enter a valid email';
                            return null;
                          },
                          textInputAction: TextInputAction.next,
                        ),
                      ),
                      const SizedBox(height: 12),
                      _RegisterLabel(text: 'Phone'),
                      _RegisterInputShell(
                        child: TextFormField(
                          controller: _phone,
                          decoration: const InputDecoration(
                            prefixIcon: Icon(Icons.call_outlined),
                            border: InputBorder.none,
                            enabledBorder: InputBorder.none,
                            focusedBorder: InputBorder.none,
                            filled: false,
                          ),
                          keyboardType: TextInputType.phone,
                          validator: (v) => (v == null || v.trim().isEmpty) ? 'Required' : null,
                          textInputAction: TextInputAction.next,
                        ),
                      ),
                      const SizedBox(height: 12),
                      AddressLocationFields(
                        addressLine: _addressLine,
                        latitude: _addressLat,
                        longitude: _addressLng,
                        onChanged: (line, lat, lng) {
                          setState(() {
                            _addressLine = line;
                            _addressLat = lat;
                            _addressLng = lng;
                          });
                        },
                      ),
                      const SizedBox(height: 12),
                      _RegisterLabel(text: 'Password'),
                      _RegisterInputShell(
                        child: TextFormField(
                          controller: _password,
                          obscureText: _obscurePassword,
                          decoration: InputDecoration(
                            hintText: 'At least $_minPasswordLength characters',
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
                          validator: (v) {
                            if (v == null || v.length < _minPasswordLength) {
                              return 'Min $_minPasswordLength characters';
                            }
                            return null;
                          },
                          textInputAction: TextInputAction.next,
                        ),
                      ),
                      const SizedBox(height: 12),
                      _RegisterLabel(text: 'Confirm password'),
                      _RegisterInputShell(
                        child: TextFormField(
                          controller: _confirmPassword,
                          obscureText: true,
                          decoration: const InputDecoration(
                            hintText: 'Re-enter password',
                            prefixIcon: Icon(Icons.lock_outline),
                            border: InputBorder.none,
                            enabledBorder: InputBorder.none,
                            focusedBorder: InputBorder.none,
                            filled: false,
                          ),
                          validator: (v) {
                            if (v != _password.text) return 'Passwords do not match';
                            return null;
                          },
                          textInputAction: TextInputAction.done,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Material(
                        color: Colors.transparent,
                        child: CheckboxListTile(
                          value: _agreeTerms,
                          onChanged: (value) => setState(() => _agreeTerms = value ?? false),
                          contentPadding: EdgeInsets.zero,
                          controlAffinity: ListTileControlAffinity.leading,
                          title: Text.rich(
                            TextSpan(
                              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                    color: context.cs.onSurfaceVariant,
                                    height: 1.2,
                                  ),
                              children: [
                                const TextSpan(text: 'I agree to the '),
                                TextSpan(
                                  text: 'Terms of Service',
                                  style: TextStyle(
                                    color: context.cs.primary,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                                const TextSpan(text: ' and '),
                                TextSpan(
                                  text: 'Privacy Policy.',
                                  style: TextStyle(
                                    color: context.cs.primary,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          checkboxShape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
                          side: const BorderSide(color: AppColors.outline),
                        ),
                      ),
                      const SizedBox(height: 12),
                      SizedBox(
                        height: 58,
                        child: FilledButton.icon(
                          onPressed: _submitting
                              ? null
                              : () async {
                                  if (!_formKey.currentState!.validate()) return;
                                  if (!_agreeTerms) {
                                    AppToast.warning(
                                      context,
                                      'Please agree to Terms of Service and Privacy Policy.',
                                    );
                                    return;
                                  }
                                  if (!hasMeaningfulCoordinates(_addressLat, _addressLng) ||
                                      _addressLine.trim().isEmpty) {
                                    AppToast.warning(
                                      context,
                                      'Choose a location on the map and confirm it to set your address.',
                                    );
                                    return;
                                  }
                                  setState(() => _submitting = true);
                                  try {
                                    final emailTrim = _email.text.trim();
                                    await session.register(
                                      name: _name.text.trim(),
                                      phone: _phone.text.trim(),
                                      email: emailTrim,
                                      password: _password.text,
                                      role: _selectedRole,
                                      address: _addressLine.trim(),
                                      latitude: _addressLat,
                                      longitude: _addressLng,
                                    );
                                    if (!context.mounted) return;
                                    final needsApproval = _selectedRole.requiresStaffApproval;
                                    context.go(
                                      '/login',
                                      extra: PostRegisterLoginHint(
                                        message: needsApproval
                                            ? 'Account created. A lab staff member must approve your account before you can sign in.'
                                            : 'Account created. Sign in with your email and password.',
                                        email: emailTrim,
                                      ),
                                    );
                                  } catch (e) {
                                    if (!context.mounted) return;
                                    AppToast.error(context, '$e');
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
                          label: Text(_submitting ? 'Creating account…' : 'Register'),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 18),
                TextButton(
                  onPressed: () => context.go('/login'),
                  style: TextButton.styleFrom(
                    splashFactory: NoSplash.splashFactory,
                    overlayColor: Colors.transparent,
                    foregroundColor: context.cs.onSurfaceVariant,
                  ),
                  child: Text.rich(
                    TextSpan(
                      style: Theme.of(context).textTheme.bodyLarge?.copyWith(color: context.cs.onSurfaceVariant),
                      children: [
                        const TextSpan(text: 'Already have an account? '),
                        TextSpan(
                          text: 'Log In',
                          style: TextStyle(color: context.cs.primary, fontWeight: FontWeight.w700),
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
    );
  }
}

class _RegisterLabel extends StatelessWidget {
  const _RegisterLabel({required this.text});
  final String text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(left: 2, bottom: 6),
      child: Text(
        text,
        style: Theme.of(context).textTheme.labelLarge?.copyWith(
              color: context.cs.onSurfaceVariant,
              fontWeight: FontWeight.w700,
            ),
      ),
    );
  }
}

class _RegisterInputShell extends StatelessWidget {
  const _RegisterInputShell({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFFF8F8FD),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFD4D7E2)),
      ),
      child: child,
    );
  }
}

