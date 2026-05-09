import type { LabTestCatalogRow } from './types'

function toNum(v: unknown): number {
  const n = typeof v === 'number' ? v : Number.parseFloat(String(v))
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0
}

function clampPercent(v: unknown): number {
  const n = typeof v === 'number' ? v : Number.parseFloat(String(v))
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(100, Math.round(n * 100) / 100))
}

/** Final MMK after `discount_percent` off base (matches typical API pricing). */
export function discountedPriceMmk(base: number, discountPercent: number): number {
  return Math.round(base * (1 - clampPercent(discountPercent) / 100) * 100) / 100
}

function fromLegacy(o: Record<string, unknown>): LabTestCatalogRow | null {
  if (!('testName' in o) || typeof o.testName !== 'string') return null
  const base = toNum(o.basePriceMmk)
  const discount = 0
  const id =
    o.id != null && String(o.id) !== ''
      ? String(o.id)
      : typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `cat-${Date.now()}`
  return {
    id,
    test_name: o.testName,
    test_code: String(o.testCode ?? ''),
    description: typeof o.description === 'string' ? o.description : '',
    base_price_mmk: base,
    category: typeof o.category === 'string' ? o.category : '',
    is_active: Boolean(o.isActive ?? true),
    is_deleted: false,
    discount_percent: discount,
    discounted_price_mmk: discountedPriceMmk(base, discount),
    created_at: new Date().toISOString(),
  }
}

function fromApiShape(o: Record<string, unknown>): LabTestCatalogRow | null {
  if (!('test_name' in o) || typeof o.test_name !== 'string') return null
  const base = toNum(o.base_price_mmk)
  const discount = clampPercent(o.discount_percent)
  const hasDisc =
    o.discounted_price_mmk !== undefined && o.discounted_price_mmk !== null && o.discounted_price_mmk !== ''
  const after = hasDisc ? toNum(o.discounted_price_mmk) : discountedPriceMmk(base, discount)
  const idRaw = o.id != null && String(o.id) !== '' ? String(o.id) : null
  const id =
    idRaw ??
    (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `cat-${Date.now()}`)
  const created_at = typeof o.created_at === 'string' ? o.created_at : new Date().toISOString()
  const updated_at = typeof o.updated_at === 'string' ? o.updated_at : undefined
  return {
    id,
    test_name: o.test_name,
    test_code: String(o.test_code ?? ''),
    description: typeof o.description === 'string' ? o.description : '',
    base_price_mmk: base,
    category: typeof o.category === 'string' ? o.category : '',
    is_active: Boolean(o.is_active),
    is_deleted: Boolean(o.is_deleted),
    discount_percent: discount,
    discounted_price_mmk: after,
    created_at,
    ...(updated_at !== undefined ? { updated_at } : {}),
  }
}

/** Parses a single catalog row (e.g. GET/POST/PUT response). */
export function normalizeLabTestCatalogRow(parsed: unknown): LabTestCatalogRow | null {
  if (!parsed || typeof parsed !== 'object') return null
  const o = parsed as Record<string, unknown>
  return fromLegacy(o) ?? fromApiShape(o)
}

/** Accepts API JSON rows or legacy camelCase rows from older admin builds. */
export function normalizeLabTestCatalogRows(parsed: unknown): LabTestCatalogRow[] {
  if (!Array.isArray(parsed)) return []
  const out: LabTestCatalogRow[] = []
  for (const item of parsed) {
    if (!item || typeof item !== 'object') continue
    const o = item as Record<string, unknown>
    const row = fromLegacy(o) ?? fromApiShape(o)
    if (row && row.id) out.push(row)
  }
  return out
}
