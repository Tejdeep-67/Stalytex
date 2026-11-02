import { isBlank, toNumber } from './numbers'

export type NumericSummary = {
  count: number
  sum: number
  mean: number
  std: number // sample std (n - 1), same as pandas .std()
  min: number
  q1: number
  median: number
  q3: number
  max: number
}

export type ColumnStats = {
  total: number
  filled: number
  missing: number
  unique: number
  kind: 'numeric' | 'text' | 'empty'
  ignored: number // non-numeric cells skipped in a mostly numeric column
  numeric: NumericSummary | null
  top: Array<{ value: string; count: number }>
}

// Quantile with linear interpolation between the closest ranks.
// This is the default method in numpy/pandas, so the numbers match df.describe().
export function quantile(sorted: ArrayLike<number>, q: number): number {
  const n = sorted.length
  if (!n) return NaN
  const pos = (n - 1) * q
  const lower = Math.floor(pos)
  const upper = Math.ceil(pos)
  if (lower === upper) return sorted[lower]
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (pos - lower)
}

export function summarizeNumbers(values: number[]): NumericSummary | null {
  const n = values.length
  if (!n) return null
  const sorted = Float64Array.from(values).sort()
  let sum = 0
  for (const v of values) sum += v
  const mean = sum / n
  let squares = 0
  for (const v of values) squares += (v - mean) ** 2
  return {
    count: n,
    sum,
    mean,
    std: n > 1 ? Math.sqrt(squares / (n - 1)) : NaN,
    min: sorted[0],
    q1: quantile(sorted, 0.25),
    median: quantile(sorted, 0.5),
    q3: quantile(sorted, 0.75),
    max: sorted[n - 1],
  }
}

export function columnStats(cells: string[]): ColumnStats {
  const counts = new Map<string, number>()
  const numbers: number[] = []
  let filled = 0

  for (const raw of cells) {
    if (isBlank(raw)) continue
    const value = raw.trim()
    filled += 1
    counts.set(value, (counts.get(value) ?? 0) + 1)
    const n = toNumber(value)
    if (n !== null) numbers.push(n)
  }

  // treat the column as numeric if (almost) every filled cell is a number,
  // so one "N/A" typed in a price column doesn't hide the stats
  const numericShare = filled ? numbers.length / filled : 0
  const kind = !filled ? 'empty' : numericShare >= 0.9 ? 'numeric' : 'text'

  const top = Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 5)
    .map(([value, count]) => ({ value, count }))

  return {
    total: cells.length,
    filled,
    missing: cells.length - filled,
    unique: counts.size,
    kind,
    ignored: kind === 'numeric' ? filled - numbers.length : 0,
    numeric: kind === 'numeric' ? summarizeNumbers(numbers) : null,
    top,
  }
}
