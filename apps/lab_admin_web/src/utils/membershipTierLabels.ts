import i18n from '../i18n'

/** Maps known seed tier names to the active locale; unknown custom names pass through. */
export function membershipTierLabel(name: string | null | undefined): string {
  const raw = (name ?? '').trim()
  if (!raw) return i18n.t('membershipTiers.names.normal')

  const key = raw.toLowerCase()
  const known: Record<string, string> = {
    normal: 'membershipTiers.names.normal',
    standard: 'membershipTiers.names.normal',
    silver: 'membershipTiers.names.silver',
    gold: 'membershipTiers.names.gold',
    bronze: 'membershipTiers.names.bronze',
    ပုံမှန်: 'membershipTiers.names.normal',
    ငွေ: 'membershipTiers.names.silver',
    ရွှေ: 'membershipTiers.names.gold',
    ကြေး: 'membershipTiers.names.bronze',
  }

  const path = known[key]
  return path ? i18n.t(path) : raw
}
