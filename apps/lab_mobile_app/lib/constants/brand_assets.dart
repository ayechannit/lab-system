/// Bundled IDHC brand images (same files as admin web `src/assets/`).
abstract final class BrandAssets {
  /// Stacked full logo for mobile auth screens (login, splash, register).
  static const idhcLogoMobile = 'assets/idhc-logo-mobile.png';
  static const idhcLockup = 'assets/idhc-lockup.png';
  /// App launcher icon source only — not used in in-app UI.
  static const idhcEmblem = 'assets/idhc-emblem.png';
}

enum AppBrandMarkStyle {
  /// Full horizontal logo — login, splash, register.
  fullLogo,

  /// Emblem + wordmark lockup — in-app headers and toolbars.
  lockup,
}
