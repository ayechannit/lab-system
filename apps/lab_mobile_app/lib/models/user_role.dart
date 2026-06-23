import 'package:flutter/material.dart';

enum UserRole {
  patient,
  doctor,
  clinic,
  phlebotomist;

  String get label => switch (this) {
        UserRole.patient => 'Patient',
        UserRole.doctor => 'Doctor',
        UserRole.clinic => 'Clinic',
        UserRole.phlebotomist => 'Phlebotomist',
      };

  bool get requiresStaffApproval => this != UserRole.patient;

  String get signupDescription => switch (this) {
        UserRole.patient => 'Book tests and view your own results.',
        UserRole.doctor => 'Order lab tests for your patients.',
        UserRole.clinic => 'Place and manage orders for your clinic.',
        UserRole.phlebotomist => 'Collect samples on home visits.',
      };

  IconData get icon => switch (this) {
        UserRole.patient => Icons.person_rounded,
        UserRole.doctor => Icons.medical_services_rounded,
        UserRole.clinic => Icons.local_hospital_rounded,
        UserRole.phlebotomist => Icons.bloodtype_rounded,
      };

  Color get accentColor => switch (this) {
        UserRole.patient => const Color(0xFF2563EB),
        UserRole.doctor => const Color(0xFF0891B2),
        UserRole.clinic => const Color(0xFF7C3AED),
        UserRole.phlebotomist => const Color(0xFFE11D48),
      };
}
