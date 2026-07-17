/** Optional leading `+`, then digits only. */
export function sanitizePhoneInput(value: string): string {
  let out = ''
  for (const ch of value) {
    if (ch >= '0' && ch <= '9') out += ch
    else if (ch === '+' && out.length === 0) out += ch
  }
  return out
}

export function isValidPhoneInput(value: string, minDigits = 6): boolean {
  const trimmed = value.trim()
  if (!/^\+?\d+$/.test(trimmed)) return false
  return trimmed.replace(/^\+/, '').length >= minDigits
}
