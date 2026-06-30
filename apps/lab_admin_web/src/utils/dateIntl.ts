/** Short weekday labels (Su–Sa) for calendar grids starting on Sunday. */
export function weekdayShortLabels(locale: string): string[] {
  const fmt = new Intl.DateTimeFormat(locale, { weekday: 'short' })
  const sunday = new Date(2024, 0, 7)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sunday)
    d.setDate(sunday.getDate() + i)
    return fmt.format(d)
  })
}

export function formatDatetimeDisplay(
  y: number,
  m: number,
  d: number,
  h: number,
  min: number,
  locale: string,
): string {
  const date = new Date(y, m - 1, d, h, min)
  try {
    return new Intl.DateTimeFormat(locale, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date)
  } catch {
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')} ${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`
  }
}

export function formatTimeDisplay(h: number, min: number, locale: string): string {
  const date = new Date(2000, 0, 1, h, min)
  try {
    return new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' }).format(date)
  } catch {
    return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`
  }
}

/** Format an ISO timestamp for display in the admin UI. */
export function formatIsoDatetime(iso: string, locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

/** Compact date/time for dense table cells. */
export function formatIsoDatetimeShort(iso: string, locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale, {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}
