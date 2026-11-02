import { Row } from '../types'
import { toNumber } from './numbers'

export type ViewOptions = {
  search: string
  filterColumn: string
  filterValue: string
  sortField: string
  sortDirection: 'asc' | 'desc'
}

// Returns the indexes (into rows) that are visible after search, filter and sort.
// Working with indexes means edits/deletes always hit the right row, even on a sorted page.
export function visibleRowIndexes(rows: Row[], headers: string[], options: ViewOptions): number[] {
  const search = options.search.trim().toLowerCase()
  const filter = options.filterValue.trim().toLowerCase()
  const filterColumn = options.filterColumn && headers.includes(options.filterColumn) ? options.filterColumn : ''

  const indexes: number[] = []
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    if (search && !headers.some((h) => (row[h] ?? '').toLowerCase().includes(search))) continue
    if (filterColumn && filter && !(row[filterColumn] ?? '').toLowerCase().includes(filter)) continue
    indexes.push(i)
  }

  const field = options.sortField
  if (!field || !headers.includes(field)) return indexes

  // read each cell once instead of inside the comparator
  const text = indexes.map((i) => (rows[i][field] ?? '').trim())
  const nums = text.map((t) => toNumber(t))
  const allNumeric = text.every((t, k) => t === '' || nums[k] !== null)
  const dir = options.sortDirection === 'asc' ? 1 : -1
  const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })

  const order = indexes.map((_, k) => k)
  order.sort((a, b) => {
    // empty cells always go to the bottom, whatever the direction
    const aEmpty = text[a] === ''
    const bEmpty = text[b] === ''
    if (aEmpty || bEmpty) return aEmpty === bEmpty ? a - b : aEmpty ? 1 : -1
    const diff = allNumeric ? (nums[a] as number) - (nums[b] as number) : collator.compare(text[a], text[b])
    return diff === 0 ? a - b : diff * dir
  })
  return order.map((k) => indexes[k])
}
