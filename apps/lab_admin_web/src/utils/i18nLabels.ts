import i18n from '../i18n'

/** Builds placeholders like "Search name…" using the active locale. */
export function listFilterSearchPlaceholder(label: string, detail?: string): string {
  const subject = (detail ?? label).trim()
  if (!subject) return i18n.t('filters.search')
  const normalized = /^[A-Za-z]/.test(subject)
    ? subject.charAt(0).toLowerCase() + subject.slice(1)
    : subject
  return i18n.t('filters.searchSubject', { subject: normalized })
}
