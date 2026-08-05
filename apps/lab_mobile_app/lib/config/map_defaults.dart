/// Default map center when no coordinates are set (Mandalay — primary lab region).
const double kDefaultMapLat = 21.9588;
const double kDefaultMapLng = 96.0891;

bool hasMeaningfulCoordinates(double? lat, double? lng) {
  if (lat == null || lng == null) return false;
  if (!lat.isFinite || !lng.isFinite) return false;
  return lat.abs() > 1e-5 || lng.abs() > 1e-5;
}
