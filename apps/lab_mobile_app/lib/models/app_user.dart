class AppUser {
  const AppUser({
    required this.id,
    required this.name,
    required this.phone,
    this.pointsBalance = 0,
    this.address = '',
    this.latitude = 0,
    this.longitude = 0,
    this.profileImageUrl,
    this.tierName,
    this.tierDiscountPercent = 0,
  });

  final String id;
  final String name;
  final String phone;
  final int pointsBalance;

  /// From `GET /api/auth/me` (`lab_end_users`); used for order `latitude` / `longitude` defaults.
  final String address;
  final double latitude;
  final double longitude;
  final String? profileImageUrl;

  /// Current membership tier (e.g. "Normal", "Silver", "Gold"), resolved server-side from lifetime spend.
  final String? tierName;

  /// Tier discount, stacked additively with a test's own `discountPercent` when pricing an order line.
  final int tierDiscountPercent;

  AppUser copyWith({
    String? name,
    String? phone,
    int? pointsBalance,
    String? address,
    double? latitude,
    double? longitude,
    String? profileImageUrl,
    String? tierName,
    int? tierDiscountPercent,
  }) {
    return AppUser(
      id: id,
      name: name ?? this.name,
      phone: phone ?? this.phone,
      pointsBalance: pointsBalance ?? this.pointsBalance,
      address: address ?? this.address,
      latitude: latitude ?? this.latitude,
      longitude: longitude ?? this.longitude,
      profileImageUrl: profileImageUrl ?? this.profileImageUrl,
      tierName: tierName ?? this.tierName,
      tierDiscountPercent: tierDiscountPercent ?? this.tierDiscountPercent,
    );
  }
}
