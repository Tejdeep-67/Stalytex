import Papa from 'papaparse'
import { Row } from '../types'

// CSV with a BOM so Excel opens accented text (Café, ₹) correctly instead of showing Ã©
export function buildCsv(headers: string[], rows: Row[]): string {
  const csv = Papa.unparse({ fields: headers, data: rows.map((row) => headers.map((h) => row[h] ?? '')) }, { newline: '\r\n' })
  return `\uFEFF${csv}`
}

export function downloadBlob(data: BlobPart, type: string, filename: string) {
  const url = URL.createObjectURL(new Blob([data], { type }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
