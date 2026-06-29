import i18n from '../i18n'

export function priorityBadgeClass(priority: 'urgent' | 'elective' | string | undefined): string {
  return priority === 'urgent' ? 'badge badge--danger' : 'badge badge--neutral'
}

/** Human-readable label for `report_delivery_method` (soft_copy, hard_copy, both, …). */
export function formatReportDeliveryMethod(method: string | null | undefined): string {
  const key = (method ?? '').trim().toLowerCase()
  if (!key) return i18n.t('common.none')
  switch (key) {
    case 'soft_copy':
      return i18n.t('orders.softCopy')
    case 'hard_copy':
      return i18n.t('orders.hardCopy')
    case 'both':
      return i18n.t('orders.softAndHardCopy')
    case 'email':
      return i18n.t('orders.email')
    default:
      return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  }
}
