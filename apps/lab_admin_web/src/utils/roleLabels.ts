import i18n from '../i18n'
import type { SessionRole, StaffRole } from '../model/types'

export function roleLabel(role: SessionRole | StaffRole | string | null | undefined): string {
  if (!role) return i18n.t('common.signedIn')
  const normalized = String(role).toLowerCase()
  const key = `roles.${normalized}`
  const translated = i18n.t(key)
  return translated === key ? String(role) : translated
}
