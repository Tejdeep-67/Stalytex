import { describe, expect, it } from 'vitest'
import { columnStats, quantile, summarizeNumbers } from './stats'

// expected numbers come from pandas: pd.Series([...]).describe()
describe('summarizeNumbers', () => {
  it('matches pandas describe() for an even count', () => {
    const s = summarizeNumbers([4, 1, 7, 2, 10, 3.5])!
    expect(s.count).toBe(6)
    expect(s.mean).toBeCloseTo(4.583333333, 8)
    expect(s.std).toBeCloseTo(3.352859476, 8)
    expect(s.q1).toBeCloseTo(2.375, 10)
    expect(s.median).toBeCloseTo(3.75, 10)
    expect(s.q3).toBeCloseTo(6.25, 10)
    expect([s.min, s.max]).toEqual([1, 10])
  })

  it('matches pandas for another small set', () => {
    const s = summarizeNumbers([5, 1, 3, 2])!
    expect(s.median).toBe(2.5)
    expect(s.q1).toBe(1.75)
    expect(s.q3).toBe(3.5)
    expect(s.std).toBeCloseTo(1.707825128, 8)
  })

  it('does not blow the stack on big columns', () => {
    const big = Array.from({ length: 300000 }, (_, i) => i)
    const s = summarizeNumbers(big)!
    expect(s.max).toBe(299999)
    expect(s.median).toBe(149999.5)
  })

  it('returns NaN std for a single value', () => {
    expect(summarizeNumbers([3])!.std).toBeNaN()
  })
})

describe('quantile', () => {
  it('interpolates between ranks', () => {
    expect(quantile([1, 2, 3, 4], 0.5)).toBe(2.5)
    expect(quantile([10], 0.9)).toBe(10)
  })
})

describe('columnStats', () => {
  it('skips blanks and counts missing', () => {
    const c = columnStats(['10', '', ' 20 ', '1,000', '  '])
    expect(c.filled).toBe(3)
    expect(c.missing).toBe(2)
    expect(c.kind).toBe('numeric')
    expect(c.numeric?.sum).toBe(1030)
  })

  it('treats mostly-text columns as text', () => {
    const c = columnStats(['Pen', 'Book', 'Pen', '12'])
    expect(c.kind).toBe('text')
    expect(c.numeric).toBeNull()
    expect(c.top[0]).toEqual({ value: 'Pen', count: 2 })
  })

  it('ignores the odd N/A in a numeric column', () => {
    const cells = Array.from({ length: 19 }, (_, i) => String(i)).concat('N/A')
    const c = columnStats(cells)
    expect(c.kind).toBe('numeric')
    expect(c.ignored).toBe(1)
    expect(c.numeric?.count).toBe(19)
  })
})
