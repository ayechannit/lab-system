import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../app/session_scope.dart';
import '../../config/map_defaults.dart';
import '../../models/address_map_pick_result.dart';
import '../../models/post_register_login_hint.dart';
import '../../models/user_role.dart';
import '../../theme/app_colors.dart';
import '../../widgets/common/app_brand_mark.dart';
import '../../widgets/location/address_map_picker_screen.dart';

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
  final _address = TextEditingController();
  final _password = TextEditingController();
  final _confirmPassword = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  bool _obscurePassword = true;
  bool _agreeTerms = false;
  late String _selectedRole;
  double _addressLat = 0;
  double _addressLng = 0;

  @override
  void initState() {
    super.initState();
    _selectedRole = (widget.initialRole ?? UserRole.patient).label;
  }

  @override
  void dispose() {
    _name.dispose();
    _phone.dispose();
    _email.dispose();
    _address.dispose();
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
                const AppBrandMark(size: 64, iconSize: 30, borderRadius: 16),
                const SizedBox(height: 14),
                Text(
                  'MedLab Smart',
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.headlineMedium?.copyWith(color: AppColors.primary),
                ),
                const SizedBox(height: 6),
                Text(
                  'Create an account on the lab server. Use at least 8 characters for your password. '
                  'You must pick a location on the map so latitude and longitude are saved (same as the admin web user form). '
                  'After registering, sign in with your email and password.',
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.bodyLarge?.copyWith(color: AppColors.onSurfaceVariant),
                ),
                const SizedBox(height: 18),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(24),
                    border: Border.all(color: const Color(0x80E1E2EC)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      _RegisterLabel(text: 'Select Role'),
                      const SizedBox(height: 8),
                      Container(
                        padding: const EdgeInsets.all(4),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF1F1FB),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Row(
                          children: ['Patient', 'Doctor', 'Clinic']
                              .map(
                                (role) => Expanded(
                                  child: GestureDetector(
                                    onTap: () => setState(() => _selectedRole = role),
                                    child: AnimatedContainer(
                                      duration: const Duration(milliseconds: 160),
                                      padding: const EdgeInsets.symmetric(vertical: 10),
                                      decoration: BoxDecoration(
                                        color: _selectedRole == role ? AppColors.primary : Colors.transparent,
                                        borderRadius: BorderRadius.circular(10),
                                      ),
                                      child: Text(
                                        role,
                                        textAlign: TextAlign.center,
                                        style: Theme.of(context).textTheme.labelLarge?.copyWith(
                                              color: _selectedRole == role
                                                  ? Colors.white
                                                  : AppColors.onSurfaceVariant,
                                            ),
                                      ),
                                    ),
                                  ),
                                ),
                              )
                              .toList(),
                        ),
                      ),
                      const SizedBox(height: 16),
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
                      _RegisterLabel(text: 'Address'),
                      Text(
                        'Tap “Choose on map”, drop the pin, then save — latitude and longitude are required.',
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(color: AppColors.onSurfaceVariant, height: 1.35),
                      ),
                      const SizedBox(height: 8),
                      _RegisterInputShell(
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Padding(
                              padding: const EdgeInsets.only(left: 14, top: 12, right: 4),
                              child: Icon(
                                Icons.home_outlined,
                                size: 22,
                                color: Theme.of(context).iconTheme.color ?? AppColors.onSurfaceVariant,
                              ),
                            ),
                            Expanded(
                              child: TextFormField(
                                controller: _address,
                                textAlignVertical: TextAlignVertical.top,
                                decoration: InputDecoration(
                                  border: InputBorder.none,
                                  enabledBorder: InputBorder.none,
                                  focusedBorder: InputBorder.none,
                                  filled: false,
                                  isDense: true,
                                  contentPadding: const EdgeInsets.fromLTRB(0, 12, 14, 12),
                                ),
                                minLines: 1,
                                maxLines: 4,
                                textInputAction: TextInputAction.next,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 10),
                      _RegisterLabel(text: 'Latitude–Longitude'),
                      const SizedBox(height: 6),
                      Text(
                        hasMeaningfulCoordinates(_addressLat, _addressLng)
                            ? '${_addressLat.toStringAsFixed(5)}, ${_addressLng.toStringAsFixed(5)}'
                            : '—',
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                              color: AppColors.onSurfaceVariant,
                              fontFeatures: const [FontFeature.tabularFigures()],
                            ),
                      ),
                      const SizedBox(height: 8),
                      Align(
                        alignment: Alignment.centerLeft,
                        child: OutlinedButton.icon(
                          onPressed: () async {
                            final r = await Navigator.of(context).push<AddressMapPickResult?>(
                              MaterialPageRoute(
                                builder: (_) => AddressMapPickerScreen(
                                  initialAddress: _address.text,
                                  initialLatitude: _addressLat,
                                  initialLongitude: _addressLng,
                                ),
                              ),
                            );
                            if (!context.mounted || r == null) return;
                            setState(() {
                              _address.text = r.addressLine;
                              _addressLat = r.latitude;
                              _addressLng = r.longitude;
                            });
                          },
                          icon: const Icon(Icons.map_outlined, size: 20),
                          label: const Text('Choose on map'),
                        ),
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
                      CheckboxListTile(
                        value: _agreeTerms,
                        onChanged: (value) => setState(() => _agreeTerms = value ?? false),
                        contentPadding: EdgeInsets.zero,
                        controlAffinity: ListTileControlAffinity.leading,
                        title: Text.rich(
                          TextSpan(
                            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                  color: AppColors.onSurfaceVariant,
                                  height: 1.2,
                                ),
                            children: const [
                              TextSpan(text: 'I agree to the '),
                              TextSpan(
                                text: 'Terms of Service',
                                style: TextStyle(
                                  color: AppColors.primary,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                              TextSpan(text: ' and '),
                              TextSpan(
                                text: 'Privacy Policy.',
                                style: TextStyle(
                                  color: AppColors.primary,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            ],
                          ),
                        ),
                        checkboxShape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
                        side: const BorderSide(color: AppColors.outline),
                      ),
                      const SizedBox(height: 12),
                      SizedBox(
                        height: 58,
                        child: FilledButton.icon(
                          onPressed: () async {
                            if (!_formKey.currentState!.validate()) return;
                            if (!_agreeTerms) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(
                                  content: Text('Please agree to Terms of Service and Privacy Policy.'),
                                ),
                              );
                              return;
                            }
                            if (!hasMeaningfulCoordinates(_addressLat, _addressLng)) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(
                                  content: Text(
                                    'Choose a location on the map. Latitude and longitude are required to register.',
                                  ),
                                ),
                              );
                              return;
                            }
                            try {
                              final emailTrim = _email.text.trim();
                              await session.register(
                                name: _name.text.trim(),
                                phone: _phone.text.trim(),
                                email: emailTrim,
                                password: _password.text,
                                role: _selectedRole.toUserRole(),
                                address: _address.text.trim(),
                                latitude: _addressLat,
                                longitude: _addressLng,
                              );
                              if (!context.mounted) return;
                              context.go(
                                '/login',
                                extra: PostRegisterLoginHint(
                                  message: 'Account created. Sign in with your email and password.',
                                  email: emailTrim,
                                ),
                              );
                            } catch (e) {
                              if (!context.mounted) return;
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(content: Text('$e')),
                              );
                            }
                          },
                          iconAlignment: IconAlignment.end,
                          icon: const Icon(Icons.arrow_forward, size: 20),
                          label: const Text('Register'),
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
                    foregroundColor: AppColors.onSurfaceVariant,
                  ),
                  child: Text.rich(
                    TextSpan(
                      style: Theme.of(context).textTheme.bodyLarge?.copyWith(color: AppColors.onSurfaceVariant),
                      children: const [
                        TextSpan(text: 'Already have an account? '),
                        TextSpan(
                          text: 'Log In',
                          style: TextStyle(color: AppColors.primary, fontWeight: FontWeight.w700),
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

extension on String {
  UserRole toUserRole() => switch (this) {
        'Doctor' => UserRole.doctor,
        'Clinic' => UserRole.clinic,
        _ => UserRole.patient,
      };
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
              color: AppColors.onSurfaceVariant,
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

