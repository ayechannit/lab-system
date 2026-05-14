/// Result of [AddressMapPickerScreen] — address line + coordinates for `POST/PUT /api/users`.
class AddressMapPickResult {
  const AddressMapPickResult({
    required this.addressLine,
    required this.latitude,
    required this.longitude,
  });

  final String addressLine;
  final double latitude;
  final double longitude;
}
