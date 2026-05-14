import 'user_role.dart';

class AppUser {
  const AppUser({
    required this.id,
    required this.name,
    required this.phone,
    required this.email,
    required this.role,
    this.pointsBalance = 0,
    this.address = '',
    this.latitude = 0,
    this.longitude = 0,
  });

  final String id;
  final String name;
  final String phone;
  final String email;
  final UserRole role;
  final int pointsBalance;

  /// From `GET /api/auth/me` (`lab_end_users`); used for order `latitude` / `longitude` defaults.
  final String address;
  final double latitude;
  final double longitude;

  AppUser copyWith({
    String? name,
    String? phone,
    String? email,
    UserRole? role,
    int? pointsBalance,
    String? address,
    double? latitude,
    double? longitude,
  }) {
    return AppUser(
      id: id,
      name: name ?? this.name,
      phone: phone ?? this.phone,
      email: email ?? this.email,
      role: role ?? this.role,
      pointsBalance: pointsBalance ?? this.pointsBalance,
      address: address ?? this.address,
      latitude: latitude ?? this.latitude,
      longitude: longitude ?? this.longitude,
    );
  }
}
