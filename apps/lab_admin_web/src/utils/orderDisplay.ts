export function priorityBadgeClass(priority: 'urgent' | 'elective' | string | undefined): string {
  return priority === 'urgent' ? 'badge badge--danger' : 'badge badge--neutral'
}

/** Human-readable label for `report_delivery_method` (soft_copy, hard_copy, both, …). */
export function formatReportDeliveryMethod(method: string | null | undefined): string {
  const key = (method ?? '').trim().toLowerCase()
  if (!key) return '—'
  switch (key) {
    case 'soft_copy':
      return 'Soft copy'
    case 'hard_copy':
      return 'Hard copy'
    case 'both':
      return 'Soft & hard copy'
    case 'email':
      return 'Email'
    default:
      return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  }
}
