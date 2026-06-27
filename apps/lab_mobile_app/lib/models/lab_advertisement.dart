/// Promotional banner from `GET /api/advertisements`.
class LabAdvertisement {
  const LabAdvertisement({
    required this.id,
    required this.title,
    this.description,
    this.bannerImageUrl,
    this.actionUrl,
  });

  final String id;
  final String title;
  final String? description;

  /// Resolved URL suitable for [Image.network].
  final String? bannerImageUrl;
  final String? actionUrl;

  bool get hasBanner => bannerImageUrl != null && bannerImageUrl!.trim().isNotEmpty;
  bool get hasAction => actionUrl != null && actionUrl!.trim().isNotEmpty;
}
