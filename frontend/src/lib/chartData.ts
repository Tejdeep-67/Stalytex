import { Row } from '../types'
import { toNumber } from './numbers'

import type { ChartType } from '../types'

export type { ChartType }
export type Aggregate = 'sum' | 'avg' | 'count'

export type ChartPoint = { name: string; value: number }
export type ScatterPoint = { x: number; y: number }

export type ChartResult = {
  points: ChartPoint[]
  scatter: ScatterPoint[]
  note: string
}

const MAX_BARS = 30
const MAX_LINE_POINTS = 500
const MAX_SCATTER = 2000

const isoDate = /^\d{4}-\d{2}-\d{2}/

function sortKeys(keys: string[]): string[] {
  if (keys.every((k) => toNumber(k) !== null)) {
    return [...keys].sort((a, b) => (toNumber(a) as number) - (toNumber(b) as number))
  }
  if (keys.every((k) => isoDate.test(k) || !Number.isNaN(Date.parse(k)))) {
    return [...keys].sort((a, b) => Date.parse(a) - Date.parse(b))
  }
  return keys
}

// keep every k-th point so a 200k row line chart doesn't freeze the page
function thin<T>(items: T[], max: number): T[] {
  if (items.length <= max) return items
  const step = items.length / max
  return Array.from({ length: max }, (_, i) => items[Math.floor(i * step)])
}

export function niceLabel(value: number) {
  const abs = Math.abs(value)
  if (abs >= 1e6) return `${(value / 1e6).toFixed(1)}M`
  if (abs >= 1e4) return `${(value / 1e3).toFixed(1)}k`
  return Number(value.toFixed(abs < 10 ? 2 : 1)).toLocaleString()
}

export function histogram(values: number[]): ChartPoint[] {
  if (!values.length) return []
  let min = Infinity
  let max = -Infinity
  for (const v of values) {
    if (v < min) min = v
    if (v > max) max = v
  }
  if (min === max) return [{ name: niceLabel(min), value: values.length }]
  // Sturges' rule for the bin count, kept between 5 and 30
  const binCount = Math.min(30, Math.max(5, Math.ceil(Math.log2(values.length) + 1)))
  const width = (max - min) / binCount
  const bins = new Array(binCount).fill(0)
  for (const v of values) {
    bins[Math.min(binCount - 1, Math.floor((v - min) / width))] += 1
  }
  return bins.map((count, i) => ({
    name: `${niceLabel(min + width * i)}–${niceLabel(min + width * (i + 1))}`,
    value: count,
  }))
}

export function buildChart(rows: Row[], type: ChartType, x: string, y: string, agg: Aggregate): ChartResult {
  const empty: ChartResult = { points: [], scatter: [], note: '' }
  if (!x) return empty

  if (type === 'histogram') {
    const values: number[] = []
    for (const row of rows) {
      const n = toNumber(row[x])
      if (n !== null) values.push(n)
    }
    if (!values.length) return { ...empty, note: `"${x}" has no numbers to bin.` }
    return { ...empty, points: histogram(values), note: `${values.length.toLocaleString()} values in ${histogram(values).length} bins` }
  }

  if (type === 'scatter') {
    if (!y) return { ...empty, note: 'Pick a numeric Y column for the scatter plot.' }
    const pts: ScatterPoint[] = []
    for (const row of rows) {
      const a = toNumber(row[x])
      const b = toNumber(row[y])
      if (a !== null && b !== null) pts.push({ x: a, y: b })
    }
    if (!pts.length) return { ...empty, note: 'Scatter needs two numeric columns.' }
    const shown = thin(pts, MAX_SCATTER)
    return { ...empty, scatter: shown, note: shown.length < pts.length ? `Showing ${shown.length.toLocaleString()} of ${pts.length.toLocaleString()} points` : '' }
  }

  const useCount = agg === 'count' || !y
  const sums = new Map<string, number>()
  const counts = new Map<string, number>()
  let skipped = 0
  for (const row of rows) {
    const key = (row[x] ?? '').trim()
    if (!key) continue
    let value = 1
    if (!useCount) {
      const n = toNumber(row[y])
      if (n === null) {
        skipped += 1
        continue
      }
      value = n
    }
    sums.set(key, (sums.get(key) ?? 0) + value)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }

  let points: ChartPoint[] = sortKeys(Array.from(sums.keys())).map((name) => ({
    name,
    value: agg === 'avg' && !useCount ? (sums.get(name) as number) / (counts.get(name) as number) : (sums.get(name) as number),
  }))

  const notes: string[] = []
  if (skipped) notes.push(`${skipped.toLocaleString()} rows without a number in "${y}" were skipped`)

  if (type === 'pie') {
    points.sort((a, b) => b.value - a.value)
    if (points.length > 8) {
      const other = points.slice(7).reduce((sum, p) => sum + p.value, 0)
      points = [...points.slice(0, 7), { name: 'Other', value: other }]
    }
  } else if (type === 'bar' && points.length > MAX_BARS) {
    const total = points.length
    points = [...points].sort((a, b) => b.value - a.value).slice(0, MAX_BARS)
    notes.push(`top ${MAX_BARS} of ${total.toLocaleString()} categories`)
  } else if (points.length > MAX_LINE_POINTS) {
    const total = points.length
    points = thin(points, MAX_LINE_POINTS)
    notes.push(`sampled ${MAX_LINE_POINTS} of ${total.toLocaleString()} points`)
  }

  return { ...empty, points, note: notes.join(', ') }
}

// spreads colours around the colour wheel starting from the chosen accent
export function palette(hex: string, count: number): string[] {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex)
  const int = m ? parseInt(m[1], 16) : 0xff7a00
  const r = ((int >> 16) & 255) / 255
  const g = ((int >> 8) & 255) / 255
  const b = (int & 255) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  if (max !== min) {
    const d = max - min
    h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4
    h *= 60
  }
  return Array.from({ length: count }, (_, i) => `hsl(${Math.round((h + (i * 360) / Math.max(count, 1)) % 360)}, 72%, ${i % 2 ? 62 : 52}%)`)
}
