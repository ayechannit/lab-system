import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../app/session_scope.dart';
import '../../models/lab_order.dart';
import '../../models/lab_test_pick.dart';
import '../../theme/app_colors.dart';
import '../../widgets/common/app_brand_mark.dart';
import '../../widgets/navigation/lab_main_bottom_nav.dart';

class OrderLabTestScreen extends StatefulWidget {
  const OrderLabTestScreen({super.key});

  @override
  State<OrderLabTestScreen> createState() => _OrderLabTestScreenState();
}

class _OrderLabTestScreenState extends State<OrderLabTestScreen> {
  final _formKey = GlobalKey<FormState>();
  final _description = TextEditingController();
  final _patientName = TextEditingController();
  final _age = TextEditingController();
  final _phone = TextEditingController();
  final _bloodType = TextEditingController();
  String _gender = 'Male';
  final _facilityNotes = TextEditingController();
  final _timeSlot = TextEditingController();
  final _addressLine = TextEditingController();
  OrderPriority _priority = OrderPriority.elective;
  static const double _defaultLat = 0;
  static const double _defaultLng = 0;

  Future<List<LabTestPick>>? _testsFuture;
  LabTestPick? _selectedTest;
  DateTime _preferredDate = DateTime.now().add(const Duration(days: 1));
  String _reportDelivery = 'soft_copy';
  bool _catalogInit = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_catalogInit) return;
    _catalogInit = true;
    _testsFuture = SessionScope.of(context).fetchActiveLabTests().then((list) {
      if (mounted && list.isNotEmpty) {
        setState(() => _selectedTest = list.first);
      }
      return list;
    });
  }

  @override
  void dispose() {
    _description.dispose();
    _patientName.dispose();
    _age.dispose();
    _phone.dispose();
    _bloodType.dispose();
    _facilityNotes.dispose();
    _timeSlot.dispose();
    _addressLine.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final session = SessionScope.of(context);
    return Scaffold(
      appBar: AppBar(
        automaticallyImplyLeading: false,
        titleSpacing: 4,
        title: Text(
          'MedLab Smart',
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                color: AppColors.primary,
                fontWeight: FontWeight.w800,
              ),
        ),
        actions: const [
          AppBrandMark(size: 24, iconSize: 12, borderRadius: 6),
          SizedBox(width: 10),
        ],
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 20),
          children: [
            Text('Order Lab Test', style: Theme.of(context).textTheme.headlineMedium),
            const SizedBox(height: 4),
            Text('Schedule a medical screening at your convenience.',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: AppColors.onSurfaceVariant)),
            const SizedBox(height: 16),
            _SectionCard(
              icon: Icons.person_outline,
              title: 'Patient Details',
              child: Column(
                children: [
                  TextFormField(
                    controller: _patientName,
                    decoration: const InputDecoration(labelText: 'Full Name'),
                    validator: (v) => (v == null || v.trim().isEmpty) ? 'Required' : null,
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _phone,
                    decoration: const InputDecoration(
                      labelText: 'Phone',
                      prefixIcon: Icon(Icons.phone_outlined),
                    ),
                    keyboardType: TextInputType.phone,
                    validator: (v) => (v == null || v.trim().isEmpty) ? 'Required' : null,
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: TextFormField(
                          controller: _age,
                          decoration: const InputDecoration(labelText: 'Age'),
                          keyboardType: TextInputType.number,
                          validator: (v) {
                            final age = int.tryParse((v ?? '').trim());
                            return (age == null || age <= 0) ? 'Invalid' : null;
                          },
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: DropdownButtonFormField<String>(
                          value: _gender,
                          isExpanded: true,
                          decoration: const InputDecoration(labelText: 'Gender'),
                          items: const ['Male', 'Female', 'Other']
                              .map((e) => DropdownMenuItem(value: e, child: Text(e)))
                              .toList(),
                          onChanged: (v) => setState(() => _gender = v ?? _gender),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _bloodType,
                    decoration: const InputDecoration(labelText: 'Blood'),
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _description,
                    decoration: const InputDecoration(
                      labelText: 'Medical notes / symptoms',
                      alignLabelWithHint: true,
                    ),
                    maxLines: 2,
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
            _SectionCard(
              icon: Icons.biotech_outlined,
              title: 'Screening Details',
              trailing: Switch(
                value: _priority == OrderPriority.urgent,
                onChanged: (v) => setState(() => _priority = v ? OrderPriority.urgent : OrderPriority.elective),
              ),
              subtitle: _priority == OrderPriority.urgent ? 'Urgent' : 'Elective',
              child: Column(
                children: [
                  TextFormField(
                    controller: _facilityNotes,
                    decoration: const InputDecoration(
                      labelText: 'Collection / facility notes',
                    ),
                    maxLines: 2,
                  ),
                  const SizedBox(height: 12),
                  FutureBuilder<List<LabTestPick>>(
                    future: _testsFuture,
                    builder: (context, snap) {
                      if (snap.connectionState == ConnectionState.waiting) {
                        return const Padding(
                          padding: EdgeInsets.symmetric(vertical: 8),
                          child: Center(child: CircularProgressIndicator()),
                        );
                      }
                      final tests = snap.data ?? const <LabTestPick>[];
                      if (tests.isEmpty) {
                        return Text(
                          'No lab tests available. Ask the lab to publish the catalog.',
                          style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: AppColors.error),
                        );
                      }
                      return DropdownButtonFormField<LabTestPick>(
                        value: () {
                          if (tests.isEmpty) return null;
                          if (_selectedTest == null) return tests.first;
                          for (final t in tests) {
                            if (t.id == _selectedTest!.id) return t;
                          }
                          return tests.first;
                        }(),
                        isExpanded: true,
                        decoration: const InputDecoration(labelText: 'Lab test (catalog)'),
                        items: tests
                            .map(
                              (t) => DropdownMenuItem<LabTestPick>(
                                value: t,
                                child: Text('${t.name} (${t.basePriceMmk} MMK)', overflow: TextOverflow.ellipsis),
                              ),
                            )
                            .toList(),
                        onChanged: (v) => setState(() => _selectedTest = v),
                      );
                    },
                  ),
                  const SizedBox(height: 12),
                  DropdownButtonFormField<String>(
                    value: _reportDelivery,
                    isExpanded: true,
                    decoration: const InputDecoration(labelText: 'Report delivery'),
                    items: const [
                      DropdownMenuItem(value: 'soft_copy', child: Text('Soft copy (app/PDF)')),
                      DropdownMenuItem(value: 'hard_copy', child: Text('Hard copy')),
                      DropdownMenuItem(value: 'both', child: Text('Both')),
                    ],
                    onChanged: (v) => setState(() => _reportDelivery = v ?? _reportDelivery),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: InkWell(
                          onTap: () async {
                            final picked = await showDatePicker(
                              context: context,
                              initialDate: _preferredDate,
                              firstDate: DateTime.now(),
                              lastDate: DateTime.now().add(const Duration(days: 365)),
                            );
                            if (picked != null) setState(() => _preferredDate = picked);
                          },
                          child: InputDecorator(
                            decoration: const InputDecoration(labelText: 'Preferred collection date'),
                            child: Text(
                              '${_preferredDate.year}-${_preferredDate.month.toString().padLeft(2, '0')}-${_preferredDate.day.toString().padLeft(2, '0')}',
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: TextFormField(
                          controller: _timeSlot,
                          decoration: const InputDecoration(labelText: 'Time preference'),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: const Color(0xFFEAF1FF),
                      borderRadius: BorderRadius.circular(10),
                      border: const Border(
                        left: BorderSide(color: AppColors.primaryLight, width: 3),
                      ),
                    ),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Icon(Icons.info_outline, color: AppColors.primary, size: 18),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            'Turnaround and priority are determined by the lab after you submit this order.',
                            style: Theme.of(context)
                                .textTheme
                                .bodySmall
                                ?.copyWith(color: AppColors.onSurfaceVariant),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
            _SectionCard(
              icon: Icons.location_on_outlined,
              title: 'Collection address',
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  TextFormField(
                    controller: _addressLine,
                    decoration: const InputDecoration(
                      labelText: 'Full address for sample collection',
                    ),
                    maxLines: 3,
                    validator: (v) => (v == null || v.trim().isEmpty) ? 'Required' : null,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Map pin selection will use the lab geocoder in a future update. '
                    'Coordinates are sent as 0,0 until then; the lab uses your address text.',
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(color: AppColors.onSurfaceVariant),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
            _SectionCard(
              icon: Icons.receipt_long_outlined,
              title: 'Order Summary',
              child: Builder(
                builder: (context) {
                  final pick = _selectedTest;
                  final base = pick?.basePriceMmk ?? 0;
                  final urgent = _priority == OrderPriority.urgent ? 15000 : 0;
                  final collection = 10000;
                  final total = base + collection + urgent;
                  TextStyle? label = Theme.of(context).textTheme.bodyMedium?.copyWith(color: AppColors.onSurfaceVariant);
                  TextStyle? value = Theme.of(context).textTheme.bodyMedium;
                  return Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      if (pick != null) ...[
                        _summaryRow('${pick.name} (${pick.code})', '$base MMK', label, value),
                        _summaryRow('Home collection', '$collection MMK', label, value),
                        _summaryRow('Urgent processing', urgent == 0 ? '0 MMK' : '$urgent MMK', label, value),
                      ] else
                        Text('Select a lab test to see pricing.', style: label),
                      const Divider(height: 18),
                      _summaryRow(
                        'Estimated total',
                        '$total MMK',
                        Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
                        Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w800),
                      ),
                      Padding(
                        padding: const EdgeInsets.only(top: 8),
                        child: Text(
                          'Totals are estimates from catalog prices; the lab confirms final amounts on the order.',
                          style: Theme.of(context).textTheme.bodySmall?.copyWith(color: AppColors.onSurfaceVariant),
                        ),
                      ),
                    ],
                  );
                },
              ),
            ),
            const SizedBox(height: 24),
            SizedBox(
              height: 56,
              child: FilledButton.icon(
                onPressed: session.busy
                    ? null
                    : () async {
                        if (!_formKey.currentState!.validate()) return;
                        final pick = _selectedTest;
                        if (pick == null) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('Select a lab test from the catalog.')),
                          );
                          return;
                        }
                        final order = LabOrderRequest(
                          testName: pick.name,
                          description: _description.text.trim(),
                          priority: _priority,
                          patientName: _patientName.text.trim(),
                          age: int.parse(_age.text.trim()),
                          phone: _phone.text.trim(),
                          gender: _gender,
                          bloodType: _bloodType.text.trim(),
                          labFacility: _facilityNotes.text.trim(),
                          preferredDate: _preferredDate,
                          timeSlot: _timeSlot.text.trim(),
                          address: LabAddress(
                            line: _addressLine.text.trim(),
                            latitude: _defaultLat,
                            longitude: _defaultLng,
                            placeId: null,
                          ),
                          createdAt: DateTime.now(),
                          reportDeliveryMethod: _reportDelivery,
                          catalogTestId: pick.id,
                          catalogLinePriceMmk: pick.basePriceMmk,
                        );
                        try {
                          await session.submitLabOrder(order);
                          if (!context.mounted) return;
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(content: Text('Order submitted (${_priority.label})')),
                          );
                          context.go('/order-success');
                        } catch (e) {
                          if (!context.mounted) return;
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(content: Text('$e')),
                          );
                        }
                      },
                icon: const Icon(Icons.arrow_forward),
                label: Text(session.busy ? 'Submitting…' : 'Confirm & Order'),
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'By submitting, you agree to our Service Terms & Fees.',
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(color: AppColors.onSurfaceVariant),
            ),
          ],
        ),
      ),
      bottomNavigationBar: const LabMainBottomNav(current: LabMainTab.orders),
    );
  }
}

Widget _summaryRow(String label, String value, TextStyle? labelStyle, TextStyle? valueStyle) {
  return Padding(
    padding: const EdgeInsets.symmetric(vertical: 2),
    child: Row(
      children: [
        Expanded(
          child: Text(label, style: labelStyle, maxLines: 2, overflow: TextOverflow.ellipsis),
        ),
        const SizedBox(width: 8),
        Flexible(
          child: Text(
            value,
            style: valueStyle,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            textAlign: TextAlign.end,
          ),
        ),
      ],
    ),
  );
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
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0x66E1E2EC)),
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
                  color: const Color(0xFFEAF1FF),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(icon, color: AppColors.primary),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title, style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
                    if (subtitle != null)
                      Text(
                        subtitle!,
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(color: AppColors.onSurfaceVariant),
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
