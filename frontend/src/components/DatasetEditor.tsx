import { useMemo, useState } from 'react'
import { Row } from '../types'

type Props = {
  headers: string[]
  rows: Row[]
  page: number
  pageSize: number
  totalPages: number
  paginatedRows: Row[]
  sortField: string
  sortDirection: 'asc' | 'desc'
  searchQuery: string
  filterColumn: string
  filterValue: string
  onSearch: (value: string) => void
  onFilterColumn: (value: string) => void
  onFilterValue: (value: string) => void
  onSort: (field: string) => void
  onToggleSortDirection: () => void
  onChangePage: (page: number) => void
  onChangePageSize: (size: number) => void
  onAddRow: () => void
  onRemoveRow: (index: number) => void
  onAddColumn: (name: string) => void
  onRemoveColumn: (header: string) => void
  onUpdateCell: (rowIndex: number, header: string, value: string) => void
  onResetFilters: () => void
  headersAvailable: string[]
  errorMessage: string
}

export default function DatasetEditor({
  headers,
  rows,
  page,
  pageSize,
  totalPages,
  paginatedRows,
  sortField,
  sortDirection,
  searchQuery,
  filterColumn,
  filterValue,
  onSearch,
  onFilterColumn,
  onFilterValue,
  onSort,
  onToggleSortDirection,
  onChangePage,
  onChangePageSize,
  onAddRow,
  onRemoveRow,
  onAddColumn,
  onRemoveColumn,
  onUpdateCell,
  onResetFilters,
  headersAvailable,
  errorMessage,
}: Props) {
  const [newColumnName, setNewColumnName] = useState('')

  const columnOptions = useMemo(() => headersAvailable, [headersAvailable])

  const toggleSort = (field: string) => {
    onSort(field)
    if (sortField === field) {
      onToggleSortDirection()
    }
  }

  return (
    <section className="panel-card">
      <div className="section-header">
        <p className="eyebrow">Dataset Editor</p>
        <h2>Inspect and edit rows</h2>
        <p className="section-copy">
          Search, filter, sort, and update table values in-browser. Manage rows and columns without external services.
        </p>
      </div>

      <div className="table-actions">
        <div className="controls">
          <label>
            Search rows
            <input value={searchQuery} onChange={(event) => onSearch(event.target.value)} placeholder="Search all columns" />
          </label>
          <div className="input-row">
            <label>
              Filter column
              <select value={filterColumn} onChange={(event) => onFilterColumn(event.target.value)}>
                <option value="">None</option>
                {columnOptions.map((column) => (
                  <option key={column} value={column}>{column}</option>
                ))}
              </select>
            </label>
            <label>
              Filter text
              <input value={filterValue} onChange={(event) => onFilterValue(event.target.value)} disabled={!filterColumn} placeholder={filterColumn ? 'Contains...' : 'Select a column first'} />
            </label>
          </div>
        </div>
        <div className="controls-inline">
          <button type="button" className="primary-action" onClick={onAddRow}>Add row</button>
          <button type="button" className="secondary-action" onClick={onResetFilters}>Show all rows</button>
          <label>
            New column
            <input value={newColumnName} onChange={(event) => setNewColumnName(event.target.value)} placeholder="Column name" />
          </label>
          <button type="button" className="secondary-action" onClick={() => {
            if (!newColumnName.trim()) return
            onAddColumn(newColumnName)
            setNewColumnName('')
          }}>
            Add column
          </button>
        </div>
      </div>

      {errorMessage ? <p className="warning-text">{errorMessage}</p> : null}

      <div className="table-shell">
        <table className="data-table">
          <thead>
            <tr>
              <th>#</th>
              {headers.map((header) => (
                <th key={header} onClick={() => toggleSort(header)} style={{ cursor: 'pointer' }}>
                  {header} {sortField === header ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
                </th>
              ))}
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedRows.map((row, rowIndex) => {
              const originalIndex = rows.indexOf(row)
              return (
                <tr key={`row-${originalIndex}`}>
                  <td>{originalIndex + 1}</td>
                  {headers.map((header) => (
                    <td key={`${originalIndex}-${header}`}>
                      <input value={row[header] ?? ''} onChange={(event) => onUpdateCell(originalIndex, header, event.target.value)} />
                    </td>
                  ))}
                  <td>
                    <button type="button" className="secondary-action" onClick={() => onRemoveRow(originalIndex)}>Delete</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="pagination-bar">
        <div>
          <button type="button" onClick={() => onChangePage(Math.max(1, page - 1))} disabled={page <= 1}>Prev</button>
          <button type="button" onClick={() => onChangePage(Math.min(totalPages, page + 1))} disabled={page >= totalPages}>Next</button>
        </div>
        <div>
          Page {page} of {totalPages}
          <select value={pageSize} onChange={(event) => onChangePageSize(Number(event.target.value))}>
            {[10, 15, 25, 50, 100].map((size) => (
              <option key={size} value={size}>{size} rows</option>
            ))}
          </select>
        </div>
      </div>

      {headers.length ? (
        <div className="label-group" style={{ marginTop: '18px' }}>
          <small>Tip: Click any column header to sort the dataset.</small>
        </div>
      ) : (
        <div className="label-group" style={{ marginTop: '18px' }}>
          <small>Upload a dataset to enable table editing.</small>
        </div>
      )}
    </section>
  )
}
