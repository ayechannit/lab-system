enum UserRole {
  patient,
  doctor,
  clinic;

  String get label => switch (this) {
        UserRole.patient => 'Patient',
        UserRole.doctor => 'Doctor',
        UserRole.clinic => 'Clinic',
      };
}
