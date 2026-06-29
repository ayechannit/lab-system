import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';

import '../../l10n/app_localizations.dart';
import '../../app/session_scope.dart';
import '../../theme/app_colors.dart';
import '../../theme/theme_extensions.dart';
import '../../constants/brand_assets.dart';
import '../../widgets/common/app_brand_mark.dart';
import '../../widgets/common/user_profile_avatar.dart';
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
  Uint8List? _pendingPhotoBytes;
  String _pendingPhotoName = '';

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
      final session = SessionScope.of(context);
      if (_pendingPhotoBytes != null && _pendingPhotoBytes!.isNotEmpty) {
        await session.uploadProfileImage(
          bytes: _pendingPhotoBytes!,
          filename: _pendingPhotoName.isEmpty ? 'profile.jpg' : _pendingPhotoName,
        );
      }
      await session.updateProfile(
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
        _pendingPhotoBytes = null;
        _pendingPhotoName = '';
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
        setState(() {
          _toast = _ToastKind.error;
          _toastError = l10n.profilePhotoPickFailed;
        });
        return;
      }
      final name = file.name.trim().isNotEmpty
          ? file.name
          : 'profile_${DateTime.now().millisecondsSinceEpoch}.jpg';
      if (!mounted) return;
      setState(() {
        _pendingPhotoBytes = bytes;
        _pendingPhotoName = name;
        _toast = null;
        _toastError = '';
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _toast = _ToastKind.error;
        _toastError = l10n.profilePhotoPickFailed;
      });
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
            ],
          ),
        );
      },
    );
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

    final l10n = AppLocalizations.of(context)!;
    final displayImageUrl = _pendingPhotoBytes == null ? user.profileImageUrl : null;

    return Scaffold(
      appBar: AppBar(
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          tooltip: l10n.profileBack,
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
                l10n.profileEditTitle,
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
                          l10n: l10n,
                          onDismiss: () => setState(() {
                            _toast = null;
                            _toastError = '';
                          }),
                        ),
                      )
                    : const SizedBox(width: double.infinity),
              ),
              Text(
                l10n.profileEditIntro,
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: context.cs.onSurfaceVariant,
                      height: 1.45,
                    ),
              ),
              const SizedBox(height: 22),
              Center(
                child: UserProfileAvatar(
                  name: _name.text.trim().isNotEmpty ? _name.text.trim() : user.name,
                  imageUrl: displayImageUrl,
                  previewBytes: _pendingPhotoBytes,
                  radius: 48,
                  showEditBadge: true,
                  onEditTap: _saving ? null : _showPhotoPickerSheet,
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
                        l10n.profileContactDetails,
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(
                              fontWeight: FontWeight.w700,
                            ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        l10n.profileContactHint,
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(color: context.cs.onSurfaceVariant),
                      ),
                      const SizedBox(height: 18),
                      TextFormField(
                        controller: _name,
                        textCapitalization: TextCapitalization.words,
                        decoration: _fieldDecoration(l10n.profileFullName, prefix: Icons.person_outline),
                        validator: (v) {
                          if (v == null || v.trim().isEmpty) return l10n.profileNameRequired;
                          if (v.trim().length < 2) return l10n.profileNameTooShort;
                          return null;
                        },
                      ),
                      const SizedBox(height: 14),
                      TextFormField(
                        controller: _phone,
                        decoration: _fieldDecoration(l10n.phone, prefix: Icons.phone_outlined),
                        keyboardType: TextInputType.phone,
                        validator: (v) {
                          if (v == null || v.trim().isEmpty) return l10n.profilePhoneRequired;
                          if (v.trim().length < 6) return l10n.profilePhoneInvalid;
                          return null;
                        },
                      ),
                      const SizedBox(height: 14),
                      TextFormField(
                        controller: _email,
                        decoration: _fieldDecoration(l10n.email, prefix: Icons.mail_outline),
                        keyboardType: TextInputType.emailAddress,
                        autocorrect: false,
                        validator: (v) {
                          if (v == null || v.trim().isEmpty) return l10n.emailRequired;
                          final s = v.trim();
                          if (!s.contains('@') || !s.contains('.')) return l10n.emailInvalid;
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
                            : Text(l10n.profileSaveChanges),
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
                        child: Text(l10n.profileCancel),
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
    required this.l10n,
    required this.onDismiss,
  });

  final bool saved;
  final String? errorText;
  final AppLocalizations l10n;
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
                                  saved ? l10n.profileSaved : l10n.profileSaveFailed,
                                  style: Theme.of(context).textTheme.titleSmall?.copyWith(
                                        fontWeight: FontWeight.w800,
                                        color: context.cs.onSurface,
                                      ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  saved
                                      ? l10n.profileSavedHint
                                      : (errorText ?? l10n.profileSaveErrorHint),
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
                            tooltip: l10n.profileDismiss,
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
