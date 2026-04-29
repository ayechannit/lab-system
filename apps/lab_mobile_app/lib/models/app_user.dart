import 'user_role.dart';

class AppUser {
  const AppUser({
    required this.id,
    required this.name,
    required this.phone,
    required this.email,
    required this.role,
    this.pointsBalance = 0,
  });

  final String id;
  final String name;
  final String phone;
  final String email;
  final UserRole role;
  final int pointsBalance;

  AppUser copyWith({
    String? name,
    String? phone,
    String? email,
    UserRole? role,
    int? pointsBalance,
  }) {
    return AppUser(
      id: id,
      name: name ?? this.name,
      phone: phone ?? this.phone,
      email: email ?? this.email,
      role: role ?? this.role,
      pointsBalance: pointsBalance ?? this.pointsBalance,
    );
  }
}
