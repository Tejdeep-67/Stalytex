import Papa from 'papaparse'
import { Row } from '../types'

export type ParsedTable = {
  headers: string[]
  rows: Row[]
  warnings: string[]
}

// Makes header names unique and non-empty: "", "Qty", "Qty" -> "Column 1", "Qty", "Qty (2)"
export function normalizeHeaders(candidates: unknown[]): string[] {
  const used = new Set<string>()
  return candidates.map((header, index) => {
    const base = String(header ?? '').trim() || `Column ${index + 1}`
    let name = base
    let n = 2
    while (used.has(name)) {
      name = `${base} (${n})`
      n += 1
    }
    used.add(name)
    return name
  })
}

// Turns an array-of-arrays (first row = header) into headers + row objects.
// Works by column position so duplicate header names don't overwrite each other.
export function tableFromMatrix(matrix: unknown[][]): { headers: string[]; rows: Row[] } {
  const nonEmpty = matrix.filter((line) => line.some((cell) => String(cell ?? '').trim() !== ''))
  if (!nonEmpty.length) return { headers: [], rows: [] }

  const headers = normalizeHeaders(nonEmpty[0])

  const rows = nonEmpty.slice(1).map((line) => {
    const row: Row = {}
    headers.forEach((header, i) => {
      const value = line[i]
      row[header] = value == null ? '' : String(value)
    })
    return row
  })
  return { headers, rows }
}

export function parseCsvText(text: string): ParsedTable {
  // header: false so we keep columns by position (duplicate names, ragged rows)
  const result = Papa.parse<string[]>(text.replace(/^\uFEFF/, ''), {
    skipEmptyLines: 'greedy',
  })

  const warnings: string[] = []
  const fatal = result.errors.filter((e) => e.type === 'Quotes')
  if (fatal.length && !result.data.length) {
    throw new Error(`Could not read the CSV: ${fatal[0].message}`)
  }
  if (fatal.length) {
    warnings.push(`${fatal.length} row(s) have unclosed quotes, check them in the editor.`)
  }

  const { headers, rows } = tableFromMatrix(result.data)
  const ragged = result.data.slice(1).filter((line) => line.length !== headers.length).length
  if (ragged) {
    warnings.push(`${ragged} row(s) had a different number of fields than the header. Short rows were padded with empty cells, extra fields were dropped.`)
  }
  return { headers, rows, warnings }
}
