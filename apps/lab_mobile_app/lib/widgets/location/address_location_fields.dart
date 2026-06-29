import 'dart:async';

import 'package:flutter/material.dart';

import '../../l10n/app_localizations.dart';
import '../../config/map_defaults.dart';
import '../../models/address_map_pick_result.dart';
import '../../services/nominatim_geocode.dart';
import '../../theme/theme_extensions.dart';
import 'address_map_picker_screen.dart';

/// Inline address + coordinates with debounced geocode and optional map picker.
class AddressLocationFields extends StatefulWidget {
  const AddressLocationFields({
    super.key,
    required this.addressLine,
    required this.latitude,
    required this.longitude,
    required this.onChanged,
    this.enabled = true,
    this.addressLabel,
    this.addressHint,
    this.mapButtonLabel,
  });

  final String addressLine;
  final double latitude;
  final double longitude;
  final void Function(String addressLine, double latitude, double longitude) onChanged;
  final bool enabled;
  final String? addressLabel;
  final String? addressHint;
  final String? mapButtonLabel;

  @override
  State<AddressLocationFields> createState() => _AddressLocationFieldsState();
}

enum _GeoHintKind { lookingUp, noMatch, lookupFailed }

class _AddressLocationFieldsState extends State<AddressLocationFields> {
  late final TextEditingController _address;
  Timer? _forwardDebounce;
  var _forwardBusy = false;
  _GeoHintKind? _geoHint;
  int _forwardSeq = 0;

  @override
  void initState() {
    super.initState();
    _address = TextEditingController(text: widget.addressLine);
  }

  @override
  void didUpdateWidget(AddressLocationFields oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.addressLine != _address.text) {
      _address.text = widget.addressLine;
    }
  }

  @override
  void dispose() {
    _forwardDebounce?.cancel();
    _address.dispose();
    super.dispose();
  }

  void _emit(String line, double lat, double lng) {
    widget.onChanged(line, lat, lng);
  }

  void _scheduleForward() {
    _forwardDebounce?.cancel();
    _forwardDebounce = Timer(const Duration(milliseconds: 750), () {
      final q = _address.text.trim();
      if (q.length < 4) {
        if (mounted) setState(() => _geoHint = null);
        return;
      }
      _runForward(q);
    });
  }

  Future<void> _runForward(String query) async {
    final id = ++_forwardSeq;
    if (mounted) {
      setState(() {
        _forwardBusy = true;
        _geoHint = _GeoHintKind.lookingUp;
      });
    }
    try {
      final hit = await NominatimGeocode.search(query);
      if (!mounted || id != _forwardSeq) return;
      if (hit == null) {
        setState(() {
          _forwardBusy = false;
          _geoHint = _GeoHintKind.noMatch;
        });
        return;
      }
      final line = hit.displayName ?? query;
      _address.text = line;
      _emit(line, hit.lat, hit.lng);
      setState(() {
        _forwardBusy = false;
        _geoHint = null;
      });
    } catch (_) {
      if (!mounted || id != _forwardSeq) return;
      setState(() {
        _forwardBusy = false;
        _geoHint = _GeoHintKind.lookupFailed;
      });
    }
  }

  Future<void> _openMap() async {
    final r = await Navigator.of(context).push<AddressMapPickResult?>(
      MaterialPageRoute(
        fullscreenDialog: true,
        builder: (_) => AddressMapPickerScreen(
          initialAddress: _address.text,
          initialLatitude: hasMeaningfulCoordinates(widget.latitude, widget.longitude)
              ? widget.latitude
              : null,
          initialLongitude: hasMeaningfulCoordinates(widget.latitude, widget.longitude)
              ? widget.longitude
              : null,
        ),
      ),
    );
    if (!mounted || r == null) return;
    _forwardSeq++;
    _forwardDebounce?.cancel();
    _address.text = r.addressLine;
    setState(() => _geoHint = null);
    _emit(r.addressLine, r.latitude, r.longitude);
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final coords = hasMeaningfulCoordinates(widget.latitude, widget.longitude)
        ? '${widget.latitude.toStringAsFixed(5)}, ${widget.longitude.toStringAsFixed(5)}'
        : '—';
    final geoHintText = switch (_geoHint) {
      _GeoHintKind.lookingUp => l10n.profileLookingUpAddress,
      _GeoHintKind.noMatch => l10n.profileNoAddressMatch,
      _GeoHintKind.lookupFailed => l10n.profileAddressLookupFailed,
      null => null,
    };

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        TextFormField(
          controller: _address,
          enabled: widget.enabled,
          minLines: 2,
          maxLines: 4,
          onChanged: (_) {
            _emit(_address.text, widget.latitude, widget.longitude);
            _scheduleForward();
          },
          decoration: InputDecoration(
            labelText: widget.addressLabel ?? l10n.profileAddress,
            hintText: widget.addressHint ?? l10n.profileAddressHint,
            suffixIcon: _forwardBusy
                ? const Padding(
                    padding: EdgeInsets.all(12),
                    child: SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    ),
                  )
                : null,
          ),
        ),
        if (geoHintText != null) ...[
          const SizedBox(height: 6),
          Text(
            geoHintText,
            style: Theme.of(context).textTheme.bodySmall?.copyWith(color: context.cs.onSurfaceVariant),
          ),
        ],
        const SizedBox(height: 8),
        Align(
          alignment: Alignment.centerLeft,
          child: OutlinedButton.icon(
            onPressed: widget.enabled ? _openMap : null,
            icon: const Icon(Icons.map_outlined, size: 20),
            label: Text(widget.mapButtonLabel ?? l10n.profileChooseOnMap),
          ),
        ),
        const SizedBox(height: 10),
        Text(
          l10n.profileLatLong,
          style: Theme.of(context).textTheme.titleSmall?.copyWith(
                color: context.cs.onSurface,
                fontWeight: FontWeight.w600,
              ),
        ),
        const SizedBox(height: 4),
        Text(
          coords,
          style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: context.cs.onSurfaceVariant,
                fontFeatures: const [FontFeature.tabularFigures()],
              ),
        ),
      ],
    );
  }
}
