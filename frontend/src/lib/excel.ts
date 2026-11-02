import * as XLSX from 'xlsx'
import { ParsedTable, tableFromMatrix } from './parse'

function cellToText(cell: XLSX.CellObject | undefined): string {
  if (!cell || cell.v == null) return ''
  if (cell.t === 'd' && cell.v instanceof Date) return cell.v.toISOString().slice(0, 10)
  if (cell.t === 'n') {
    // dates in excel are just numbers with a date format on them (days since 1900)
    if (cell.z && XLSX.SSF.is_date(cell.z)) {
      const value = cell.v as number
      return XLSX.SSF.format(value % 1 === 0 ? 'yyyy-mm-dd' : 'yyyy-mm-dd hh:mm', value)
    }
    return String(cell.v)
  }
  if (cell.t === 'b') return cell.v ? 'TRUE' : 'FALSE'
  if (cell.t === 'e') return cell.w ?? ''
  return String(cell.v)
}

export function sheetToMatrix(sheet: XLSX.WorkSheet): string[][] {
  if (!sheet || !sheet['!ref']) return []
  const range = XLSX.utils.decode_range(sheet['!ref'])
  const matrix: string[][] = []
  for (let r = range.s.r; r <= range.e.r; r++) {
    const line: string[] = []
    for (let c = range.s.c; c <= range.e.c; c++) {
      line.push(cellToText(sheet[XLSX.utils.encode_cell({ r, c })]))
    }
    matrix.push(line)
  }
  return matrix
}

export function parseWorkbook(data: ArrayBuffer): ParsedTable {
  const workbook = XLSX.read(data, { type: 'array', cellNF: true })
  const sheetName = workbook.SheetNames.find((name) => workbook.Sheets[name]?.['!ref']) ?? workbook.SheetNames[0]
  const { headers, rows } = tableFromMatrix(sheetToMatrix(workbook.Sheets[sheetName]))
  if (!headers.length) throw new Error('Workbook contains no data')

  const warnings: string[] = []
  if (workbook.SheetNames.length > 1) {
    warnings.push(`Loaded sheet "${sheetName}" (the workbook has ${workbook.SheetNames.length} sheets, only one is used).`)
  }
  return { headers, rows, warnings }
}
