export type Row = Record<string, string>

export type ChartType = 'bar' | 'line' | 'pie' | 'scatter' | 'area' | 'histogram'

export interface DatasetSummary {
  rows: number
  columns: number
  missing: number
  numericColumns: number
  fileSize: string
  fileName: string
}
