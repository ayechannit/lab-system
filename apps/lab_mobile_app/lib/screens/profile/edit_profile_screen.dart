import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../app/session_scope.dart';
import '../../theme/app_colors.dart';
import '../../theme/theme_extensions.dart';
import '../../constants/brand_assets.dart';
import '../../widgets/common/app_brand_mark.dart';
import '../../widgets/location/address_location_fields.dart';
import '../../widgets/navigation/lab_main_bottom_nav.dart';

class EditProfileScreen extends StatefulWidget {
  const EditProfileScreen({super.key});

  static const double _maxFormWidth = 440;

  @override
  State<EditProfileScreen> createState() => _EditProfileScreenState();
}

class _EditProfileScreenState extends State<EditProfileScreen> {
  final _formKey = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _phone = TextEditingController();
  final _email = TextEditingController();
  String _addressLine = '';
  double _addressLat = 0;
  double _addressLng = 0;
  var _seeded = false;
  var _saving = false;
  _ToastKind? _toast;
  String _toastError = '';

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_seeded) return;
    final u = SessionScope.of(context).user;
    if (u == null) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) context.go('/login');
      });
      return;
    }
    _seeded = true;
    _name.text = u.name;
    _phone.text = u.phone;
    _email.text = u.email;
    _addressLine = u.address;
    _addressLat = u.latitude;
    _addressLng = u.longitude;
  }

  @override
  void dispose() {
    _name.dispose();
    _phone.dispose();
    _email.dispose();
    super.dispose();
  }

  InputDecoration _fieldDecoration(String label, {String? hint, IconData? prefix}) {
    final iconColor = Theme.of(context).iconTheme.color ?? context.cs.onSurfaceVariant;
    return InputDecoration(
      labelText: label,
      hintText: hint,
      prefixIcon: prefix != null ? Icon(prefix, size: 22, color: iconColor) : null,
      filled: true,
      fillColor: context.appExtras.surfaceContainer,
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: BorderSide(color: context.subtleBorder),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: AppColors.primaryLight, width: 2),
      ),
      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: BorderSide(color: AppColors.error.withValues(alpha: 0.8)),
      ),
      focusedErrorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: AppColors.error, width: 2),
      ),
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 16),
    );
  }

  Future<void> _save() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    setState(() {
      _saving = true;
      _toast = null;
      _toastError = '';
    });
    try {
      await SessionScope.of(context).updateProfile(
        name: _name.text.trim(),
        phone: _phone.text.trim(),
        email: _email.text.trim(),
        address: _addressLine.trim(),
        latitude: _addressLat,
        longitude: _addressLng,
      );
      if (!mounted) return;
      setState(() {
        _saving = false;
        _toast = _ToastKind.saved;
      });
      await Future.delayed(const Duration(milliseconds: 1800));
      if (mounted) context.pop();
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _saving = false;
        _toast = _ToastKind.error;
        _toastError = _shortErrorMessage(e);
      });
    }
  }

  static String _shortErrorMessage(Object e) {
    final s = e.toString().replaceFirst('Exception: ', '').replaceFirst('LabApiException: ', '');
    if (s.length <= 140) return s;
    return '${s.substring(0, 137)}…';
  }

  @override
  Widget build(BuildContext context) {
    final session = SessionScope.of(context);
    final user = session.user;
    if (user == null) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    final initial = user.name.trim().isNotEmpty ? user.name.trim()[0].toUpperCase() : '?';

    return Scaffold(
      appBar: AppBar(
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          tooltip: 'Back',
          onPressed: () => context.pop(),
          icon: Icon(Icons.arrow_back_rounded, color: context.cs.primary),
        ),
        titleSpacing: 8,
        title: Row(
          children: [
            AppBrandMark(
              style: AppBrandMarkStyle.lockup,
              height: 28,
              maxWidth: 118,
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                'Edit profile',
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      color: context.cs.primary,
                      fontWeight: FontWeight.w800,
                    ),
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        ),
      ),
      body: LayoutBuilder(
        builder: (context, constraints) {
          final hPad = constraints.maxWidth > EditProfileScreen._maxFormWidth + 48
              ? (constraints.maxWidth - EditProfileScreen._maxFormWidth) / 2
              : 20.0;

          return ListView(
            padding: EdgeInsets.fromLTRB(hPad, 8, hPad, 24),
            children: [
              AnimatedSize(
                duration: const Duration(milliseconds: 280),
                curve: Curves.easeOutCubic,
                alignment: Alignment.topCenter,
                child: _toast != null
                    ? Padding(
                        padding: const EdgeInsets.only(bottom: 14),
                        child: _ProfileTopToast(
                          saved: _toast == _ToastKind.saved,
                          errorText: _toast == _ToastKind.error ? _toastError : null,
                          onDismiss: () => setState(() {
                            _toast = null;
                            _toastError = '';
                          }),
                        ),
                      )
                    : const SizedBox(width: double.infinity),
              ),
              Text(
                'Update how the lab reaches you. Changes apply to your signed-in account.',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: context.cs.onSurfaceVariant,
                      height: 1.45,
                    ),
              ),
              const SizedBox(height: 22),
              Center(
                child: Stack(
                  clipBehavior: Clip.none,
                  children: [
                    CircleAvatar(
                      radius: 48,
                      backgroundColor: context.cs.primary.withValues(alpha: 0.12),
                      child: CircleAvatar(
                        radius: 43,
                        backgroundColor: context.cs.primary.withValues(alpha: 0.85),
                        child: Text(
                          initial,
                          style: TextStyle(
                            fontSize: 36,
                            color: context.cs.onPrimary,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ),
                    Positioned(
                      right: -2,
                      bottom: -2,
                      child: Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: AppColors.primaryLight,
                          shape: BoxShape.circle,
                          border: Border.all(color: Colors.white, width: 2),
                          boxShadow: const [
                            BoxShadow(color: Color(0x140052CC), blurRadius: 8, offset: Offset(0, 2)),
                          ],
                        ),
                        child: const Icon(Icons.edit_outlined, size: 18, color: Colors.white),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),
              Container(
                padding: const EdgeInsets.all(18),
                decoration: BoxDecoration(
                  color: context.cardFill,
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(color: context.subtleBorder),
                  boxShadow: const [
                    BoxShadow(color: Color(0x08000000), blurRadius: 16, offset: Offset(0, 4)),
                  ],
                ),
                child: Form(
                  key: _formKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Text(
                        'Contact details',
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(
                              fontWeight: FontWeight.w700,
                            ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Used for orders, results, and account recovery.',
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(color: context.cs.onSurfaceVariant),
                      ),
                      const SizedBox(height: 18),
                      TextFormField(
                        controller: _name,
                        textCapitalization: TextCapitalization.words,
                        decoration: _fieldDecoration('Full name', prefix: Icons.person_outline),
                        validator: (v) {
                          if (v == null || v.trim().isEmpty) return 'Enter your name';
                          if (v.trim().length < 2) return 'Name looks too short';
                          return null;
                        },
                      ),
                      const SizedBox(height: 14),
                      TextFormField(
                        controller: _phone,
                        decoration: _fieldDecoration('Phone', prefix: Icons.phone_outlined),
                        keyboardType: TextInputType.phone,
                        validator: (v) {
                          if (v == null || v.trim().isEmpty) return 'Enter a phone number';
                          if (v.trim().length < 6) return 'Enter a valid phone number';
                          return null;
                        },
                      ),
                      const SizedBox(height: 14),
                      TextFormField(
                        controller: _email,
                        decoration: _fieldDecoration('Email', prefix: Icons.mail_outline),
                        keyboardType: TextInputType.emailAddress,
                        autocorrect: false,
                        validator: (v) {
                          if (v == null || v.trim().isEmpty) return 'Enter your email';
                          final s = v.trim();
                          if (!s.contains('@') || !s.contains('.')) return 'Enter a valid email';
                          return null;
                        },
                      ),
                      const SizedBox(height: 14),
                      AddressLocationFields(
                        addressLine: _addressLine,
                        latitude: _addressLat,
                        longitude: _addressLng,
                        enabled: !_saving,
                        onChanged: (line, lat, lng) {
                          setState(() {
                            _addressLine = line;
                            _addressLat = lat;
                            _addressLng = lng;
                          });
                        },
                      ),
                      const SizedBox(height: 22),
                      FilledButton(
                        onPressed: _saving ? null : _save,
                        style: FilledButton.styleFrom(
                          backgroundColor: context.cs.primary,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                        ),
                        child: _saving
                            ? const SizedBox(
                                height: 22,
                                width: 22,
                                child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                              )
                            : const Text('Save changes'),
                      ),
                      const SizedBox(height: 10),
                      OutlinedButton(
                        onPressed: _saving ? null : () => context.pop(),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: context.cs.primary,
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          side: BorderSide(color: context.subtleBorder),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                        ),
                        child: const Text('Cancel'),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          );
        },
      ),
      bottomNavigationBar: const LabMainBottomNav(current: LabMainTab.profile),
    );
  }
}

enum _ToastKind { saved, error }

class _ProfileTopToast extends StatelessWidget {
  const _ProfileTopToast({
    required this.saved,
    this.errorText,
    required this.onDismiss,
  });

  final bool saved;
  final String? errorText;
  final VoidCallback onDismiss;

  @override
  Widget build(BuildContext context) {
    final accent = saved ? AppColors.accentGreen : AppColors.error;
    final softBg = saved ? const Color(0xFFEAF9F1) : const Color(0xFFFFFBFA);

    return Material(
      color: Colors.transparent,
      elevation: 0,
      child: Container(
        width: double.infinity,
        decoration: BoxDecoration(
          color: context.cardFill,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0x44C3C6D6)),
          boxShadow: const [
            BoxShadow(
              color: Color(0x180052CC),
              blurRadius: 20,
              offset: Offset(0, 6),
            ),
          ],
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(15),
          child: IntrinsicHeight(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Container(width: 5, color: accent),
                Expanded(
                  child: ColoredBox(
                    color: softBg,
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(12, 12, 4, 12),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Container(
                            width: 40,
                            height: 40,
                            decoration: BoxDecoration(
                              color: context.cardFill,
                              shape: BoxShape.circle,
                              boxShadow: [
                                BoxShadow(
                                  color: accent.withValues(alpha: 0.22),
                                  blurRadius: 8,
                                  offset: const Offset(0, 2),
                                ),
                              ],
                            ),
                            child: Icon(
                              saved ? Icons.check_rounded : Icons.error_outline_rounded,
                              color: accent,
                              size: 24,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Text(
                                  saved ? 'Profile saved' : 'Could not save changes',
                                  style: Theme.of(context).textTheme.titleSmall?.copyWith(
                                        fontWeight: FontWeight.w800,
                                        color: context.cs.onSurface,
                                      ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  saved
                                      ? 'Your details are updated on the lab account. Returning to your profile…'
                                      : (errorText ?? 'Please check your connection and try again.'),
                                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                        color: context.cs.onSurfaceVariant,
                                        height: 1.35,
                                      ),
                                ),
                              ],
                            ),
                          ),
                          IconButton(
                            visualDensity: VisualDensity.compact,
                            tooltip: 'Dismiss',
                            onPressed: onDismiss,
                            icon: Icon(Icons.close_rounded, color: AppColors.outline.withValues(alpha: 0.9)),
                          ),
                        ],
                      ),
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
