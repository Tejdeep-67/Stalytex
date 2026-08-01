import { useEffect, useMemo, useRef, useState } from 'react'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import Dashboard from './components/Dashboard'
import DatasetEditor from './components/DatasetEditor'
import ExportPanel from './components/ExportPanel'
import Sidebar from './components/Sidebar'
import Statistics from './components/Statistics'
import SQLCompiler from './components/SQLCompiler'
import Visualizations from './components/Visualizations'
import { ChartType, DatasetSummary, Row } from './types'

const sectionLabels = ['dashboard', 'editor', 'statistics', 'visualizations', 'sql', 'export'] as const

type SectionKey = (typeof sectionLabels)[number]

const formatBytes = (value: number) => {
  if (value === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const index = Math.floor(Math.log(value) / Math.log(1024))
  return `${(value / 1024 ** index).toFixed(1)} ${units[index]}`
}

const defaultChartType: ChartType = 'bar'

function App() {
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<Row[]>([])
  const [fileName, setFileName] = useState('')
  const [fileSize, setFileSize] = useState('')
  const [activeSection, setActiveSection] = useState<SectionKey>('dashboard')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortField, setSortField] = useState('')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(15)
  const [filterColumn, setFilterColumn] = useState('')
  const [filterValue, setFilterValue] = useState('')
  const [statsColumn, setStatsColumn] = useState('')
  const [chartType, setChartType] = useState<ChartType>(defaultChartType)
  const [xAxis, setXAxis] = useState('')
  const [yAxis, setYAxis] = useState('')
  const [color, setColor] = useState('#ff7a00')
  const [errorMessage, setErrorMessage] = useState('')
  const [chartPreviewReady, setChartPreviewReady] = useState(false)
  const chartRef = useRef<HTMLDivElement | null>(null)

  const datasetSummary: DatasetSummary = useMemo(() => {
    const missing = rows.reduce((sum, row) => sum + headers.reduce((count, key) => {
      const value = row[key]?.toString().trim() ?? ''
      return count + (value === '' ? 1 : 0)
    }, 0), 0)

    const numericColumns = headers.filter((key) => rows.some((row) => {
      const value = row[key]?.toString().trim() ?? ''
      return value !== '' && !Number.isNaN(Number(value))
    }))

    return {
      rows: rows.length,
      columns: headers.length,
      missing,
      numericColumns: numericColumns.length,
      fileSize,
      fileName,
    }
  }, [headers, rows, fileSize, fileName])

  useEffect(() => {
    if (!headers.length) {
      setXAxis('')
      setYAxis('')
      setStatsColumn('')
      setFilterColumn('')
      setFilterValue('')
      return
    }

    if (!headers.includes(xAxis)) {
      setXAxis(headers[0] || '')
    }

    if (!headers.includes(yAxis)) {
      setYAxis(headers[1] || headers[0] || '')
    }

    if (!headers.includes(statsColumn)) {
      setStatsColumn(headers[0] || '')
    }

    if (!headers.includes(filterColumn)) {
      setFilterColumn('')
      setFilterValue('')
    }
  }, [headers])

  const parsedRows = useMemo(() => {
    let workingRows = rows

    if (searchQuery.trim()) {
      const normalized = searchQuery.toLowerCase()
      workingRows = workingRows.filter((row) => headers.some((key) => row[key]?.toString().toLowerCase().includes(normalized)))
    }

    if (filterColumn && filterValue.trim()) {
      const normalized = filterValue.toLowerCase()
      workingRows = workingRows.filter((row) => row[filterColumn]?.toString().toLowerCase().includes(normalized))
    }

    if (sortField && headers.includes(sortField)) {
      const direction = sortDirection === 'asc' ? 1 : -1
      workingRows = [...workingRows].sort((a, b) => {
        const aValue = a[sortField] ?? ''
        const bValue = b[sortField] ?? ''
        const aNum = Number(aValue)
        const bNum = Number(bValue)
        if (!Number.isNaN(aNum) && !Number.isNaN(bNum)) {
          return (aNum - bNum) * direction
        }
        return aValue.toString().localeCompare(bValue.toString()) * direction
      })
    }

    return workingRows
  }, [rows, headers, searchQuery, filterColumn, filterValue, sortField, sortDirection])

  const totalPages = Math.max(1, Math.ceil(parsedRows.length / pageSize))

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages)
    }
  }, [page, totalPages])

  const paginatedRows = useMemo(() => {
    const start = (page - 1) * pageSize
    return parsedRows.slice(start, start + pageSize)
  }, [parsedRows, page, pageSize])

  const normalizeHeaders = (candidateHeaders: string[]) => {
    const used = new Set<string>()
    return candidateHeaders.map((header, index) => {
      let normalized = String(header || `Column ${index + 1}`).trim() || `Column ${index + 1}`
      while (used.has(normalized)) {
        normalized = `${normalized} ${used.size + 1}`
      }
      used.add(normalized)
      return normalized
    })
  }

  const handleUpload = async (file: File) => {
    setErrorMessage('')
    try {
      const name = file.name
      setFileName(name)
      setFileSize(formatBytes(file.size))
      const lowerName = name.toLowerCase()
      let parsedHeaders: string[] = []
      let parsedRows: Row[] = []

      if (lowerName.endsWith('.csv')) {
        const content = await file.text()
        const result = Papa.parse<Record<string, string>>(content, {
          header: true,
          skipEmptyLines: true,
        })

        if (result.errors.length) {
          throw new Error(result.errors[0].message)
        }

        parsedHeaders = result.meta.fields?.map(String) ?? []
        parsedRows = (result.data as Row[]).map((row) => {
          const normalized: Row = {}
          Object.entries(row).forEach(([key, value]) => {
            normalized[String(key)] = value == null ? '' : String(value)
          })
          return normalized
        })
      } else if (lowerName.endsWith('.xls') || lowerName.endsWith('.xlsx')) {
        const buffer = await file.arrayBuffer()
        const workbook = XLSX.read(buffer, { type: 'array' })
        const sheet = workbook.Sheets[workbook.SheetNames[0]]
        const raw = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: '' })
        if (!raw.length) {
          throw new Error('Workbook contains no data')
        }
        parsedHeaders = raw[0].map((header) => String(header || '').trim() || 'Column')
        parsedRows = raw.slice(1).map((row) => {
          const normalized: Row = {}
          parsedHeaders.forEach((header, index) => {
            normalized[header] = String(row[index] ?? '')
          })
          return normalized
        })
      } else {
        throw new Error('Unsupported file type. Use CSV or XLSX.')
      }

      if (!parsedHeaders.length) {
        throw new Error('File must include a header row.')
      }

      const sourceHeaders = parsedHeaders.map((header) => String(header || '').trim() || 'Column')
      const cleanedHeaders = normalizeHeaders(sourceHeaders)
      const rowsWithHeaders = parsedRows.map((row) => {
        const next: Row = {}
        sourceHeaders.forEach((sourceHeader, index) => {
          const finalHeader = cleanedHeaders[index]
          next[finalHeader] = row[sourceHeader] ?? ''
        })
        return next
      })

      setHeaders(cleanedHeaders)
      setRows(rowsWithHeaders)
      setSearchQuery('')
      setFilterColumn('')
      setFilterValue('')
      setSortField('')
      setPage(1)
      setChartPreviewReady(false)
      setActiveSection('dashboard')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Upload failed. Please try another file.')
      setHeaders([])
      setRows([])
    }
  }

  const resetFilters = () => {
    setSearchQuery('')
    setFilterColumn('')
    setFilterValue('')
    setSortField('')
    setPage(1)
  }

  const addRow = () => {
    if (!headers.length) return
    setRows((current) => [...current, headers.reduce<Row>((row, header) => ({ ...row, [header]: '' }), {})])
    setPage(totalPages)
  }

  const removeRow = (index: number) => {
    setRows((current) => current.filter((_, rowIndex) => rowIndex !== index))
  }

  const updateCell = (rowIndex: number, header: string, value: string) => {
    setRows((current) => current.map((row, index) => index === rowIndex ? { ...row, [header]: value } : row))
  }

  const addColumn = (name: string) => {
    if (!name.trim()) return
    const desired = name.trim()
    let candidate = desired
    let counter = 1
    while (headers.includes(candidate)) {
      candidate = `${desired} ${counter}`
      counter += 1
    }
    setHeaders((current) => [...current, candidate])
    setRows((current) => current.map((row) => ({ ...row, [candidate]: '' })))
  }

  const removeColumn = (header: string) => {
    setHeaders((current) => current.filter((key) => key !== header))
    setRows((current) => current.map((row) => {
      const next = { ...row }
      delete next[header]
      return next
    }))
  }

  const exportCsv = () => {
    if (!headers.length) return
    const csv = Papa.unparse({ fields: headers, data: rows.map((row) => headers.map((header) => row[header] ?? '')) })
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `${fileName.replace(/\.[^.]+$/, '') || 'dataset'}.csv`
    link.click()
  }

  const exportXlsx = () => {
    if (!headers.length) return
    const worksheet = XLSX.utils.json_to_sheet(rows, { header: headers })
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Dataset')
    const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
    const blob = new Blob([wbout], { type: 'application/octet-stream' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `${fileName.replace(/\.[^.]+$/, '') || 'dataset'}.xlsx`
    link.click()
  }

  const downloadChart = async () => {
    if (!chartRef.current) return
    const html2canvas = (await import('html2canvas')).default
    const canvas = await html2canvas(chartRef.current, { backgroundColor: '#ffffff', scale: 2 })
    const link = document.createElement('a')
    link.href = canvas.toDataURL('image/png')
    link.download = 'chart-export.png'
    link.click()
  }

  const datasetLoaded = headers.length > 0

  return (
    <div className="workspace-layout">
      <Sidebar activeSection={activeSection} onSelectSection={setActiveSection} />
      <main className="workspace-main">
        <div className="topbar">
          <div>
            <p className="eyebrow">Stalytex Workspace</p>
            <h1>Browser-first analytics studio</h1>
          </div>
          <div className="status-chip">{datasetLoaded ? 'Dataset ready' : 'Upload a dataset to begin'}</div>
        </div>

        <div className="page-panel">
          {activeSection === 'dashboard' && (
            <Dashboard summary={datasetSummary} onUpload={handleUpload} errorMessage={errorMessage} />
          )}
          {activeSection === 'editor' && (
            <DatasetEditor
              headers={headers}
              rows={rows}
              page={page}
              pageSize={pageSize}
              totalPages={totalPages}
              paginatedRows={paginatedRows}
              sortField={sortField}
              sortDirection={sortDirection}
              searchQuery={searchQuery}
              filterColumn={filterColumn}
              filterValue={filterValue}
              onSearch={(value) => { setSearchQuery(value); setPage(1) }}
              onFilterColumn={(value) => { setFilterColumn(value); setPage(1) }}
              onFilterValue={(value) => { setFilterValue(value); setPage(1) }}
              onSort={(field) => {
                if (sortField === field) {
                  setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'))
                } else {
                  setSortField(field)
                  setSortDirection('asc')
                }
              }}
              onToggleSortDirection={() => setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'))}
              onChangePage={setPage}
              onChangePageSize={(value) => { setPageSize(value); setPage(1) }}
              onAddRow={addRow}
              onRemoveRow={removeRow}
              onAddColumn={addColumn}
              onRemoveColumn={removeColumn}
              onUpdateCell={updateCell}
              onResetFilters={resetFilters}
              headersAvailable={headers}
              errorMessage={errorMessage}
            />
          )}
          {activeSection === 'statistics' && (
            <Statistics
              headers={headers}
              rows={rows}
              selectedColumn={statsColumn}
              onSelectColumn={setStatsColumn}
            />
          )}
          <div className={activeSection === 'visualizations' ? '' : 'visually-hidden'}>
            <Visualizations
              headers={headers}
              rows={rows}
              chartType={chartType}
              xAxis={xAxis}
              yAxis={yAxis}
              color={color}
              chartRef={chartRef}
              onSetChartType={setChartType}
              onSetXAxis={setXAxis}
              onSetYAxis={setYAxis}
              onSetColor={setColor}
              chartPreviewReady={chartPreviewReady}
              onGenerateChart={() => setChartPreviewReady(true)}
            />
          </div>
          {activeSection === 'sql' && (
            <SQLCompiler headers={headers} rows={rows} />
          )}
          {activeSection === 'export' && (
            <ExportPanel
              datasetReady={datasetLoaded}
              onDownloadCsv={exportCsv}
              onDownloadXlsx={exportXlsx}
              onDownloadChart={downloadChart}
              chartReady={Boolean(chartRef.current)}
            />
          )}
        </div>
      </main>
    </div>
  )
}

export default App
