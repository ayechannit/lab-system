/// Default map center when no coordinates are set (Yangon area — typical lab region).
const double kDefaultMapLat = 16.8661;
const double kDefaultMapLng = 96.1951;

bool hasMeaningfulCoordinates(double? lat, double? lng) {
  if (lat == null || lng == null) return false;
  if (!lat.isFinite || !lng.isFinite) return false;
  return lat.abs() > 1e-5 || lng.abs() > 1e-5;
}
