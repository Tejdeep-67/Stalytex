import { describe, expect, it } from 'vitest'
import * as XLSX from 'xlsx'
import { parseWorkbook, sheetToMatrix } from './excel'

describe('sheetToMatrix', () => {
  it('turns date cells into yyyy-mm-dd instead of serial numbers', () => {
    const sheet: XLSX.WorkSheet = {
      '!ref': 'A1:C2',
      A1: { t: 's', v: 'Date' },
      B1: { t: 's', v: 'Price' },
      C1: { t: 's', v: 'Paid' },
      A2: { t: 'n', v: 45717, z: 'dd/mm/yyyy' },
      B2: { t: 'n', v: 9.5 },
      C2: { t: 'b', v: true },
    }
    expect(sheetToMatrix(sheet)).toEqual([
      ['Date', 'Price', 'Paid'],
      ['2025-03-01', '9.5', 'TRUE'],
    ])
  })
})

describe('parseWorkbook', () => {
  it('round trips a workbook and keeps duplicate headers apart', () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ['Qty', 'Qty', 'Item'],
      [1, 2, 'Pen'],
      [null, 4, 'Book'],
    ])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Data')
    const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer
    const t = parseWorkbook(buf)
    expect(t.headers).toEqual(['Qty', 'Qty (2)', 'Item'])
    expect(t.rows).toEqual([
      { Qty: '1', 'Qty (2)': '2', Item: 'Pen' },
      { Qty: '', 'Qty (2)': '4', Item: 'Book' },
    ])
  })
})
