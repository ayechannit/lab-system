import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';

import '../../app/session_scope.dart';
import '../../config/map_defaults.dart';
import '../../l10n/app_localizations.dart';
import '../../models/post_register_login_hint.dart';
import '../../models/user_role.dart';
import '../../theme/theme_extensions.dart';
import '../../utils/phone_input.dart';
import '../../widgets/auth/signup_role_selector.dart';
import '../../widgets/common/themed_input_shell.dart';
import '../../widgets/common/app_brand_mark.dart';
import '../../widgets/common/app_toast.dart';
import '../../widgets/common/user_profile_avatar.dart';
import '../../widgets/auth/auth_preference_controls.dart';
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
  final _licenseNumber = TextEditingController();
  String _addressLine = '';
  final _password = TextEditingController();
  final _confirmPassword = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  bool _obscurePassword = true;
  bool _submitting = false;
  late UserRole _selectedRole;
  double _addressLat = 0;
  double _addressLng = 0;
  Uint8List? _pendingPhotoBytes;
  String _pendingPhotoName = '';

  void _onNameChanged() {
    if (_pendingPhotoBytes != null && mounted) setState(() {});
  }

  @override
  void initState() {
    super.initState();
    _selectedRole = widget.initialRole ?? UserRole.patient;
    _name.addListener(_onNameChanged);
  }

  Future<void> _pickPhoto(ImageSource source) async {
    final l10n = AppLocalizations.of(context)!;
    try {
      final picker = ImagePicker();
      final file = await picker.pickImage(
        source: source,
        imageQuality: 85,
        maxWidth: 2048,
        maxHeight: 2048,
      );
      if (file == null) return;
      final bytes = await file.readAsBytes();
      if (bytes.isEmpty) {
        if (!mounted) return;
        AppToast.warning(context, l10n.profilePhotoPickFailed);
        return;
      }
      final name = file.name.trim().isNotEmpty
          ? file.name
          : 'profile_${DateTime.now().millisecondsSinceEpoch}.jpg';
      if (!mounted) return;
      setState(() {
        _pendingPhotoBytes = bytes;
        _pendingPhotoName = name;
      });
    } catch (_) {
      if (!mounted) return;
      AppToast.warning(context, l10n.profilePhotoPickFailed);
    }
  }

  Future<void> _showPhotoPickerSheet() async {
    final l10n = AppLocalizations.of(context)!;
    await showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      builder: (ctx) {
        return SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              ListTile(
                leading: const Icon(Icons.photo_camera_outlined),
                title: Text(l10n.profileTakePhoto),
                onTap: () {
                  Navigator.pop(ctx);
                  _pickPhoto(ImageSource.camera);
                },
              ),
              ListTile(
                leading: const Icon(Icons.photo_library_outlined),
                title: Text(l10n.profileChooseFromGallery),
                onTap: () {
                  Navigator.pop(ctx);
                  _pickPhoto(ImageSource.gallery);
                },
              ),
              if (_pendingPhotoBytes != null)
                ListTile(
                  leading: Icon(Icons.delete_outline, color: Theme.of(ctx).colorScheme.error),
                  title: const Text('Remove photo'),
                  onTap: () {
                    Navigator.pop(ctx);
                    setState(() {
                      _pendingPhotoBytes = null;
                      _pendingPhotoName = '';
                    });
                  },
                ),
            ],
          ),
        );
      },
    );
  }

  @override
  @override
  void dispose() {
    _name.removeListener(_onNameChanged);
    _name.dispose();
    _phone.dispose();
    _email.dispose();
    _licenseNumber.dispose();
    _password.dispose();
    _confirmPassword.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final session = SessionScope.of(context);
    final logoWidth = MediaQuery.sizeOf(context).width - 40;
    return Scaffold(
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const AuthPreferenceControls(),
            Expanded(
              child: Form(
                key: _formKey,
                child: SingleChildScrollView(
                  padding: const EdgeInsets.fromLTRB(20, 16, 20, 16),
                  child: Column(
                    children: [
                      AppBrandMark(maxWidth: logoWidth),
                const SizedBox(height: 16),
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
                      Center(
                        child: Column(
                          children: [
                            UserProfileAvatar(
                              name: _name.text.trim().isNotEmpty ? _name.text.trim() : '?',
                              previewBytes: _pendingPhotoBytes,
                              radius: 48,
                              showEditBadge: true,
                              onEditTap: _submitting ? null : _showPhotoPickerSheet,
                            ),
                            const SizedBox(height: 8),
                            Text(
                              AppLocalizations.of(context)!.profilePhotoTitle,
                              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                    color: context.cs.onSurfaceVariant,
                                  ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 18),
                      _RegisterLabel(text: 'Role'),
                      const SizedBox(height: 8),
                      SignupRoleSelector(
                        selected: _selectedRole,
                        onSelected: (role) => setState(() => _selectedRole = role),
                      ),
                      if (_selectedRole.requiresLicenseNumber) ...[
                        const SizedBox(height: 12),
                        _RegisterLabel(text: 'License / registration number'),
                        ThemedInputShell(
                          child: TextFormField(
                            controller: _licenseNumber,
                            decoration: const InputDecoration(
                              prefixIcon: Icon(Icons.badge_outlined),
                              hintText: 'Medical or professional license ID',
                              border: InputBorder.none,
                              enabledBorder: InputBorder.none,
                              focusedBorder: InputBorder.none,
                              filled: false,
                            ),
                            textInputAction: TextInputAction.next,
                            validator: (v) {
                              if (!_selectedRole.requiresLicenseNumber) return null;
                              if (v == null || v.trim().isEmpty) {
                                return 'Required for ${_selectedRole.label.toLowerCase()} accounts';
                              }
                              return null;
                            },
                          ),
                        ),
                      ],
                      const SizedBox(height: 18),
                      _RegisterLabel(text: 'Full Name'),
                      ThemedInputShell(
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
                      ThemedInputShell(
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
                      ThemedInputShell(
                        child: TextFormField(
                          controller: _phone,
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
                          validator: (v) => validatePhoneNumber(v),
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
                      ThemedInputShell(
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
                      ThemedInputShell(
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
                      const SizedBox(height: 16),
                      SizedBox(
                        height: 58,
                        child: FilledButton.icon(
                          onPressed: _submitting
                              ? null
                              : () async {
                                  if (!_formKey.currentState!.validate()) return;
                                  if (!hasMeaningfulCoordinates(_addressLat, _addressLng) ||
                                      _addressLine.trim().isEmpty) {
                                    AppToast.warning(
                                      context,
                                      'Choose a location on the map and confirm it to set your address.',
                                    );
                                    return;
                                  }
                                  if (_selectedRole.requiresLicenseNumber &&
                                      _licenseNumber.text.trim().isEmpty) {
                                    AppToast.warning(
                                      context,
                                      'Enter your license or registration number.',
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
                                      licenseNumber: _licenseNumber.text.trim(),
                                      latitude: _addressLat,
                                      longitude: _addressLng,
                                      profileImageBytes: _pendingPhotoBytes,
                                      profileImageFilename: _pendingPhotoName.isEmpty
                                          ? null
                                          : _pendingPhotoName,
                                    );
                                    if (!context.mounted) return;
                                    final needsApproval = _selectedRole.requiresStaffApproval;
                                    final successMessage = needsApproval
                                        ? 'A lab staff member must approve your account before you can sign in.'
                                        : 'Sign in with your email and password.';
                                    AppToast.success(
                                      context,
                                      successMessage,
                                      title: 'Account created',
                                    );
                                    context.go(
                                      '/login',
                                      extra: PostRegisterLoginHint(
                                        message: successMessage,
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
          ],
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

