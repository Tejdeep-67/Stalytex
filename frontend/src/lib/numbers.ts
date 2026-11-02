// Shared helper for reading numbers out of the string cells.
// Accepts "12", "-3.5", "1e3", " 42 " and "1,234.50" style thousands separators.
// Returns null for blanks and anything that isn't clearly a number ("N/A", "12abc", "0x1A").
const plainNumber = /^[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?$/
const withCommas = /^[-+]?\d{1,3}(,\d{3})+(\.\d+)?$/

export function toNumber(raw: unknown): number | null {
  if (raw == null) return null
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null
  let text = String(raw).trim()
  if (!text) return null
  if (withCommas.test(text)) text = text.replace(/,/g, '')
  if (!plainNumber.test(text)) return null
  const value = Number(text)
  return Number.isFinite(value) ? value : null
}

export function isBlank(raw: unknown) {
  return raw == null || String(raw).trim() === ''
}

// A column counts as numeric when every non-empty cell parses as a number.
export function isNumericColumn(values: unknown[]) {
  let seen = 0
  for (const value of values) {
    if (isBlank(value)) continue
    if (toNumber(value) === null) return false
    seen += 1
  }
  return seen > 0
}
