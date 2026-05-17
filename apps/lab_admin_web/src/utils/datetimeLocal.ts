function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

export function formatDatetimeLocalParts(y: number, m: number, d: number, h: number, min: number): string {
  return `${pad2(y)}-${pad2(m)}-${pad2(d)}T${pad2(h)}:${pad2(min)}`
}

export function parseDatetimeLocalParts(v: string): { y: number; m: number; d: number; h: number; min: number } | null {
  const t = v.trim()
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(t)
  if (!match) return null
  const y = Number(match[1])
  const m = Number(match[2])
  const d = Number(match[3])
  const h = Number(match[4])
  const min = Number(match[5])
  if (!Number.isFinite(y) || m < 1 || m > 12 || d < 1 || d > 31 || h < 0 || h > 23 || min < 0 || min > 59) return null
  const dt = new Date(y, m - 1, d, h, min)
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return null
  return { y, m, d, h, min }
}

export function toDatetimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return ''
  const date = new Date(iso)
  if (!Number.isFinite(date.getTime())) return ''
  return formatDatetimeLocalParts(
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate(),
    date.getHours(),
    date.getMinutes(),
  )
}

export function datetimeLocalToIso(local: string): string | null {
  if (!local.trim()) return null
  const d = new Date(local)
  if (!Number.isFinite(d.getTime())) return null
  return d.toISOString()
}
