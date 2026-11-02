import { describe, expect, it } from 'vitest'
import * as XLSX from 'xlsx'
import { buildCsv } from './exportData'
import { buildWorkbook } from './exportXlsx'
import { parseCsvText } from './parse'
import { parseWorkbook } from './excel'

const headers = ['name', 'price', 'day', 'note']
const rows = [
  { name: 'Café', price: '1,250.5', day: '2025-03-01', note: 'said "hi", left' },
  { name: 'Pen', price: '', day: '', note: '' },
]

describe('buildCsv', () => {
  it('starts with a BOM and round trips through the parser', () => {
    const csv = buildCsv(headers, rows)
    expect(csv.charCodeAt(0)).toBe(0xfeff)
    const back = parseCsvText(csv)
    expect(back.headers).toEqual(headers)
    expect(back.rows).toEqual(rows)
  })
})

describe('buildWorkbook', () => {
  it('writes numbers as numbers and dates as dates', () => {
    const wb = XLSX.read(buildWorkbook(headers, rows), { type: 'array', cellNF: true })
    const sheet = wb.Sheets.Dataset
    expect(sheet.B2.t).toBe('n')
    expect(sheet.B2.v).toBe(1250.5)
    expect(sheet.C2.t).toBe('n')
    expect(XLSX.SSF.is_date(sheet.C2.z as string)).toBe(true)
    expect(sheet.A2.v).toBe('Café')
    expect(sheet.B3).toBeUndefined()
  })

  it('reads back with the same values', () => {
    const back = parseWorkbook(buildWorkbook(headers, rows))
    expect(back.rows[0]).toEqual({ name: 'Café', price: '1250.5', day: '2025-03-01', note: 'said "hi", left' })
  })
})
