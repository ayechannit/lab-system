bool allowsDigitalResultDelivery(String? method) {
  final key = (method ?? '').trim().toLowerCase();
  return key == 'soft_copy' || key == 'both';
}

bool requiresHardCopyDelivery(String? method) {
  final key = (method ?? '').trim().toLowerCase();
  return key == 'hard_copy' || key == 'both';
}

bool isHardCopyOnlyDelivery(String? method) {
  return requiresHardCopyDelivery(method) && !allowsDigitalResultDelivery(method);
}
