import { describe, expect, it } from 'vitest'
import { buildChart, histogram, palette } from './chartData'

const rows = [
  { city: 'Guntur', sales: '10', date: '2025-01-03' },
  { city: 'Vijayawada', sales: '5', date: '2025-01-01' },
  { city: 'Guntur', sales: '', date: '2025-01-02' },
  { city: 'Guntur', sales: '20', date: '2025-01-02' },
]

describe('buildChart', () => {
  it('sums by category and skips rows without a number (used to count them as 1)', () => {
    const r = buildChart(rows, 'bar', 'city', 'sales', 'sum')
    expect(r.points).toEqual([{ name: 'Guntur', value: 30 }, { name: 'Vijayawada', value: 5 }])
    expect(r.note).toContain('1 rows')
  })

  it('averages and counts', () => {
    expect(buildChart(rows, 'bar', 'city', 'sales', 'avg').points[0].value).toBe(15)
    expect(buildChart(rows, 'bar', 'city', '', 'sum').points[0].value).toBe(3)
  })

  it('sorts dates on line charts', () => {
    const r = buildChart(rows, 'line', 'date', 'sales', 'sum')
    expect(r.points.map((p) => p.name)).toEqual(['2025-01-01', '2025-01-02', '2025-01-03'])
  })

  it('makes real x/y points for scatter', () => {
    const r = buildChart(rows, 'scatter', 'sales', 'sales', 'sum')
    expect(r.scatter).toEqual([{ x: 10, y: 10 }, { x: 5, y: 5 }, { x: 20, y: 20 }])
  })
})

describe('histogram', () => {
  it('puts every value in a bin, including the max', () => {
    const values = Array.from({ length: 1000 }, (_, i) => i)
    const bins = histogram(values)
    expect(bins.reduce((s, b) => s + b.value, 0)).toBe(1000)
    expect(bins.length).toBe(11)
  })

  it('handles a single repeated value', () => {
    expect(histogram([4, 4, 4])).toEqual([{ name: '4', value: 3 }])
  })
})

describe('palette', () => {
  it('returns one colour per slice', () => {
    expect(new Set(palette('#ff7a00', 8)).size).toBe(8)
  })
})
