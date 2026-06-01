import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:geolocator/geolocator.dart';
import 'package:latlong2/latlong.dart';

import '../../config/map_defaults.dart';
import '../../models/address_map_pick_result.dart';
import '../../services/nominatim_geocode.dart';
import '../../theme/app_colors.dart';
import '../../theme/theme_extensions.dart';

/// Full-screen map + address editor (same idea as admin web user create).
class AddressMapPickerScreen extends StatefulWidget {
  const AddressMapPickerScreen({
    super.key,
    this.initialAddress = '',
    this.initialLatitude,
    this.initialLongitude,
  });

  final String initialAddress;
  final double? initialLatitude;
  final double? initialLongitude;

  @override
  State<AddressMapPickerScreen> createState() => _AddressMapPickerScreenState();
}

class _AddressMapPickerScreenState extends State<AddressMapPickerScreen> {
  final _mapController = MapController();
  late final LatLng _initialCenter;
  late LatLng _marker;
  late final TextEditingController _address;
  Timer? _reverseDebounce;
  Timer? _forwardDebounce;
  var _reverseBusy = false;
  var _forwardBusy = false;
  int _reverseSeq = 0;
  int _forwardSeq = 0;
  String? _geoError;

  bool get _lookupBusy => _reverseBusy || _forwardBusy;

  @override
  void initState() {
    super.initState();
    _address = TextEditingController(text: widget.initialAddress);
    final has = hasMeaningfulCoordinates(widget.initialLatitude, widget.initialLongitude);
    _marker = LatLng(
      has ? widget.initialLatitude! : kDefaultMapLat,
      has ? widget.initialLongitude! : kDefaultMapLng,
    );
    _initialCenter = _marker;

    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      if (has) {
        final id = ++_reverseSeq;
        _runReverse(_marker, id);
      } else {
        final addr = widget.initialAddress.trim();
        if (addr.length >= 4) {
          _runForward(addr, fromInitialOpen: true);
        }
      }
    });
  }

  @override
  void dispose() {
    _reverseDebounce?.cancel();
    _forwardDebounce?.cancel();
    _address.dispose();
    _mapController.dispose();
    super.dispose();
  }

  void _scheduleReverse(LatLng p) {
    _reverseDebounce?.cancel();
    _reverseDebounce = Timer(const Duration(milliseconds: 420), () {
      final id = ++_reverseSeq;
      _runReverse(p, id);
    });
  }

  Future<void> _runReverse(LatLng p, int id) async {
    setState(() {
      _reverseBusy = true;
      _geoError = null;
    });
    try {
      final line = await NominatimGeocode.reverse(p.latitude, p.longitude);
      if (!mounted || id != _reverseSeq) return;
      if (line != null && line.isNotEmpty) {
        _address.text = line;
        _address.selection = TextSelection.collapsed(offset: _address.text.length);
      }
    } catch (_) {
      if (!mounted || id != _reverseSeq) return;
      setState(() => _geoError = 'Could not resolve address for this point.');
    } finally {
      if (mounted && id == _reverseSeq) {
        setState(() => _reverseBusy = false);
      }
    }
  }

  void _scheduleForwardFromTypedAddress() {
    _forwardDebounce?.cancel();
    _forwardDebounce = Timer(const Duration(milliseconds: 750), () {
      final q = _address.text.trim();
      if (q.length < 4) return;
      _runForward(q, fromInitialOpen: false);
    });
  }

  Future<void> _runForward(String query, {required bool fromInitialOpen}) async {
    final id = ++_forwardSeq;
    setState(() {
      _forwardBusy = true;
      if (fromInitialOpen) _geoError = null;
    });
    try {
      final hit = await NominatimGeocode.search(query);
      if (!mounted || id != _forwardSeq) return;
      if (hit == null) {
        if (fromInitialOpen) {
          setState(() => _geoError = 'Could not find that address on the map. Try tapping the map or refine the address.');
        }
        return;
      }
      final p = LatLng(hit.lat, hit.lng);
      _reverseSeq++;
      setState(() {
        _marker = p;
        _geoError = null;
        _reverseBusy = false;
      });
      _mapController.move(p, 15);
    } catch (_) {
      if (!mounted || id != _forwardSeq) return;
      if (fromInitialOpen) {
        setState(() => _geoError = 'Could not look up that address. Check your connection and try again.');
      }
    } finally {
      if (mounted && id == _forwardSeq) {
        setState(() => _forwardBusy = false);
      }
    }
  }

  Future<void> _useMyLocation() async {
    _forwardDebounce?.cancel();
    _reverseDebounce?.cancel();
    _forwardSeq++;
    _reverseSeq++;
    setState(() {
      _geoError = null;
      _forwardBusy = false;
      _reverseBusy = false;
    });
    try {
      var perm = await Geolocator.checkPermission();
      if (perm == LocationPermission.denied) {
        perm = await Geolocator.requestPermission();
      }
      if (perm == LocationPermission.denied || perm == LocationPermission.deniedForever) {
        if (mounted) {
          setState(() => _geoError = 'Location permission is required to use this feature.');
        }
        return;
      }
      final pos = await Geolocator.getCurrentPosition();
      final p = LatLng(pos.latitude, pos.longitude);
      if (!mounted) return;
      setState(() => _marker = p);
      _mapController.move(p, 15);
      final id = ++_reverseSeq;
      await _runReverse(p, id);
    } catch (e) {
      if (mounted) {
        setState(() => _geoError = 'Could not read GPS: $e');
      }
    }
  }

  void _confirm() {
    Navigator.of(context).pop(
      AddressMapPickResult(
        addressLine: _address.text.trim(),
        latitude: _marker.latitude,
        longitude: _marker.longitude,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final coordText =
        '${_marker.latitude.toStringAsFixed(5)}, ${_marker.longitude.toStringAsFixed(5)}';

    return Scaffold(
      appBar: AppBar(
        title: const Text('Choose location'),
        foregroundColor: context.cs.primary,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        actions: [
          TextButton(
            onPressed: _confirm,
            child: const Text('Save'),
          ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            flex: 3,
            child: ClipRRect(
              borderRadius: const BorderRadius.vertical(bottom: Radius.circular(12)),
              child: FlutterMap(
                mapController: _mapController,
                options: MapOptions(
                  initialCenter: _initialCenter,
                  initialZoom: hasMeaningfulCoordinates(widget.initialLatitude, widget.initialLongitude)
                      ? 15
                      : 12,
                  onTap: (_, p) {
                    _forwardDebounce?.cancel();
                    _reverseDebounce?.cancel();
                    _forwardSeq++;
                    _reverseSeq++;
                    setState(() {
                      _marker = p;
                      _forwardBusy = false;
                      _reverseBusy = false;
                    });
                    _mapController.move(p, _mapController.camera.zoom);
                    _scheduleReverse(p);
                  },
                ),
                children: [
                  TileLayer(
                    urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                    userAgentPackageName: 'lab_patient_app',
                  ),
                  MarkerLayer(
                    markers: [
                      Marker(
                        point: _marker,
                        width: 40,
                        height: 40,
                        alignment: Alignment.bottomCenter,
                        child: const Icon(Icons.place, color: Color(0xFFC62828), size: 40),
                      ),
                    ],
                  ),
                  const SimpleAttributionWidget(
                    source: Text('OpenStreetMap'),
                    alignment: Alignment.bottomRight,
                  ),
                ],
              ),
            ),
          ),
          Material(
            color: context.cs.surface,
            child: SafeArea(
              top: false,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text(
                      'Tap the map to move the pin, or type an address to move the map. '
                      'The address line updates from the pin when you tap the map.',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: context.cs.onSurfaceVariant,
                            height: 1.35,
                          ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      coordText,
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            fontFeatures: const [FontFeature.tabularFigures()],
                          ),
                    ),
                    const SizedBox(height: 10),
                    TextField(
                      controller: _address,
                      minLines: 2,
                      maxLines: 4,
                      onChanged: (_) => _scheduleForwardFromTypedAddress(),
                      decoration: InputDecoration(
                        labelText: 'Address',
                        hintText: 'Street, city, etc.',
                        filled: true,
                        fillColor: context.appExtras.surfaceContainer,
                        suffixIcon: _lookupBusy
                            ? const Padding(
                                padding: EdgeInsets.all(12),
                                child: SizedBox(
                                  width: 22,
                                  height: 22,
                                  child: CircularProgressIndicator(strokeWidth: 2),
                                ),
                              )
                            : null,
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                    ),
                    if (_geoError != null) ...[
                      const SizedBox(height: 8),
                      Text(
                        _geoError!,
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(color: AppColors.error),
                      ),
                    ],
                    const SizedBox(height: 12),
                    OutlinedButton.icon(
                      onPressed: _lookupBusy ? null : _useMyLocation,
                      icon: const Icon(Icons.my_location_outlined, size: 20),
                      label: const Text('Use my location'),
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton(
                            onPressed: () => Navigator.of(context).pop(),
                            child: const Text('Cancel'),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: FilledButton(
                            onPressed: _confirm,
                            child: const Text('Use this location'),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
