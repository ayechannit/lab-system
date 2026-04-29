/**
 * Demo-only “AI” helpers — replace with real model / API calls later.
 */

export function suggestCollectionRoute(addresses: string[]): {
  orderedStops: string[]
  summary: string
  estimatedMinutes: number
} {
  const unique = [...new Set(addresses.map((a) => a.trim()).filter(Boolean))]
  const orderedStops = [...unique].sort((a, b) => a.localeCompare(b))
  return {
    orderedStops,
    summary:
      'Suggested route (demo): visits ordered north→south by street name to reduce backtracking. ' +
      'Hook GPS + traffic API here for production.',
    estimatedMinutes: 22 + orderedStops.length * 14,
  }
}

export function reviewLabResultsNumeric(input: {
  hemoglobin: number
  wbc: number
  platelet: number
}): { passed: boolean; notes: string[] } {
  const notes: string[] = []
  const hbOk = input.hemoglobin >= 11 && input.hemoglobin <= 17.5
  const wbcOk = input.wbc >= 4000 && input.wbc <= 11000
  const pltOk = input.platelet >= 150000 && input.platelet <= 450000

  if (!hbOk) {
    notes.push('Hemoglobin is outside the demo “auto-release” band — pathologist review recommended.')
  }
  if (!wbcOk) {
    notes.push('WBC is outside typical reporting band — verify dilution / QC.')
  }
  if (!pltOk) {
    notes.push('Platelet count outside demo QC window — check sample integrity.')
  }
  if (notes.length === 0) {
    notes.push('Demo AI: analytes within configured auto-release thresholds.')
  }
  const passed = hbOk && wbcOk && pltOk
  return { passed, notes }
}
