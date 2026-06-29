import 'dart:async';

import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../l10n/app_localizations.dart';
import '../../models/lab_advertisement.dart';
import '../../theme/theme_extensions.dart';

/// Promotional banner carousel for the home dashboard.
class HomeAdvertisementSection extends StatefulWidget {
  const HomeAdvertisementSection({
    super.key,
    required this.advertisements,
    this.loading = false,
  });

  final List<LabAdvertisement> advertisements;
  final bool loading;

  @override
  State<HomeAdvertisementSection> createState() => _HomeAdvertisementSectionState();
}

class _HomeAdvertisementSectionState extends State<HomeAdvertisementSection> {
  static const double _bannerAspect = 2.4;
  static const double _peekFraction = 0.92;
  static const Duration _autoPlayInterval = Duration(seconds: 5);

  late final PageController _pageController;
  int _page = 0;
  Timer? _autoPlayTimer;

  @override
  void initState() {
    super.initState();
    _pageController = PageController(viewportFraction: _peekFraction);
    _scheduleAutoPlay();
  }

  @override
  void didUpdateWidget(HomeAdvertisementSection oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.advertisements.length != widget.advertisements.length) {
      _page = 0;
      if (_pageController.hasClients) {
        _pageController.jumpToPage(0);
      }
      _scheduleAutoPlay();
    }
  }

  void _scheduleAutoPlay() {
    _autoPlayTimer?.cancel();
    _autoPlayTimer = null;
    if (widget.advertisements.length <= 1) return;

    _autoPlayTimer = Timer.periodic(_autoPlayInterval, (_) => _advanceCarousel());
  }

  void _advanceCarousel() {
    if (!mounted || !_pageController.hasClients || widget.advertisements.length <= 1) {
      return;
    }
    final count = widget.advertisements.length;
    final next = (_page + 1) % count;
    _pageController.animateToPage(
      next,
      duration: const Duration(milliseconds: 450),
      curve: Curves.easeInOut,
    );
  }

  @override
  void dispose() {
    _autoPlayTimer?.cancel();
    _pageController.dispose();
    super.dispose();
  }

  Future<void> _openAction(String? url) async {
    final raw = url?.trim();
    if (raw == null || raw.isEmpty) return;
    final uri = Uri.tryParse(raw);
    if (uri == null) return;
    final ok = await launchUrl(uri, mode: LaunchMode.externalApplication);
    if (!ok && mounted) {
      final l10n = AppLocalizations.of(context)!;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(l10n.homeCouldNotOpenLink)),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    if (widget.loading && widget.advertisements.isEmpty) {
      return const _AdvertisementSkeleton();
    }
    if (widget.advertisements.isEmpty) return const SizedBox.shrink();

    final cs = context.cs;
    final l10n = AppLocalizations.of(context)!;
    final ads = widget.advertisements;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          l10n.homePromotionsLabel,
          style: Theme.of(context).textTheme.labelSmall?.copyWith(
                color: cs.onSurfaceVariant,
                letterSpacing: 1.0,
              ),
        ),
        const SizedBox(height: 6),
        Text(
          l10n.homeOffersUpdates,
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w700,
              ),
        ),
        const SizedBox(height: 12),
        AspectRatio(
          aspectRatio: _bannerAspect / _peekFraction,
          child: PageView.builder(
            controller: _pageController,
            itemCount: ads.length,
            onPageChanged: (i) {
              setState(() => _page = i);
              _scheduleAutoPlay();
            },
            itemBuilder: (context, index) {
              final ad = ads[index];
              return Padding(
                padding: EdgeInsets.only(right: index < ads.length - 1 ? 10 : 0),
                child: _AdvertisementBannerCard(
                  ad: ad,
                  onTap: ad.hasAction ? () => _openAction(ad.actionUrl) : null,
                ),
              );
            },
          ),
        ),
        if (ads.length > 1) ...[
          const SizedBox(height: 10),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: List.generate(ads.length, (i) {
              final active = i == _page;
              return AnimatedContainer(
                duration: const Duration(milliseconds: 220),
                margin: const EdgeInsets.symmetric(horizontal: 3),
                width: active ? 18 : 6,
                height: 6,
                decoration: BoxDecoration(
                  color: active ? cs.primary : cs.outline.withValues(alpha: 0.45),
                  borderRadius: BorderRadius.circular(99),
                ),
              );
            }),
          ),
        ],
      ],
    );
  }
}

class _AdvertisementBannerCard extends StatelessWidget {
  const _AdvertisementBannerCard({
    required this.ad,
    this.onTap,
  });

  final LabAdvertisement ad;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final cs = context.cs;
    final l10n = AppLocalizations.of(context)!;
    final url = ad.bannerImageUrl;

    return Material(
      color: context.cardFill,
      borderRadius: BorderRadius.circular(16),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Stack(
          fit: StackFit.expand,
          children: [
            if (url != null)
              Image.network(
                url,
                fit: BoxFit.cover,
                loadingBuilder: (context, child, progress) {
                  if (progress == null) return child;
                  return ColoredBox(
                    color: context.appExtras.iconTileBackground,
                    child: Center(
                      child: SizedBox(
                        width: 28,
                        height: 28,
                        child: CircularProgressIndicator(
                          strokeWidth: 2.5,
                          color: cs.primary.withValues(alpha: 0.7),
                        ),
                      ),
                    ),
                  );
                },
                errorBuilder: (_, __, ___) => ColoredBox(
                  color: context.appExtras.iconTileBackground,
                  child: Icon(Icons.image_not_supported_outlined, color: cs.onSurfaceVariant, size: 36),
                ),
              )
            else
              ColoredBox(
                color: context.appExtras.iconTileBackground,
                child: Icon(Icons.campaign_outlined, color: cs.primary.withValues(alpha: 0.5), size: 40),
              ),
            DecoratedBox(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    Colors.transparent,
                    Colors.black.withValues(alpha: 0.08),
                    Colors.black.withValues(alpha: 0.62),
                  ],
                  stops: const [0.35, 0.65, 1.0],
                ),
              ),
            ),
            Positioned(
              left: 14,
              right: 14,
              bottom: 12,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    ad.title,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: Theme.of(context).textTheme.titleSmall?.copyWith(
                          color: Colors.white,
                          fontWeight: FontWeight.w700,
                          shadows: const [Shadow(blurRadius: 8, color: Colors.black45)],
                        ),
                  ),
                  if (ad.description != null && ad.description!.trim().isNotEmpty) ...[
                    const SizedBox(height: 4),
                    Text(
                      ad.description!,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: Colors.white.withValues(alpha: 0.92),
                            height: 1.3,
                            shadows: const [Shadow(blurRadius: 6, color: Colors.black38)],
                          ),
                    ),
                  ],
                  if (onTap != null) ...[
                    const SizedBox(height: 8),
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          l10n.homeLearnMore,
                          style: Theme.of(context).textTheme.labelLarge?.copyWith(
                                color: Colors.white,
                                fontWeight: FontWeight.w600,
                              ),
                        ),
                        const SizedBox(width: 4),
                        const Icon(Icons.arrow_forward_rounded, size: 16, color: Colors.white),
                      ],
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _AdvertisementSkeleton extends StatelessWidget {
  const _AdvertisementSkeleton();

  @override
  Widget build(BuildContext context) {
    final cs = context.cs;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: 88,
          height: 12,
          decoration: BoxDecoration(
            color: cs.surfaceContainerHighest.withValues(alpha: 0.5),
            borderRadius: BorderRadius.circular(4),
          ),
        ),
        const SizedBox(height: 8),
        Container(
          width: 140,
          height: 18,
          decoration: BoxDecoration(
            color: cs.surfaceContainerHighest.withValues(alpha: 0.55),
            borderRadius: BorderRadius.circular(4),
          ),
        ),
        const SizedBox(height: 12),
        AspectRatio(
          aspectRatio: 2.4,
          child: Container(
            decoration: BoxDecoration(
              color: cs.surfaceContainerHighest.withValues(alpha: 0.45),
              borderRadius: BorderRadius.circular(16),
            ),
          ),
        ),
      ],
    );
  }
}
