/// Promotional banner from `GET /api/advertisements`.
class LabAdvertisement {
  const LabAdvertisement({
    required this.id,
    required this.title,
    this.description,
    this.bannerImageUrl,
  });

  final String id;
  final String title;
  final String? description;

  /// Resolved URL suitable for [Image.network].
  final String? bannerImageUrl;

  bool get hasBanner => bannerImageUrl != null && bannerImageUrl!.trim().isNotEmpty;
}
