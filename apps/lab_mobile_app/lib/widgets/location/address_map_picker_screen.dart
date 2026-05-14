import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:geolocator/geolocator.dart';
import 'package:latlong2/latlong.dart';

import '../../config/map_defaults.dart';
import '../../models/address_map_pick_result.dart';
import '../../services/nominatim_geocode.dart';
import '../../theme/app_colors.dart';

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
  var _reverseBusy = false;
  String? _geoError;

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
  }

  @override
  void dispose() {
    _reverseDebounce?.cancel();
    _address.dispose();
    _mapController.dispose();
    super.dispose();
  }

  void _scheduleReverse(LatLng p) {
    _reverseDebounce?.cancel();
    _reverseDebounce = Timer(const Duration(milliseconds: 420), () => _reverseAt(p));
  }

  Future<void> _reverseAt(LatLng p) async {
    setState(() {
      _reverseBusy = true;
      _geoError = null;
    });
    try {
      final line = await NominatimGeocode.reverse(p.latitude, p.longitude);
      if (!mounted) return;
      if (line != null && line.isNotEmpty) {
        _address.text = line;
        _address.selection = TextSelection.collapsed(offset: _address.text.length);
      }
    } catch (_) {
      if (mounted) setState(() => _geoError = 'Could not resolve address for this point.');
    } finally {
      if (mounted) setState(() => _reverseBusy = false);
    }
  }

  Future<void> _useMyLocation() async {
    setState(() => _geoError = null);
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
      await _reverseAt(p);
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
        backgroundColor: AppColors.surface,
        foregroundColor: AppColors.primary,
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
                    setState(() => _marker = p);
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
            color: AppColors.surface,
            child: SafeArea(
              top: false,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text(
                      'Tap the map to move the pin. Address is filled automatically when possible.',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: AppColors.onSurfaceVariant,
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
                      decoration: InputDecoration(
                        labelText: 'Address',
                        hintText: 'Street, city, etc.',
                        filled: true,
                        fillColor: Colors.white,
                        suffixIcon: _reverseBusy
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
                      onPressed: _reverseBusy ? null : _useMyLocation,
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
