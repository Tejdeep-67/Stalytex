import * as XLSX from 'xlsx'
import { Row } from '../types'
import { isNumericColumn, toNumber } from './numbers'

const isoDay = /^\d{4}-\d{2}-\d{2}$/

// Number columns are written as real numbers (they used to be text, so SUM() in Excel gave 0)
// and yyyy-mm-dd columns as real dates.
export function buildWorkbook(headers: string[], rows: Row[]): ArrayBuffer {
  const numeric = headers.map((h) => isNumericColumn(rows.map((r) => r[h])))
  const dates = headers.map((h, i) => !numeric[i] && rows.some((r) => r[h]) && rows.every((r) => !r[h] || isoDay.test(r[h].trim())))

  const aoa: unknown[][] = [headers]
  for (const row of rows) {
    aoa.push(
      headers.map((h, i) => {
        const raw = row[h] ?? ''
        if (raw.trim() === '') return null
        if (numeric[i]) return toNumber(raw)
        if (dates[i]) {
          const [y, m, d] = raw.trim().split('-').map(Number)
          return new Date(Date.UTC(y, m - 1, d))
        }
        return raw
      }),
    )
  }

  const sheet = XLSX.utils.aoa_to_sheet(aoa, { cellDates: true, dateNF: 'yyyy-mm-dd', UTC: true })
  sheet['!cols'] = headers.map((h) => ({ wch: Math.min(40, Math.max(10, h.length + 2)) }))
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, sheet, 'Dataset')
  return XLSX.write(workbook, { bookType: 'xlsx', type: 'array', compression: true }) as ArrayBuffer
}
