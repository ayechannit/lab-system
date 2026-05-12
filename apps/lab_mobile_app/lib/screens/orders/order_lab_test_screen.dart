import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../app/session_scope.dart';
import '../../models/lab_order.dart';
import '../../theme/app_colors.dart';
import '../../widgets/common/app_brand_mark.dart';
import '../../widgets/forms/address_map_placeholder.dart';

class OrderLabTestScreen extends StatefulWidget {
  const OrderLabTestScreen({super.key});

  @override
  State<OrderLabTestScreen> createState() => _OrderLabTestScreenState();
}

class _OrderLabTestScreenState extends State<OrderLabTestScreen> {
  final _formKey = GlobalKey<FormState>();
  final _testName = TextEditingController();
  final _description = TextEditingController(text: 'Routine health check');
  final _patientName = TextEditingController(text: 'John Doe');
  final _age = TextEditingController(text: '34');
  final _phone = TextEditingController(text: '+95 9 123 456 789');
  final _bloodType = TextEditingController(text: 'O+');
  String _gender = 'Male';
  String _labFacility = 'MedLab Central - Downtown';
  final _preferredDate = TextEditingController(text: '11/24/2023');
  final _timeSlot = TextEditingController(text: '08:00 AM - 10:00 AM');
  OrderPriority _priority = OrderPriority.elective;
  String _address = '123 Medical Avenue, Flat 4B, Downtown';

  @override
  void dispose() {
    _testName.dispose();
    _description.dispose();
    _patientName.dispose();
    _age.dispose();
    _phone.dispose();
    _bloodType.dispose();
    _preferredDate.dispose();
    _timeSlot.dispose();
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
              subtitle: 'Verified Profile',
              child: Column(
                children: [
                  TextFormField(
                    controller: _patientName,
                    decoration: const InputDecoration(labelText: 'Full Name'),
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
                      labelText: 'Medical Notes / Symptoms',
                      alignLabelWithHint: true,
                    ),
                    maxLines: 2,
                    validator: (v) => (v == null || v.trim().isEmpty) ? 'Required' : null,
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
                  DropdownButtonFormField<String>(
                    value: _labFacility,
                    isExpanded: true,
                    decoration: const InputDecoration(labelText: 'Lab Facility'),
                    items: const [
                      'MedLab Central - Downtown',
                      'MedLab East - Township',
                      'MedLab North - Clinic'
                    ]
                        .map(
                          (e) => DropdownMenuItem<String>(
                            value: e,
                            child: Text(e, maxLines: 1, overflow: TextOverflow.ellipsis),
                          ),
                        )
                        .toList(),
                    onChanged: (v) => setState(() => _labFacility = v ?? _labFacility),
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _testName,
                    decoration: const InputDecoration(
                      labelText: 'Test Type',
                      hintText: 'Select desired test type',
                    ),
                    validator: (v) => (v == null || v.trim().isEmpty) ? 'Required' : null,
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: TextFormField(
                          controller: _preferredDate,
                          decoration: const InputDecoration(labelText: 'Preferred Date'),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: TextFormField(
                          controller: _timeSlot,
                          decoration: const InputDecoration(labelText: 'Time Slot'),
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
                            "Results are usually available within 24-48 hours. Selecting 'Urgent' prioritizes your sample for 8-hour turnaround.",
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
              title: 'Collection Address',
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  AddressMapPlaceholder(
                    address: _address,
                    onPickDemo: () => setState(() {
                      _address = '123 Medical Avenue, Flat 4B, Downtown';
                    }),
                  ),
                  const SizedBox(height: 8),
                  TextFormField(
                    initialValue: _address,
                    onChanged: (v) => _address = v.trim(),
                    decoration: const InputDecoration(labelText: 'Precise Location'),
                    validator: (v) => (v == null || v.trim().isEmpty) ? 'Required' : null,
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
                  const bloodTestFee = 45.0;
                  const collectionFee = 10.0;
                  final urgentFee = _priority == OrderPriority.urgent ? 15.0 : 0.0;
                  final total = bloodTestFee + collectionFee + urgentFee;
                  TextStyle? label = Theme.of(context).textTheme.bodyMedium?.copyWith(color: AppColors.onSurfaceVariant);
                  TextStyle? value = Theme.of(context).textTheme.bodyMedium;
                  return Column(
                    children: [
                      _summaryRow('CBC Blood Test', '\$45.00', label, value),
                      _summaryRow('Home Collection Fee', '\$10.00', label, value),
                      _summaryRow('Urgent Processing', urgentFee == 0 ? '\$0.00' : '\$15.00', label, value),
                      const Divider(height: 18),
                      _summaryRow(
                        'Estimated Total',
                        '\$${total.toStringAsFixed(2)}',
                        Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
                        Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w800),
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
                onPressed: () {
                  if (!_formKey.currentState!.validate()) return;
                  DateTime preferred;
                  final raw = _preferredDate.text.trim();
                  final parts = raw.split('/');
                  if (parts.length == 3) {
                    preferred = DateTime(
                      int.tryParse(parts[2]) ?? DateTime.now().year,
                      int.tryParse(parts[0]) ?? DateTime.now().month,
                      int.tryParse(parts[1]) ?? DateTime.now().day,
                    );
                  } else {
                    preferred = DateTime.now().add(const Duration(days: 1));
                  }
                  final order = LabOrderRequest(
                    testName: _testName.text.trim(),
                    description: _description.text.trim(),
                    priority: _priority,
                    patientName: _patientName.text.trim(),
                    age: int.parse(_age.text.trim()),
                    phone: _phone.text.trim(),
                    gender: _gender,
                    bloodType: _bloodType.text.trim(),
                    labFacility: _labFacility,
                    preferredDate: preferred,
                    timeSlot: _timeSlot.text.trim(),
                    address: LabAddress(
                      line: _address,
                      latitude: 16.8661,
                      longitude: 96.1951,
                      placeId: 'demo-place-1',
                    ),
                    createdAt: DateTime.now(),
                  );
                  session.submitLabOrder(order).then((_) {
                    if (!context.mounted) return;
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text('Order submitted (${_priority.label})')),
                    );
                    context.go('/order-success');
                  });
                },
                icon: const Icon(Icons.arrow_forward),
                label: const Text('Confirm & Order'),
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
      bottomNavigationBar: Container(
        margin: const EdgeInsets.fromLTRB(14, 0, 14, 14),
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: const Color(0x66E1E2EC)),
        ),
        child: Row(
          children: [
            Expanded(child: _NavItem(icon: Icons.grid_view_rounded, label: 'HOME', onTap: () => context.go('/home'))),
            Expanded(child: _NavItem(icon: Icons.biotech_outlined, label: 'ORDERS', active: true, onTap: () {})),
            Expanded(child: _NavItem(icon: Icons.assignment_outlined, label: 'RESULTS', onTap: () => context.push('/lab-results'))),
            Expanded(child: _NavItem(icon: Icons.military_tech_outlined, label: 'POINTS', onTap: () => context.push('/loyalty'))),
            Expanded(child: _NavItem(icon: Icons.person_outline, label: 'PROFILE', onTap: () => context.push('/profile'))),
          ],
        ),
      ),
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

class _NavItem extends StatelessWidget {
  const _NavItem({
    required this.icon,
    required this.label,
    required this.onTap,
    this.active = false,
  });

  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final bool active;

  @override
  Widget build(BuildContext context) {
    final fg = active ? AppColors.primary : AppColors.outline;
    return Material(
      color: active ? const Color(0xFFEAF1FF) : Colors.transparent,
      borderRadius: BorderRadius.circular(12),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 2, vertical: 6),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Icon(icon, size: 20, color: fg),
              const SizedBox(height: 2),
              FittedBox(
                fit: BoxFit.scaleDown,
                child: Text(
                  label,
                  maxLines: 1,
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.labelSmall?.copyWith(
                        color: fg,
                        fontWeight: active ? FontWeight.w700 : FontWeight.w600,
                      ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
