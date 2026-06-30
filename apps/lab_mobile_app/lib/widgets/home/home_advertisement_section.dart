import 'dart:async';

import 'package:flutter/material.dart';

import '../../l10n/app_localizations.dart';
import '../../models/lab_advertisement.dart';
import '../../theme/theme_extensions.dart';

/// Promotional article carousel for the home dashboard.
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
  static const double _cardRadius = 20;
  static const double _imageAspectRatio = 4 / 3;
  static const double _contentMinHeight = 96;
  static const double _peekFraction = 0.9;
  static const Duration _autoPlayInterval = Duration(seconds: 5);
  static const Duration _slideDuration = Duration(milliseconds: 480);

  PageController? _pageController;
  int _page = 0;
  Timer? _autoPlayTimer;

  bool get _hasMultiple => widget.advertisements.length > 1;

  double get _viewportFraction => _hasMultiple ? _peekFraction : 1;

  @override
  void initState() {
    super.initState();
    _createPageController();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _scheduleAutoPlay();
    });
  }

  void _createPageController() {
    _pageController?.dispose();
    _pageController = PageController(viewportFraction: _viewportFraction);
    _page = 0;
  }

  @override
  void didUpdateWidget(HomeAdvertisementSection oldWidget) {
    super.didUpdateWidget(oldWidget);
    final oldCount = oldWidget.advertisements.length;
    final newCount = widget.advertisements.length;
    final oldMulti = oldCount > 1;
    final newMulti = newCount > 1;

    if (oldMulti != newMulti || oldCount != newCount) {
      _createPageController();
    }
    if (oldCount != newCount || (oldWidget.advertisements.isEmpty && newCount > 0)) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) _scheduleAutoPlay();
      });
    }
  }

  void _scheduleAutoPlay() {
    _autoPlayTimer?.cancel();
    _autoPlayTimer = null;
    if (!_hasMultiple) return;

    _autoPlayTimer = Timer.periodic(_autoPlayInterval, (_) => _advanceCarousel());
  }

  void _pauseAutoPlay() {
    _autoPlayTimer?.cancel();
    _autoPlayTimer = null;
  }

  void _advanceCarousel() {
    final controller = _pageController;
    if (!mounted || controller == null || !controller.hasClients || !_hasMultiple) {
      return;
    }
    final count = widget.advertisements.length;
    final next = (_page + 1) % count;
    controller.animateToPage(
      next,
      duration: _slideDuration,
      curve: Curves.easeInOutCubic,
    );
  }

  @override
  void dispose() {
    _autoPlayTimer?.cancel();
    _pageController?.dispose();
    super.dispose();
  }

  double _carouselHeightFor(double maxWidth) {
    final cardWidth = maxWidth * _viewportFraction;
    final imageHeight = cardWidth / _imageAspectRatio;
    return imageHeight + _contentMinHeight;
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final cs = context.cs;

    if (widget.loading && widget.advertisements.isEmpty) {
      return LayoutBuilder(
        builder: (context, constraints) {
          return Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              _PromotionsSectionHeader(label: l10n.homePromotionsLabel, cs: cs),
              const SizedBox(height: 10),
              _AdvertisementSkeleton(height: _carouselHeightFor(constraints.maxWidth)),
            ],
          );
        },
      );
    }
    if (widget.advertisements.isEmpty) return const SizedBox.shrink();

    final ads = widget.advertisements;
    final controller = _pageController;
    if (controller == null) return const SizedBox.shrink();

    return LayoutBuilder(
      builder: (context, constraints) {
        final carouselHeight = _carouselHeightFor(constraints.maxWidth);
        final cardWidth = constraints.maxWidth * _viewportFraction;
        final imageHeight = cardWidth / _imageAspectRatio;

        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _PromotionsSectionHeader(label: l10n.homePromotionsLabel, cs: cs),
            const SizedBox(height: 10),
            SizedBox(
              height: carouselHeight,
              child: NotificationListener<ScrollNotification>(
                onNotification: (notification) {
                  if (!_hasMultiple) return false;
                  if (notification is ScrollStartNotification && notification.depth == 0) {
                    _pauseAutoPlay();
                  } else if (notification is ScrollEndNotification && notification.depth == 0) {
                    _scheduleAutoPlay();
                  }
                  return false;
                },
                child: PageView.builder(
                  controller: controller,
                  clipBehavior: Clip.none,
                  padEnds: false,
                  itemCount: ads.length,
                  onPageChanged: (i) {
                    setState(() => _page = i);
                    _scheduleAutoPlay();
                  },
                  itemBuilder: (context, index) {
                    final ad = ads[index];
                    return AnimatedBuilder(
                      animation: controller,
                      builder: (context, child) {
                        final page = controller.hasClients
                            ? (controller.page ?? _page.toDouble())
                            : _page.toDouble();
                        final delta = (page - index).abs();
                        final scale = (1 - delta * 0.04).clamp(0.94, 1.0);
                        final opacity = (1 - delta * 0.22).clamp(0.7, 1.0);
                        return Opacity(
                          opacity: opacity,
                          child: Transform.scale(
                            scale: scale,
                            alignment: Alignment.center,
                            child: child,
                          ),
                        );
                      },
                      child: Padding(
                        padding: EdgeInsets.only(right: _hasMultiple ? 12 : 0),
                        child: _AdvertisementArticleCard(
                          ad: ad,
                          imageHeight: imageHeight,
                        ),
                      ),
                    );
                  },
                ),
              ),
            ),
            if (_hasMultiple) ...[
              const SizedBox(height: 12),
              _CarouselPageIndicator(
                count: ads.length,
                index: _page,
                activeColor: cs.primary,
                inactiveColor: cs.outline.withValues(alpha: 0.45),
              ),
            ],
          ],
        );
      },
    );
  }
}

class _PromotionsSectionHeader extends StatelessWidget {
  const _PromotionsSectionHeader({
    required this.label,
    required this.cs,
  });

  final String label;
  final ColorScheme cs;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          width: 3,
          height: 14,
          decoration: BoxDecoration(
            color: cs.primary,
            borderRadius: BorderRadius.circular(99),
          ),
        ),
        const SizedBox(width: 8),
        Text(
          label,
          style: Theme.of(context).textTheme.labelSmall?.copyWith(
                color: cs.onSurfaceVariant,
                letterSpacing: 1.1,
                fontWeight: FontWeight.w700,
              ),
        ),
      ],
    );
  }
}

class _CarouselPageIndicator extends StatelessWidget {
  const _CarouselPageIndicator({
    required this.count,
    required this.index,
    required this.activeColor,
    required this.inactiveColor,
  });

  final int count;
  final int index;
  final Color activeColor;
  final Color inactiveColor;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: List.generate(count, (i) {
        final active = i == index;
        return AnimatedContainer(
          duration: const Duration(milliseconds: 260),
          curve: Curves.easeOutCubic,
          margin: const EdgeInsets.symmetric(horizontal: 3),
          width: active ? 20 : 6,
          height: 6,
          decoration: BoxDecoration(
            color: active ? activeColor : inactiveColor,
            borderRadius: BorderRadius.circular(99),
          ),
        );
      }),
    );
  }
}

class _AdvertisementArticleCard extends StatelessWidget {
  const _AdvertisementArticleCard({
    required this.ad,
    required this.imageHeight,
  });

  final LabAdvertisement ad;
  final double imageHeight;

  @override
  Widget build(BuildContext context) {
    final cs = context.cs;
    final url = ad.bannerImageUrl;
    final description = ad.description?.trim();
    final hasDescription = description != null && description.isNotEmpty;

    return DecoratedBox(
      decoration: BoxDecoration(
        color: context.cardFill,
        borderRadius: BorderRadius.circular(_HomeAdvertisementSectionState._cardRadius),
        border: Border.all(color: cs.outline.withValues(alpha: 0.22)),
        boxShadow: [
          BoxShadow(
            color: cs.shadow.withValues(alpha: 0.06),
            blurRadius: 24,
            offset: const Offset(0, 8),
          ),
          BoxShadow(
            color: cs.primary.withValues(alpha: 0.04),
            blurRadius: 0,
            offset: const Offset(0, 0),
            spreadRadius: 0.5,
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(_HomeAdvertisementSectionState._cardRadius),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            SizedBox(
              height: imageHeight,
              child: DecoratedBox(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [
                      context.appExtras.iconTileBackground,
                      context.appExtras.iconTileBackground.withValues(alpha: 0.55),
                    ],
                  ),
                ),
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(14, 14, 14, 10),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(14),
                    child: DecoratedBox(
                      decoration: BoxDecoration(
                        color: context.cardFill,
                        boxShadow: [
                          BoxShadow(
                            color: cs.shadow.withValues(alpha: 0.05),
                            blurRadius: 8,
                            offset: const Offset(0, 2),
                          ),
                        ],
                      ),
                      child: _ArticleHeroImage(url: url, cs: cs),
                    ),
                  ),
                ),
              ),
            ),
            Container(
              height: 1,
              color: cs.outline.withValues(alpha: 0.18),
            ),
            IntrinsicHeight(
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Container(width: 4, color: cs.primary),
                  Expanded(
                    child: Padding(
                      padding: EdgeInsets.fromLTRB(16, hasDescription ? 14 : 16, 16, 16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            ad.title,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                  fontWeight: FontWeight.w800,
                                  height: 1.25,
                                  letterSpacing: -0.3,
                                ),
                          ),
                          if (hasDescription) ...[
                            const SizedBox(height: 6),
                            Text(
                              description,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                    color: cs.onSurfaceVariant,
                                    height: 1.45,
                                  ),
                            ),
                          ],
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ArticleHeroImage extends StatelessWidget {
  const _ArticleHeroImage({
    required this.url,
    required this.cs,
  });

  final String? url;
  final ColorScheme cs;

  @override
  Widget build(BuildContext context) {
    if (url != null && url!.trim().isNotEmpty) {
      return Image.network(
        url!,
        fit: BoxFit.contain,
        width: double.infinity,
        height: double.infinity,
        alignment: Alignment.center,
        filterQuality: FilterQuality.medium,
        loadingBuilder: (context, child, progress) {
          if (progress == null) return child;
          return ColoredBox(
            color: context.cardFill,
            child: Center(
              child: SizedBox(
                width: 26,
                height: 26,
                child: CircularProgressIndicator(
                  strokeWidth: 2.5,
                  color: cs.primary.withValues(alpha: 0.65),
                ),
              ),
            ),
          );
        },
        errorBuilder: (_, __, ___) => ColoredBox(
          color: context.cardFill,
          child: Icon(Icons.image_not_supported_outlined, color: cs.onSurfaceVariant, size: 32),
        ),
      );
    }

    return ColoredBox(
      color: context.cardFill,
      child: Icon(Icons.campaign_outlined, color: cs.primary.withValues(alpha: 0.4), size: 40),
    );
  }
}

class _AdvertisementSkeleton extends StatelessWidget {
  const _AdvertisementSkeleton({required this.height});

  final double height;

  @override
  Widget build(BuildContext context) {
    final cs = context.cs;
    final imageHeight = height - _HomeAdvertisementSectionState._contentMinHeight;

    return Container(
      height: height,
      decoration: BoxDecoration(
        color: context.cardFill,
        borderRadius: BorderRadius.circular(_HomeAdvertisementSectionState._cardRadius),
        border: Border.all(color: cs.outline.withValues(alpha: 0.2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Container(
            height: imageHeight,
            padding: const EdgeInsets.fromLTRB(14, 14, 14, 10),
            decoration: BoxDecoration(
              color: cs.surfaceContainerHighest.withValues(alpha: 0.35),
              borderRadius: const BorderRadius.vertical(
                top: Radius.circular(_HomeAdvertisementSectionState._cardRadius),
              ),
            ),
            child: Container(
              decoration: BoxDecoration(
                color: cs.surfaceContainerHighest.withValues(alpha: 0.5),
                borderRadius: BorderRadius.circular(14),
              ),
            ),
          ),
          Container(height: 1, color: cs.outline.withValues(alpha: 0.15)),
          Expanded(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Container(width: 4, color: cs.primary.withValues(alpha: 0.35)),
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(16, 14, 16, 16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Container(
                          height: 17,
                          width: 150,
                          decoration: BoxDecoration(
                            color: cs.surfaceContainerHighest.withValues(alpha: 0.55),
                            borderRadius: BorderRadius.circular(6),
                          ),
                        ),
                        const SizedBox(height: 10),
                        Container(
                          height: 12,
                          width: double.infinity,
                          decoration: BoxDecoration(
                            color: cs.surfaceContainerHighest.withValues(alpha: 0.4),
                            borderRadius: BorderRadius.circular(6),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
