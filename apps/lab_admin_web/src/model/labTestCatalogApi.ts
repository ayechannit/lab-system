/** Price after a percentage discount (MMK), rounded to cents. */
export function discountedPriceMmk(basePriceMmk: number, discountPercent: number): number {
  const base = Number(basePriceMmk)
  const p = Number(discountPercent)
  if (!Number.isFinite(base) || base < 0) return 0
  if (!Number.isFinite(p)) return Math.round(base * 100) / 100
  const clamped = Math.max(0, Math.min(100, p))
  return Math.round(base * (1 - clamped / 100) * 100) / 100
}
