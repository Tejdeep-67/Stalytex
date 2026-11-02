import { describe, expect, it } from 'vitest'
import { normalizeHeaders, parseCsvText, tableFromMatrix } from './parse'

describe('normalizeHeaders', () => {
  it('fills blanks and makes duplicates unique', () => {
    expect(normalizeHeaders(['Qty', '', 'Qty', ' name ', 'Qty'])).toEqual(['Qty', 'Column 2', 'Qty (2)', 'name', 'Qty (3)'])
  })
})

describe('parseCsvText', () => {
  it('reads a single column file', () => {
    const t = parseCsvText('score\n10\n20\n\n35\n')
    expect(t.headers).toEqual(['score'])
    expect(t.rows.map((r) => r.score)).toEqual(['10', '20', '35'])
  })

  it('keeps going when rows are ragged', () => {
    const t = parseCsvText('a,b,c\n1,2,3\n4,5\n6,7,8,9\n')
    expect(t.rows).toEqual([
      { a: '1', b: '2', c: '3' },
      { a: '4', b: '5', c: '' },
      { a: '6', b: '7', c: '8' },
    ])
    expect(t.warnings.length).toBe(1)
  })

  it('handles quotes, commas inside fields and a BOM', () => {
    const t = parseCsvText('\uFEFFname,note\n"Café","rush, ""fragile"""\n')
    expect(t.headers).toEqual(['name', 'note'])
    expect(t.rows[0]).toEqual({ name: 'Café', note: 'rush, "fragile"' })
  })

  it('keeps both columns when headers repeat', () => {
    const t = parseCsvText('qty,qty\n1,2\n')
    expect(t.rows[0]).toEqual({ qty: '1', 'qty (2)': '2' })
  })
})

describe('tableFromMatrix', () => {
  it('skips fully empty lines', () => {
    const t = tableFromMatrix([['a', 'b'], ['', ''], [1, null]])
    expect(t.rows).toEqual([{ a: '1', b: '' }])
  })
})
