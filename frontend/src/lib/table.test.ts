import { describe, expect, it } from 'vitest'
import { visibleRowIndexes } from './table'

const headers = ['name', 'score']
const rows = [
  { name: 'Ravi', score: '9' },
  { name: 'anil', score: '' },
  { name: 'Sita', score: '10' },
  { name: 'Kiran', score: '1,200' },
]
const base = { search: '', filterColumn: '', filterValue: '', sortField: '', sortDirection: 'asc' as const }

describe('visibleRowIndexes', () => {
  it('sorts numbers numerically with blanks last', () => {
    expect(visibleRowIndexes(rows, headers, { ...base, sortField: 'score' })).toEqual([0, 2, 3, 1])
    expect(visibleRowIndexes(rows, headers, { ...base, sortField: 'score', sortDirection: 'desc' })).toEqual([3, 2, 0, 1])
  })

  it('sorts text case-insensitively', () => {
    expect(visibleRowIndexes(rows, headers, { ...base, sortField: 'name' })).toEqual([1, 3, 0, 2])
  })

  it('searches and filters but keeps original indexes', () => {
    expect(visibleRowIndexes(rows, headers, { ...base, search: 'i' })).toEqual([0, 1, 2, 3])
    expect(visibleRowIndexes(rows, headers, { ...base, filterColumn: 'name', filterValue: 'ta' })).toEqual([2])
  })
})
