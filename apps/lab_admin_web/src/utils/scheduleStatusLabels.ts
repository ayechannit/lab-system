import i18n from '../i18n'

export type ScheduleStatusKey = 'live' | 'scheduled' | 'expired' | 'offSchedule' | 'inactive'

export function scheduleStatusLabel(key: ScheduleStatusKey): string {
  const translationKey = key === 'inactive' ? 'common.inactive' : `common.scheduleStatus.${key}`
  const translated = i18n.t(translationKey)
  return translated === translationKey ? key : translated
}
