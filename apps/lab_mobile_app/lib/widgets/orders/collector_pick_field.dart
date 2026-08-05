import 'package:flutter/material.dart';

import '../../l10n/app_localizations.dart';
import '../../models/lab_order.dart';
import '../../theme/theme_extensions.dart';
import '../common/app_field_decoration.dart';

class CollectorPickField extends StatelessWidget {
  const CollectorPickField({
    super.key,
    required this.collectors,
    required this.selectedId,
    required this.onChanged,
    this.enabled = true,
  });

  final List<LabCollectorPick> collectors;
  final String? selectedId;
  final ValueChanged<String?> onChanged;
  final bool enabled;

  LabCollectorPick? get _selected {
    if (selectedId == null || selectedId!.isEmpty) return null;
    final key = selectedId!.toLowerCase();
    for (final c in collectors) {
      if (c.id.toLowerCase() == key) return c;
    }
    return null;
  }

  Future<void> _openSheet(BuildContext context) async {
    if (!enabled) return;
    final l10n = AppLocalizations.of(context)!;
    final picked = await showModalBottomSheet<String?>(
      context: context,
      showDragHandle: true,
      isScrollControlled: true,
      builder: (ctx) {
        final cs = ctx.cs;
        return SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 4, 20, 8),
                child: Text(
                  l10n.orderCreatePreferredCollector,
                  style: Theme.of(ctx).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
                ),
              ),
              ListTile(
                leading: Icon(Icons.person_off_outlined, color: cs.onSurfaceVariant),
                title: Text(l10n.orderCreateNoPreference),
                subtitle: Text(l10n.orderCreateLabWillAssign),
                trailing: selectedId == null || selectedId!.isEmpty
                    ? Icon(Icons.check_circle, color: cs.primary)
                    : null,
                onTap: () => Navigator.pop(ctx, ''),
              ),
              const Divider(height: 1),
              Flexible(
                child: ListView.builder(
                  shrinkWrap: true,
                  itemCount: collectors.length,
                  itemBuilder: (_, index) {
                    final collector = collectors[index];
                    final active = selectedId?.toLowerCase() == collector.id.toLowerCase();
                    return ListTile(
                      leading: _CollectorAvatar(
                        name: collector.name,
                        imageUrl: collector.profileImageUrl,
                      ),
                      title: Text(collector.name),
                      trailing: active ? Icon(Icons.check_circle, color: cs.primary) : null,
                      onTap: () => Navigator.pop(ctx, collector.id),
                    );
                  },
                ),
              ),
            ],
          ),
        );
      },
    );
    if (picked == null) return;
    onChanged(picked.isEmpty ? null : picked);
  }

  @override
  Widget build(BuildContext context) {
    final cs = context.cs;
    final l10n = AppLocalizations.of(context)!;
    final selected = _selected;
    final label = selected?.name ?? l10n.orderCreateNoPreferenceLabel;

    return Material(
      color: context.appExtras.surfaceContainer,
      borderRadius: AppFieldDecoration.borderRadius,
      child: InkWell(
        onTap: enabled ? () => _openSheet(context) : null,
        borderRadius: AppFieldDecoration.borderRadius,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          child: Row(
            children: [
              _CollectorAvatar(
                name: selected?.name,
                imageUrl: selected?.profileImageUrl,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      label,
                      style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                            fontWeight: FontWeight.w400,
                            color: enabled ? cs.onSurface : cs.onSurfaceVariant,
                          ),
                    ),
                    Text(
                      l10n.orderCreateCollectorOptionalHint,
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: cs.onSurfaceVariant,
                          ),
                    ),
                  ],
                ),
              ),
              Icon(
                Icons.keyboard_arrow_down_rounded,
                color: cs.onSurfaceVariant.withValues(alpha: enabled ? 1 : 0.5),
                size: 22,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _CollectorAvatar extends StatelessWidget {
  const _CollectorAvatar({
    required this.name,
    required this.imageUrl,
  });

  final String? name;
  final String? imageUrl;

  @override
  Widget build(BuildContext context) {
    final cs = context.cs;
    final initial = (name?.trim().isNotEmpty ?? false) ? name!.trim()[0].toUpperCase() : '?';
    final url = imageUrl?.trim();
    return Container(
      width: 40,
      height: 40,
      decoration: BoxDecoration(
        color: cs.primary.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(10),
      ),
      clipBehavior: Clip.antiAlias,
      child: url != null && url.isNotEmpty
          ? Image.network(
              url,
              fit: BoxFit.cover,
              errorBuilder: (_, __, ___) => Center(
                child: Text(
                  initial,
                  style: TextStyle(color: cs.primary, fontWeight: FontWeight.w700),
                ),
              ),
            )
          : Center(
              child: name?.trim().isNotEmpty ?? false
                  ? Text(
                      initial,
                      style: TextStyle(color: cs.primary, fontWeight: FontWeight.w700),
                    )
                  : Icon(Icons.local_shipping_outlined, color: cs.primary, size: 22),
            ),
    );
  }
}
