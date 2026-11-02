import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { parseWorkbook } from './lib/excel'
import { buildCsv, buildWorkbook, downloadBlob } from './lib/exportData'
import { parseCsvText } from './lib/parse'
import { visibleRowIndexes } from './lib/table'
import Dashboard from './components/Dashboard'
import DatasetEditor from './components/DatasetEditor'
import ExportPanel from './components/ExportPanel'
import Sidebar, { navItems, SectionKey } from './components/Sidebar'
import Statistics from './components/Statistics'
import SQLCompiler from './components/SQLCompiler'
import Visualizations from './components/Visualizations'
import { ChartType, DatasetSummary, Row } from './types'
import { Aggregate } from './lib/chartData'
import { isNumericColumn } from './lib/numbers'


const formatBytes = (value: number) => {
  if (value === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const index = Math.floor(Math.log(value) / Math.log(1024))
  return `${(value / 1024 ** index).toFixed(1)} ${units[index]}`
}

const defaultChartType: ChartType = 'bar'

// default chart: a text column with a handful of categories on X, the first number column on Y
function pickChartColumns(headers: string[], rows: Row[]) {
  const sample = rows.slice(0, 1000)
  const numeric = headers.filter((h) => isNumericColumn(sample.map((r) => r[h])))
  // an id / row number column makes a useless default Y ("sum of order_id")
  const looksLikeId = (h: string) => /(^|[_\s-])(id|no|number)$/i.test(h) || new Set(sample.map((r) => r[h])).size === sample.length
  const measures = numeric.filter((h) => !looksLikeId(h))
  const category = headers.find((h) => {
    if (numeric.includes(h)) return false
    const unique = new Set(sample.map((r) => r[h]))
    return unique.size > 1 && unique.size <= 30
  })
  const x = category ?? headers[0] ?? ''
  const y = measures.find((h) => h !== x) ?? numeric.find((h) => h !== x) ?? ''
  return { x, y }
}

function App() {
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<Row[]>([])
  const [fileName, setFileName] = useState('')
  const [fileSize, setFileSize] = useState('')
  const [activeSection, setActiveSection] = useState<SectionKey>('dashboard')
  const [navOpen, setNavOpen] = useState(false)
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
  const [aggregate, setAggregate] = useState<Aggregate>('sum')
  const [isExporting, setIsExporting] = useState(false)
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

    if (yAxis && !headers.includes(yAxis)) {
      setYAxis('')
    }

    if (!headers.includes(statsColumn)) {
      setStatsColumn(headers[0] || '')
    }

    if (!headers.includes(filterColumn)) {
      setFilterColumn('')
      setFilterValue('')
    }
  }, [headers])

  const visibleIndexes = useMemo(
    () => visibleRowIndexes(rows, headers, { search: searchQuery, filterColumn, filterValue, sortField, sortDirection }),
    [rows, headers, searchQuery, filterColumn, filterValue, sortField, sortDirection],
  )

  const totalPages = Math.max(1, Math.ceil(visibleIndexes.length / pageSize))

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages)
    }
  }, [page, totalPages])

  const pageIndexes = useMemo(() => {
    const start = (page - 1) * pageSize
    return visibleIndexes.slice(start, start + pageSize)
  }, [visibleIndexes, page, pageSize])

  const handleUpload = async (file: File) => {
    setErrorMessage('')
    try {
      const name = file.name
      const lowerName = name.toLowerCase()
      let parsedHeaders: string[] = []
      let parsedRows: Row[] = []
      let warnings: string[] = []

      if (lowerName.endsWith('.csv')) {
        const parsed = parseCsvText(await file.text())
        parsedHeaders = parsed.headers
        parsedRows = parsed.rows
        warnings = parsed.warnings
      } else if (lowerName.endsWith('.xls') || lowerName.endsWith('.xlsx')) {
        const parsed = parseWorkbook(await file.arrayBuffer())
        parsedHeaders = parsed.headers
        parsedRows = parsed.rows
        warnings = parsed.warnings
      } else {
        throw new Error('Unsupported file type. Use CSV or XLSX.')
      }

      if (!parsedHeaders.length) {
        throw new Error('File must include a header row.')
      }

      setFileName(name)
      setFileSize(formatBytes(file.size))
      setHeaders(parsedHeaders)
      setRows(parsedRows)
      setErrorMessage(warnings.join(' '))
      setSearchQuery('')
      setFilterColumn('')
      setFilterValue('')
      setSortField('')
      setPage(1)
      const defaults = pickChartColumns(parsedHeaders, parsedRows)
      setXAxis(defaults.x)
      setYAxis(defaults.y)
      setStatsColumn(defaults.y || parsedHeaders[0])
      setActiveSection('dashboard')
    } catch (error) {
      // keep whatever dataset was loaded before, just show the error
      setErrorMessage(error instanceof Error ? error.message : 'Upload failed. Please try another file.')
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
    const emptyRow = Object.fromEntries(headers.map((header) => [header, ''])) as Row
    setRows((current) => [...current, emptyRow])
    // clear search so the new (empty) row is actually visible, it sorts to the end
    setSearchQuery('')
    setFilterValue('')
    setPage(Math.ceil((rows.length + 1) / pageSize))
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
    if (sortField === header) setSortField('')
    if (filterColumn === header) {
      setFilterColumn('')
      setFilterValue('')
    }
    setHeaders((current) => current.filter((key) => key !== header))
    setRows((current) => current.map((row) => {
      const next = { ...row }
      delete next[header]
      return next
    }))
  }

  const exportCsv = () => {
    if (!headers.length) return
    downloadBlob(buildCsv(headers, rows), 'text/csv;charset=utf-8', `${baseName()}.csv`)
  }

  const exportXlsx = () => {
    if (!headers.length) return
    downloadBlob(buildWorkbook(headers, rows), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', `${baseName()}.xlsx`)
  }

  const baseName = () => fileName.replace(/\.[^.]+$/, '') || 'dataset'

  const downloadChart = async () => {
    if (!chartRef.current || isExporting) return
    setIsExporting(true)
    try {
      const html2canvas = (await import('html2canvas')).default
      const canvas = await html2canvas(chartRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false,
        // the clone restarts css animations, which made the png come out faded
        onclone: (doc) => {
          const style = doc.createElement('style')
          style.textContent = '* { animation: none !important; transition: none !important; }'
          doc.head.appendChild(style)
        },
      })
      const link = document.createElement('a')
      link.href = canvas.toDataURL('image/png')
      link.download = `${baseName()}-${chartType}-chart.png`
      link.click()
    } finally {
      setIsExporting(false)
    }
  }

  const datasetLoaded = headers.length > 0
  const closeNav = useCallback(() => setNavOpen(false), [])

  return (
    <div className="workspace-layout">
      <Sidebar
        activeSection={activeSection}
        onSelectSection={(section) => {
          setActiveSection(section)
          setNavOpen(false)
        }}
        open={navOpen}
        onClose={closeNav}
        datasetName={fileName}
      />
      <main className="workspace-main">
        <header className="mobile-bar">
          <button
            type="button"
            className="menu-button"
            onClick={() => setNavOpen(true)}
            aria-label="Open menu"
            aria-expanded={navOpen}
            aria-controls="sidebar"
          >
            <span />
            <span />
            <span />
          </button>
          <div className="mobile-title">
            <strong>Stalytex</strong>
            <span>{navItems.find((item) => item.key === activeSection)?.title}</span>
          </div>
        </header>

        <div className="topbar">
          <div>
            <p className="eyebrow">Stalytex Workspace</p>
            <h1>Browser-first analytics studio</h1>
          </div>
          <div className={`status-chip ${datasetLoaded ? 'ready' : ''}`} title={fileName}>
            {datasetLoaded ? `${rows.length.toLocaleString()} rows · ${headers.length} columns` : 'Upload a dataset to begin'}
          </div>
        </div>

        <div className="page-panel">
          {activeSection === 'dashboard' && (
            <Dashboard summary={datasetSummary} onUpload={handleUpload} errorMessage={errorMessage} />
          )}
          {activeSection === 'editor' && (
            <DatasetEditor
              headers={headers}
              rows={rows}
              pageIndexes={pageIndexes}
              visibleCount={visibleIndexes.length}
              page={page}
              pageSize={pageSize}
              totalPages={totalPages}
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
              onChangePage={setPage}
              onChangePageSize={(value) => { setPageSize(value); setPage(1) }}
              onAddRow={addRow}
              onRemoveRow={removeRow}
              onAddColumn={addColumn}
              onRemoveColumn={removeColumn}
              onUpdateCell={updateCell}
              onResetFilters={resetFilters}
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
          {/* kept mounted (off screen) so the chart can still be exported from the Export page */}
          <div className={activeSection === 'visualizations' ? '' : 'offscreen-chart'} aria-hidden={activeSection !== 'visualizations'}>
            <Visualizations
              headers={headers}
              rows={rows}
              chartType={chartType}
              xAxis={xAxis}
              yAxis={yAxis}
              aggregate={aggregate}
              color={color}
              chartRef={chartRef}
              onSetChartType={setChartType}
              onSetXAxis={setXAxis}
              onSetYAxis={setYAxis}
              onSetAggregate={setAggregate}
              onSetColor={setColor}
              onDownload={downloadChart}
              isExporting={isExporting}
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
              chartReady={datasetLoaded}
            />
          )}
        </div>
      </main>
    </div>
  )
}

export default App
