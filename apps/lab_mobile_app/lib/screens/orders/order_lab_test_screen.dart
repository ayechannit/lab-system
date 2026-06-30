import 'dart:async';
import 'dart:io';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';

import '../../app/session_scope.dart';
import '../../models/lab_order.dart';
import '../../models/lab_test_pick.dart';
import '../../models/user_role.dart';
import '../../config/map_defaults.dart';
import '../../theme/app_colors.dart';
import '../../theme/theme_extensions.dart';
import '../../services/rest_lab_user_api.dart';
import '../../widgets/common/app_branding_row.dart';
import '../../widgets/common/app_toast.dart';
import '../../widgets/common/app_dropdown_form_field.dart';
import '../../widgets/common/app_field_decoration.dart';
import '../../widgets/location/address_location_fields.dart';
import '../../widgets/navigation/lab_main_bottom_nav.dart';
import '../../widgets/orders/collector_pick_field.dart';

enum _OrderMode { catalogTests, prescriptionOnly }

enum _PrescriptionPickSource { camera, gallery, file }

class OrderLabTestScreen extends StatefulWidget {
  const OrderLabTestScreen({super.key});

  @override
  State<OrderLabTestScreen> createState() => _OrderLabTestScreenState();
}

class _OrderLabTestScreenState extends State<OrderLabTestScreen> {
  final _formKey = GlobalKey<FormState>();
  final _processOrderKey = GlobalKey<FormFieldState<void>>();
  final _description = TextEditingController();
  final _patientName = TextEditingController();
  final _age = TextEditingController();
  final _phone = TextEditingController();
  final _bloodType = TextEditingController();
  String _gender = 'Male';
  final _facilityNotes = TextEditingController();
  final _timeSlot = TextEditingController();
  final _addressLine = TextEditingController();
  final _testFilter = TextEditingController();
  OrderPriority _priority = OrderPriority.elective;
  double _collectionLat = 0;
  double _collectionLng = 0;
  bool _collectionCoordsInit = false;

  Future<List<LabTestPick>>? _testsFuture;
  Future<List<LabCollectorPick>>? _collectorsFuture;
  List<LabTestPick> _tests = const [];
  List<LabCollectorPick> _collectors = const [];
  String? _selectedCollectorId;
  bool _catalogInit = false;
  bool _prefilledProfileAddress = false;

  _OrderMode _mode = _OrderMode.catalogTests;
  final Set<String> _selectedTestIds = {};

  Uint8List? _prescriptionBytes;
  String? _prescriptionName;

  DateTime _preferredDate = DateTime.now().add(const Duration(days: 1));
  String _reportDelivery = 'soft_copy';

  ServiceFeeQuote? _serviceFeeQuote;
  bool _serviceFeeLoading = false;
  String? _serviceFeeError;
  bool _serviceFeeOutOfCoverage = false;
  Timer? _serviceFeeDebounce;
  int _serviceFeeRequestId = 0;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!_prefilledProfileAddress) {
      final u = SessionScope.of(context).user;
      if (u != null) {
        if (u.address.isNotEmpty && _addressLine.text.trim().isEmpty) {
          _addressLine.text = u.address;
        }
        if (!_collectionCoordsInit) {
          _collectionLat = u.latitude;
          _collectionLng = u.longitude;
          _collectionCoordsInit = true;
        }
      }
      _prefilledProfileAddress = true;
      if (_collectionCoordsInit) {
        _scheduleServiceFeeLookup(_collectionLat, _collectionLng);
      }
    }
    if (_catalogInit) return;
    _catalogInit = true;
    _testsFuture = SessionScope.of(context).fetchActiveLabTests().then((list) {
      if (mounted) setState(() => _tests = list);
      return list;
    });
    _collectorsFuture = SessionScope.of(context).fetchActiveCollectors().then((list) {
      if (mounted) setState(() => _collectors = list);
      return list;
    });
  }

  @override
  void dispose() {
    _serviceFeeDebounce?.cancel();
    _description.dispose();
    _patientName.dispose();
    _age.dispose();
    _phone.dispose();
    _bloodType.dispose();
    _facilityNotes.dispose();
    _timeSlot.dispose();
    _addressLine.dispose();
    _testFilter.dispose();
    super.dispose();
  }

  LabTestPick? _testById(String id) {
    for (final t in _tests) {
      if (t.id == id) return t;
    }
    return null;
  }

  List<LabTestPick> get _filteredTests {
    final q = _testFilter.text.trim().toLowerCase();
    if (q.isEmpty) return _tests;
    return _tests
        .where((t) => t.name.toLowerCase().contains(q) || t.code.toLowerCase().contains(q))
        .toList();
  }

  Widget _stackedFieldLabel(BuildContext context, String text, {bool required = false}) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Text.rich(
        TextSpan(
          text: text,
          style: theme.textTheme.titleSmall?.copyWith(
            fontWeight: FontWeight.w500,
            color: theme.colorScheme.onSurface,
          ),
          children: required
              ? [
                  TextSpan(
                    text: ' *',
                    style: theme.textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.w600,
                      color: AppColors.error,
                    ),
                  ),
                ]
              : null,
        ),
      ),
    );
  }

  String? _validateProcessOrder() {
    if (_mode == _OrderMode.catalogTests) {
      if (_selectedTestIds.isEmpty) {
        return 'Select at least one test from the catalog.';
      }
      return null;
    }
    if (_prescriptionBytes == null || _prescriptionBytes!.isEmpty) {
      return 'Choose a prescription PDF or image.';
    }
    return null;
  }

  void _revalidateProcessOrder() {
    _processOrderKey.currentState?.validate();
  }

  void _clearServiceFeeState() {
    _serviceFeeQuote = null;
    _serviceFeeLoading = false;
    _serviceFeeError = null;
    _serviceFeeOutOfCoverage = false;
  }

  void _scheduleServiceFeeLookup(double lat, double lng) {
    _serviceFeeDebounce?.cancel();
    if (!hasMeaningfulCoordinates(lat, lng)) {
      setState(_clearServiceFeeState);
      return;
    }
    setState(() {
      _serviceFeeLoading = true;
      _serviceFeeError = null;
      _serviceFeeOutOfCoverage = false;
      _serviceFeeQuote = null;
    });
    _serviceFeeDebounce = Timer(const Duration(milliseconds: 450), () {
      unawaited(_fetchServiceFee(lat, lng));
    });
  }

  Future<void> _fetchServiceFee(double lat, double lng) async {
    final requestId = ++_serviceFeeRequestId;
    try {
      final quote = await SessionScope.of(context).calculateServiceFee(
        latitude: lat,
        longitude: lng,
      );
      if (!mounted || requestId != _serviceFeeRequestId) return;
      setState(() {
        _serviceFeeQuote = quote;
        _serviceFeeLoading = false;
        _serviceFeeError = null;
        _serviceFeeOutOfCoverage = false;
      });
    } on LabApiException catch (e) {
      if (!mounted || requestId != _serviceFeeRequestId) return;
      setState(() {
        _serviceFeeQuote = null;
        _serviceFeeLoading = false;
        _serviceFeeError = e.message;
        _serviceFeeOutOfCoverage = e.isOutOfCoverage;
      });
    } catch (e) {
      if (!mounted || requestId != _serviceFeeRequestId) return;
      setState(() {
        _serviceFeeQuote = null;
        _serviceFeeLoading = false;
        _serviceFeeError = '$e';
        _serviceFeeOutOfCoverage = false;
      });
    }
  }

  Widget _serviceFeeSummaryRow(BuildContext context) {
    if (_serviceFeeLoading) {
      return Padding(
        padding: const EdgeInsets.only(top: 8),
        child: Row(
          children: [
            const SizedBox(
              width: 16,
              height: 16,
              child: CircularProgressIndicator(strokeWidth: 2),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                'Checking service zone…',
                style: Theme.of(context).textTheme.bodySmall,
              ),
            ),
          ],
        ),
      );
    }
    if (_serviceFeeOutOfCoverage) {
      return Padding(
        padding: const EdgeInsets.only(top: 8),
        child: Text(
          _serviceFeeError ?? 'This address is outside our service coverage areas.',
          style: Theme.of(context).textTheme.bodySmall?.copyWith(color: AppColors.error),
        ),
      );
    }
    if (_serviceFeeError != null) {
      return Padding(
        padding: const EdgeInsets.only(top: 8),
        child: Text(
          _serviceFeeError!,
          style: Theme.of(context).textTheme.bodySmall?.copyWith(color: AppColors.error),
        ),
      );
    }
    final quote = _serviceFeeQuote;
    if (quote == null) return const SizedBox.shrink();
    return Column(
      children: [
        const SizedBox(height: 8),
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: Text(
                'Service fee (${quote.zoneName})',
                style: Theme.of(context).textTheme.bodySmall,
              ),
            ),
            Text(
              '${quote.serviceFeeMmk.toStringAsFixed(0)} MMK',
              style: Theme.of(context).textTheme.bodySmall,
              textAlign: TextAlign.right,
            ),
          ],
        ),
      ],
    );
  }

  double _estimatedGrandTotal(List<CatalogOrderLine> lines) {
    final tests = _sumFinal(lines);
    final service = _serviceFeeQuote?.serviceFeeMmk ?? 0;
    return tests + service;
  }

  Widget _fieldErrorText(BuildContext context, String message) {
    return Padding(
      padding: const EdgeInsets.only(top: 6, left: 2),
      child: Text(
        message,
        style: Theme.of(context).textTheme.bodySmall?.copyWith(color: AppColors.error),
      ),
    );
  }

  /// Material 3 defaults use medium/bold weight for dropdown labels — use regular body text.
  TextStyle _dropdownBodyStyle(BuildContext context) {
    final base = Theme.of(context).textTheme.bodyLarge ?? Theme.of(context).textTheme.bodyMedium;
    return (base ?? const TextStyle(fontSize: 16)).copyWith(fontWeight: FontWeight.w400);
  }

  List<CatalogOrderLine> _linesForRole(UserRole role) {
    final out = <CatalogOrderLine>[];
    for (final id in _selectedTestIds) {
      final t = _testById(id);
      if (t == null) continue;
      final pct = t.discountPercentForUser(role);
      final unit = t.basePriceMmk.toDouble();
      final sub = t.lineSubtotalMmk(role);
      out.add(CatalogOrderLine(
        testId: t.id,
        testName: t.name,
        testCode: t.code,
        unitPriceMmk: unit,
        discountPercent: pct,
        subtotalMmk: sub,
      ));
    }
    return out;
  }

  double _sumOriginal(List<CatalogOrderLine> lines) => lines.fold(0.0, (a, b) => a + b.unitPriceMmk);

  double _sumFinal(List<CatalogOrderLine> lines) => lines.fold(0.0, (a, b) => a + b.subtotalMmk);

  Future<void> _pickPrescription() async {
    final choice = await showModalBottomSheet<_PrescriptionPickSource>(
      context: context,
      showDragHandle: true,
      builder: (ctx) {
        final cs = Theme.of(ctx).colorScheme;
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  'Add prescription',
                  style: Theme.of(ctx).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 4),
                Text(
                  'Take a photo, pick from gallery, or upload a PDF/image file.',
                  style: Theme.of(ctx).textTheme.bodySmall?.copyWith(color: cs.onSurfaceVariant),
                ),
                const SizedBox(height: 12),
                if (!kIsWeb)
                  ListTile(
                    leading: Icon(Icons.photo_camera_outlined, color: cs.primary),
                    title: const Text('Take photo'),
                    subtitle: const Text('Use camera'),
                    onTap: () => Navigator.pop(ctx, _PrescriptionPickSource.camera),
                  ),
                ListTile(
                  leading: Icon(Icons.photo_library_outlined, color: cs.primary),
                  title: const Text('Choose from gallery'),
                  subtitle: const Text('JPG, PNG, or other image'),
                  onTap: () => Navigator.pop(ctx, _PrescriptionPickSource.gallery),
                ),
                ListTile(
                  leading: Icon(Icons.upload_file_outlined, color: cs.primary),
                  title: const Text('Choose file'),
                  subtitle: const Text('PDF or image from device'),
                  onTap: () => Navigator.pop(ctx, _PrescriptionPickSource.file),
                ),
              ],
            ),
          ),
        );
      },
    );
    if (choice == null || !mounted) return;

    switch (choice) {
      case _PrescriptionPickSource.camera:
        await _pickPrescriptionFromImage(ImageSource.camera);
      case _PrescriptionPickSource.gallery:
        await _pickPrescriptionFromImage(ImageSource.gallery);
      case _PrescriptionPickSource.file:
        await _pickPrescriptionFromFile();
    }
  }

  Future<void> _pickPrescriptionFromImage(ImageSource source) async {
    try {
      final picker = ImagePicker();
      final file = await picker.pickImage(
        source: source,
        imageQuality: 85,
        maxWidth: 4096,
        maxHeight: 4096,
      );
      if (file == null) return;
      final bytes = await file.readAsBytes();
      if (bytes.isEmpty) {
        _showPrescriptionReadError();
        return;
      }
      final name = file.name.trim().isNotEmpty
          ? file.name
          : 'prescription_${DateTime.now().millisecondsSinceEpoch}.jpg';
      _applyPrescriptionFile(bytes, name);
    } catch (e) {
      if (!mounted) return;
      AppToast.error(
        context,
        'Could not ${source == ImageSource.camera ? 'capture' : 'load'} image: $e',
      );
    }
  }

  Future<void> _pickPrescriptionFromFile() async {
    final result = await FilePicker.platform.pickFiles(
      type: FileType.custom,
      allowedExtensions: const ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'webp'],
      allowMultiple: false,
      withData: true,
    );
    if (result == null || result.files.isEmpty) return;
    final f = result.files.first;
    var bytes = f.bytes;
    if (bytes == null && f.path != null) {
      try {
        bytes = await File(f.path!).readAsBytes();
      } catch (_) {
        bytes = null;
      }
    }
    if (bytes == null || bytes.isEmpty) {
      _showPrescriptionReadError();
      return;
    }
    _applyPrescriptionFile(bytes, f.name);
  }

  void _applyPrescriptionFile(Uint8List bytes, String name) {
    setState(() {
      _prescriptionBytes = bytes;
      _prescriptionName = name;
    });
    _revalidateProcessOrder();
  }

  void _showPrescriptionReadError() {
    if (!mounted) return;
    AppToast.error(context, 'Could not read the selected file.');
  }

  Future<void> _openTestCatalogSheet(UserRole role) async {
    if (_tests.isEmpty) return;
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      useSafeArea: true,
      builder: (sheetContext) {
        final maxH = MediaQuery.sizeOf(sheetContext).height * 0.88;
        return StatefulBuilder(
          builder: (context, setModal) {
            final filtered = _filteredTests;
            return Padding(
              padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
              child: SizedBox(
                height: maxH,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Padding(
                      padding: const EdgeInsets.fromLTRB(16, 4, 8, 0),
                      child: Row(
                        children: [
                          Expanded(
                            child: Text(
                              'Select tests',
                              style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600),
                            ),
                          ),
                          TextButton(
                            onPressed: () => Navigator.of(sheetContext).pop(),
                            child: const Text('Done'),
                          ),
                        ],
                      ),
                    ),
                    Padding(
                      padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
                      child: TextField(
                        controller: _testFilter,
                        onChanged: (_) {
                          setState(() {});
                          setModal(() {});
                        },
                        decoration: AppFieldDecoration.build(
                          context,
                          hint: 'Search by test name or code',
                          prefixIcon: const Icon(Icons.search),
                        ),
                      ),
                    ),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      child: Text(
                        '${filtered.length} match${filtered.length == 1 ? '' : 'es'} · ${_selectedTestIds.length} selected',
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(color: context.cs.onSurfaceVariant),
                      ),
                    ),
                    const SizedBox(height: 4),
                    Expanded(
                      child: filtered.isEmpty
                          ? Center(
                              child: Text(
                                'No tests match your search.',
                                style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: context.cs.onSurfaceVariant),
                              ),
                            )
                          : ListView.builder(
                              padding: const EdgeInsets.fromLTRB(8, 0, 8, 16),
                              itemCount: filtered.length,
                              itemBuilder: (context, index) {
                                final t = filtered[index];
                                final checked = _selectedTestIds.contains(t.id);
                                final pct = t.discountPercentForUser(role);
                                final sub = t.lineSubtotalMmk(role);
                                final body = Theme.of(context).textTheme.bodyLarge?.copyWith(fontWeight: FontWeight.w400);
                                final small = Theme.of(context).textTheme.bodySmall?.copyWith(fontWeight: FontWeight.w400);
                                return Card(
                                  margin: const EdgeInsets.only(bottom: 6),
                                  child: CheckboxListTile(
                                    dense: true,
                                    value: checked,
                                    onChanged: (v) {
                                      setState(() {
                                        if (v == true) {
                                          _selectedTestIds.add(t.id);
                                        } else {
                                          _selectedTestIds.remove(t.id);
                                        }
                                      });
                                      setModal(() {});
                                      _revalidateProcessOrder();
                                    },
                                    title: Text(t.name, maxLines: 2, overflow: TextOverflow.ellipsis, style: body),
                                    subtitle: Text(
                                      '${t.code} · $pct% off · ${sub.toStringAsFixed(0)} MMK (was ${t.basePriceMmk} MMK)',
                                      style: small,
                                    ),
                                    controlAffinity: ListTileControlAffinity.leading,
                                  ),
                                );
                              },
                            ),
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
    _revalidateProcessOrder();
  }

  String _summaryTestTitle(UserRole role) {
    if (_mode == _OrderMode.prescriptionOnly) return 'Prescription upload';
    final lines = _linesForRole(role);
    if (lines.isEmpty) return '—';
    if (lines.length == 1) return lines.first.testName;
    return '${lines.length} selected tests';
  }

  void _goBack(BuildContext context) {
    if (context.canPop()) {
      context.pop();
      return;
    }
    context.go('/home');
  }

  @override
  Widget build(BuildContext context) {
    final session = SessionScope.of(context);
    final user = session.user;
    final role = user?.role ?? UserRole.patient;
    final lines = _linesForRole(role);

    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          tooltip: 'Back',
          onPressed: () => _goBack(context),
        ),
        titleSpacing: 12,
        title: const AppBrandingRow(),
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
          children: [
            Text('Order lab test', style: Theme.of(context).textTheme.headlineMedium),
            const SizedBox(height: 16),
            _SectionCard(
              icon: Icons.person_outline,
              title: 'Patient details',
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _stackedFieldLabel(context, 'Patient full name'),
                  TextFormField(
                    controller: _patientName,
                    decoration: AppFieldDecoration.build(context),
                    validator: (v) => (v == null || v.trim().isEmpty) ? 'Required' : null,
                  ),
                  const SizedBox(height: 12),
                  _stackedFieldLabel(context, 'Phone'),
                  TextFormField(
                    controller: _phone,
                    decoration: AppFieldDecoration.build(
                      context,
                      prefixIcon: Icon(Icons.phone_outlined, color: Theme.of(context).colorScheme.onSurfaceVariant),
                    ),
                    keyboardType: TextInputType.phone,
                    validator: (v) => (v == null || v.trim().isEmpty) ? 'Required' : null,
                  ),
                  const SizedBox(height: 12),
                  _ResponsiveFieldPair(
                    first: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _stackedFieldLabel(context, 'Age'),
                        TextFormField(
                          controller: _age,
                          decoration: AppFieldDecoration.build(context),
                          keyboardType: TextInputType.number,
                          inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                          validator: (v) {
                            final age = int.tryParse((v ?? '').trim());
                            return (age == null || age <= 0) ? 'Enter a valid age' : null;
                          },
                        ),
                      ],
                    ),
                    second: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _stackedFieldLabel(context, 'Gender'),
                        AppDropdownFormField<String>(
                          value: _gender,
                          style: _dropdownBodyStyle(context),
                          items: ['Male', 'Female', 'Other']
                              .map(
                                (e) => DropdownMenuItem<String>(
                                  value: e,
                                  child: Text(e, style: _dropdownBodyStyle(context)),
                                ),
                              )
                              .toList(),
                          onChanged: (v) => setState(() => _gender = v ?? _gender),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),
                  _stackedFieldLabel(context, 'Blood type (optional)'),
                  TextFormField(
                    controller: _bloodType,
                    decoration: AppFieldDecoration.build(context),
                  ),
                  const SizedBox(height: 12),
                  _stackedFieldLabel(context, 'Clinical notes (optional)'),
                  TextFormField(
                    controller: _description,
                    decoration: AppFieldDecoration.build(context),
                    maxLines: 2,
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
            _SectionCard(
              icon: Icons.flag_outlined,
              title: 'Priority & delivery',
              trailing: Switch(
                value: _priority == OrderPriority.urgent,
                onChanged: (v) => setState(() => _priority = v ? OrderPriority.urgent : OrderPriority.elective),
              ),
              subtitle: _priority == OrderPriority.urgent ? 'Urgent' : 'Elective',
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _stackedFieldLabel(context, 'Report delivery'),
                  AppDropdownFormField<String>(
                    value: _reportDelivery,
                    style: _dropdownBodyStyle(context),
                    items: [
                      DropdownMenuItem(
                        value: 'soft_copy',
                        child: Text('Soft copy (app/PDF)', style: _dropdownBodyStyle(context)),
                      ),
                      DropdownMenuItem(
                        value: 'hard_copy',
                        child: Text('Hard copy', style: _dropdownBodyStyle(context)),
                      ),
                      DropdownMenuItem(
                        value: 'both',
                        child: Text('Both', style: _dropdownBodyStyle(context)),
                      ),
                    ],
                    onChanged: (v) => setState(() => _reportDelivery = v ?? _reportDelivery),
                  ),
                  const SizedBox(height: 16),
                  _stackedFieldLabel(context, 'Collection / facility notes (optional)'),
                  TextFormField(
                    controller: _facilityNotes,
                    decoration: AppFieldDecoration.build(
                      context,
                      hint: 'Notes for collector or lab…',
                    ),
                    maxLines: 2,
                  ),
                  const SizedBox(height: 16),
                  _ResponsiveFieldPair(
                    first: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _stackedFieldLabel(context, 'Preferred collection date'),
                        InkWell(
                          onTap: () async {
                            final picked = await showDatePicker(
                              context: context,
                              initialDate: _preferredDate,
                              firstDate: DateTime.now(),
                              lastDate: DateTime.now().add(const Duration(days: 365)),
                            );
                            if (picked != null) setState(() => _preferredDate = picked);
                          },
                          borderRadius: BorderRadius.circular(12),
                          child: InputDecorator(
                            decoration: AppFieldDecoration.build(
                              context,
                              prefixIcon: Icon(
                                Icons.calendar_today_outlined,
                                color: Theme.of(context).colorScheme.onSurfaceVariant,
                              ),
                            ),
                            child: Text(
                              '${_preferredDate.year}-${_preferredDate.month.toString().padLeft(2, '0')}-${_preferredDate.day.toString().padLeft(2, '0')}',
                            ),
                          ),
                        ),
                      ],
                    ),
                    second: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _stackedFieldLabel(context, 'Time note (optional)'),
                        TextFormField(
                          controller: _timeSlot,
                          decoration: AppFieldDecoration.build(
                            context,
                            hint: 'e.g. Morning, after 2pm',
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                  _stackedFieldLabel(context, 'Preferred collector (optional)'),
                  FutureBuilder<List<LabCollectorPick>>(
                    future: _collectorsFuture,
                    builder: (context, snapshot) {
                      if (snapshot.connectionState == ConnectionState.waiting && _collectors.isEmpty) {
                        return const Padding(
                          padding: EdgeInsets.symmetric(vertical: 8),
                          child: LinearProgressIndicator(),
                        );
                      }
                      if (_collectors.isEmpty) {
                        return Text(
                          'Collectors will be assigned by the lab.',
                          style: Theme.of(context).textTheme.bodySmall,
                        );
                      }
                      return CollectorPickField(
                        collectors: _collectors,
                        selectedId: _selectedCollectorId,
                        onChanged: (id) => setState(() => _selectedCollectorId = id),
                      );
                    },
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
            _SectionCard(
              icon: Icons.location_on_outlined,
              title: 'Collection address',
              child: FormField<String>(
                validator: (_) =>
                    _addressLine.text.trim().isEmpty ? 'Enter collection address' : null,
                builder: (state) => Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    AddressLocationFields(
                      addressLine: _addressLine.text,
                      latitude: _collectionLat,
                      longitude: _collectionLng,
                      addressLabel: 'Full address for sample collection',
                      onChanged: (line, lat, lng) {
                        _addressLine.text = line;
                        setState(() {
                          _collectionLat = lat;
                          _collectionLng = lng;
                        });
                        _scheduleServiceFeeLookup(lat, lng);
                        state.didChange(line);
                      },
                    ),
                    if (state.hasError)
                      Padding(
                        padding: const EdgeInsets.only(top: 8),
                        child: Text(
                          state.errorText!,
                          style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                color: Theme.of(context).colorScheme.error,
                              ),
                        ),
                      ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 12),
            _SectionCard(
              icon: Icons.route_outlined,
              title: 'How should we process this order?',
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  SegmentedButton<_OrderMode>(
                    style: SegmentedButton.styleFrom(
                      backgroundColor: context.appExtras.surfaceContainer,
                      selectedBackgroundColor: context.cardFill,
                      foregroundColor: context.cs.onSurfaceVariant,
                      selectedForegroundColor: context.cs.primary,
                      side: BorderSide(color: AppColors.outline.withValues(alpha: 0.35)),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
                    ),
                    segments: [
                      ButtonSegment(
                        value: _OrderMode.catalogTests,
                        label: Text(
                          'Tests from list',
                          style: Theme.of(context).textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w400),
                        ),
                        icon: const Icon(Icons.checklist_outlined),
                      ),
                      ButtonSegment(
                        value: _OrderMode.prescriptionOnly,
                        label: Text(
                          'Prescription file',
                          style: Theme.of(context).textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w400),
                        ),
                        icon: const Icon(Icons.upload_file_outlined),
                      ),
                    ],
                    selected: {_mode},
                    onSelectionChanged: (s) {
                      setState(() {
                        _mode = s.first;
                        if (_mode == _OrderMode.prescriptionOnly) {
                          _selectedTestIds.clear();
                        } else {
                          _prescriptionBytes = null;
                          _prescriptionName = null;
                        }
                      });
                      _revalidateProcessOrder();
                    },
                  ),
                  const SizedBox(height: 14),
                  FormField<void>(
                    key: _processOrderKey,
                    validator: (_) => _validateProcessOrder(),
                    builder: (field) {
                      final err = field.errorText;
                      if (_mode == _OrderMode.catalogTests) {
                        return FutureBuilder<List<LabTestPick>>(
                          future: _testsFuture,
                          builder: (context, snap) {
                            if (snap.connectionState == ConnectionState.waiting) {
                              return const Padding(
                                padding: EdgeInsets.symmetric(vertical: 12),
                                child: Center(child: CircularProgressIndicator()),
                              );
                            }
                            if (_tests.isEmpty) {
                              return Text(
                                'No lab tests in the catalog. Use “Prescription file” or ask the lab to publish tests.',
                                style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: AppColors.error),
                              );
                            }
                            final n = _selectedTestIds.length;
                            return Column(
                              crossAxisAlignment: CrossAxisAlignment.stretch,
                              children: [
                                _stackedFieldLabel(context, 'Tests from catalog', required: true),
                                AppDropdownTapField(
                                  label: n == 0
                                      ? 'Select tests from catalog…'
                                      : '$n test${n == 1 ? '' : 's'} selected — tap to add or remove',
                                  onTap: () => _openTestCatalogSheet(role),
                                  hasError: err != null,
                                ),
                                if (err != null) _fieldErrorText(context, err),
                              ],
                            );
                          },
                        );
                      }
                      return Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          _stackedFieldLabel(context, 'Prescription file', required: true),
                          AppDropdownTapField(
                            label: _prescriptionName == null
                                ? 'Add PDF, image, or take photo'
                                : 'Change file',
                            onTap: _pickPrescription,
                            hasError: err != null,
                          ),
                          if (err != null) _fieldErrorText(context, err),
                          if (_prescriptionName != null) ...[
                            const SizedBox(height: 8),
                            Text(
                              _prescriptionName!,
                              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                    color: context.cs.onSurfaceVariant,
                                  ),
                            ),
                          ],
                          const SizedBox(height: 8),
                          Text(
                            'The lab will review your file and assign tests. Order status stays pending until they add catalog lines.',
                            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                  color: context.cs.onSurfaceVariant,
                                ),
                          ),
                        ],
                      );
                    },
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
            _SectionCard(
              icon: Icons.receipt_long_outlined,
              title: 'Summary',
              child: _mode == _OrderMode.catalogTests
                  ? Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        if (lines.isEmpty)
                          Text('No tests selected yet.', style: Theme.of(context).textTheme.bodyMedium)
                        else ...[
                          for (final line in lines)
                            Padding(
                              padding: const EdgeInsets.only(bottom: 6),
                              child: Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Expanded(
                                    child: Text(
                                      '${line.testName} (${line.testCode})',
                                      style: Theme.of(context).textTheme.bodyMedium,
                                    ),
                                  ),
                                  Text(
                                    '${line.subtotalMmk.toStringAsFixed(0)} MMK',
                                    style: Theme.of(context).textTheme.bodyMedium,
                                  ),
                                ],
                              ),
                            ),
                          const Divider(height: 20),
                          Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Expanded(
                                child: Text(
                                  'Original subtotal',
                                  style: Theme.of(context).textTheme.bodySmall,
                                ),
                              ),
                              Text(
                                '${_sumOriginal(lines).toStringAsFixed(0)} MMK',
                                style: Theme.of(context).textTheme.bodySmall,
                                textAlign: TextAlign.right,
                              ),
                            ],
                          ),
                          const SizedBox(height: 4),
                          Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Expanded(
                                child: Text(
                                  'Estimated total (after discounts)',
                                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                        color: Theme.of(context).colorScheme.onSurface,
                                      ),
                                  softWrap: true,
                                ),
                              ),
                              const SizedBox(width: 8),
                              Text(
                                '${_sumFinal(lines).toStringAsFixed(0)} MMK',
                                style: Theme.of(context).textTheme.bodyMedium,
                                textAlign: TextAlign.right,
                              ),
                            ],
                          ),
                          _serviceFeeSummaryRow(context),
                          if (_serviceFeeQuote != null && !_serviceFeeOutOfCoverage) ...[
                            const SizedBox(height: 8),
                            Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Expanded(
                                  child: Text(
                                    'Estimated amount due',
                                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                          fontWeight: FontWeight.w600,
                                        ),
                                  ),
                                ),
                                Text(
                                  '${_estimatedGrandTotal(lines).toStringAsFixed(0)} MMK',
                                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                        fontWeight: FontWeight.w600,
                                      ),
                                  textAlign: TextAlign.right,
                                ),
                              ],
                            ),
                          ],
                        ],
                      ],
                    )
                  : Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          _prescriptionBytes == null
                              ? 'Add a prescription file to submit.'
                              : 'Prescription attached. Totals will be set when the lab assigns tests.',
                          style: Theme.of(context).textTheme.bodyMedium,
                        ),
                        _serviceFeeSummaryRow(context),
                      ],
                    ),
            ),
            const SizedBox(height: 20),
            SizedBox(
              height: 56,
              child: FilledButton.icon(
                onPressed: session.busy || user == null
                    ? null
                    : () async {
                        if (!_formKey.currentState!.validate()) return;
                        if (!hasMeaningfulCoordinates(_collectionLat, _collectionLng)) {
                          AppToast.warning(
                            context,
                            'Set collection coordinates — type the address or choose on the map.',
                          );
                          return;
                        }
                        if (_serviceFeeLoading) {
                          AppToast.warning(context, 'Still checking service coverage for this address.');
                          return;
                        }
                        if (_serviceFeeOutOfCoverage) {
                          AppToast.warning(
                            context,
                            _serviceFeeError ??
                                'This address is outside our service coverage areas.',
                          );
                          return;
                        }
                        if (_serviceFeeQuote == null && _serviceFeeError != null) {
                          AppToast.warning(context, _serviceFeeError!);
                          return;
                        }

                        final ageYears = int.tryParse(_age.text.trim());
                        if (ageYears == null || ageYears <= 0) {
                          AppToast.warning(context, 'Enter a valid age (whole number).');
                          return;
                        }

                        final builtLines = _linesForRole(user.role);
                        if (_mode == _OrderMode.catalogTests && builtLines.isEmpty) {
                          AppToast.warning(
                            context,
                            'Selected tests could not be loaded. Wait for the catalog or pick tests again.',
                          );
                          return;
                        }
                        final order = LabOrderRequest(
                          testName: _summaryTestTitle(user.role),
                          description: _description.text.trim(),
                          priority: _priority,
                          patientName: _patientName.text.trim(),
                          age: ageYears,
                          phone: _phone.text.trim(),
                          gender: _gender,
                          bloodType: _bloodType.text.trim(),
                          labFacility: _facilityNotes.text.trim(),
                          preferredDate: _preferredDate,
                          timeSlot: _timeSlot.text.trim(),
                          address: LabAddress(
                            line: _addressLine.text.trim(),
                            latitude: _collectionLat,
                            longitude: _collectionLng,
                            placeId: null,
                          ),
                          createdAt: DateTime.now(),
                          reportDeliveryMethod: _reportDelivery,
                          catalogLines: builtLines,
                          prescriptionBytes: _mode == _OrderMode.prescriptionOnly ? _prescriptionBytes : null,
                          prescriptionFilename: _mode == _OrderMode.prescriptionOnly ? _prescriptionName : null,
                          collectorId: _selectedCollectorId,
                        );
                        try {
                          await session.submitLabOrder(order);
                          if (!context.mounted) return;
                          AppToast.successInShell(
                            context,
                            'Status is pending — the lab will review your request.',
                            title: 'Order submitted',
                          );
                          context.go('/order-success');
                        } catch (e) {
                          if (!context.mounted) return;
                          final msg = e is LabApiException
                              ? e.message
                              : '$e';
                          AppToast.errorInShell(context, msg, title: 'Order failed');
                        }
                      },
                icon: const Icon(Icons.save_outlined),
                label: Text(
                  session.busy ? 'Saving…' : 'Save order',
                  style: Theme.of(context).textTheme.labelLarge?.copyWith(
                        fontWeight: FontWeight.w400,
                        color: Theme.of(context).colorScheme.onPrimary,
                      ),
                ),
              ),
            ),
          ],
        ),
      ),
      bottomNavigationBar: const LabMainBottomNav(current: LabMainTab.orders),
    );
  }
}

/// Side-by-side fields on wide layouts; stacks vertically when space is tight.
class _ResponsiveFieldPair extends StatelessWidget {
  const _ResponsiveFieldPair({
    required this.first,
    required this.second,
  });

  static const double _breakpoint = 520;
  static const double _spacing = 12;

  final Widget first;
  final Widget second;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final stack = constraints.maxWidth < _breakpoint;
        if (stack) {
          return Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              first,
              const SizedBox(height: _spacing),
              second,
            ],
          );
        }
        return Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(child: first),
            const SizedBox(width: _spacing),
            Expanded(child: second),
          ],
        );
      },
    );
  }
}

class _SectionCard extends StatelessWidget {
  const _SectionCard({
    required this.icon,
    required this.title,
    required this.child,
    this.subtitle,
    this.trailing,
  });

  final IconData icon;
  final String title;
  final String? subtitle;
  final Widget child;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: context.cardFill,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: context.subtleBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: context.appExtras.iconTileBackground,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(icon, color: context.cs.primary),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title, style: Theme.of(context).textTheme.titleMedium),
                    if (subtitle != null)
                      Text(
                        subtitle!,
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(color: context.cs.onSurfaceVariant),
                      ),
                  ],
                ),
              ),
              if (trailing != null) trailing!,
            ],
          ),
          const SizedBox(height: 12),
          child,
        ],
      ),
    );
  }
}
