import { memo, useEffect, useState } from 'react'
import { Row } from '../types'

type Props = {
  headers: string[]
  rows: Row[]
  pageIndexes: number[]
  visibleCount: number
  page: number
  pageSize: number
  totalPages: number
  sortField: string
  sortDirection: 'asc' | 'desc'
  searchQuery: string
  filterColumn: string
  filterValue: string
  onSearch: (value: string) => void
  onFilterColumn: (value: string) => void
  onFilterValue: (value: string) => void
  onSort: (field: string) => void
  onChangePage: (page: number) => void
  onChangePageSize: (size: number) => void
  onAddRow: () => void
  onRemoveRow: (index: number) => void
  onAddColumn: (name: string) => void
  onRemoveColumn: (header: string) => void
  onUpdateCell: (rowIndex: number, header: string, value: string) => void
  onResetFilters: () => void
}

type CellProps = {
  value: string
  label: string
  onCommit: (value: string) => void
}

// Keeps the typed text locally and only saves on blur / Enter.
// Saving on every key made the row jump away when the table was sorted by that column.
const EditableCell = memo(function EditableCell({ value, label, onCommit }: CellProps) {
  const [draft, setDraft] = useState(value)
  useEffect(() => setDraft(value), [value])

  return (
    <input
      value={draft}
      aria-label={label}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => {
        if (draft !== value) onCommit(draft)
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter') event.currentTarget.blur()
        if (event.key === 'Escape') {
          setDraft(value)
          requestAnimationFrame(() => event.currentTarget?.blur())
        }
      }}
    />
  )
})

export default function DatasetEditor({
  headers,
  rows,
  pageIndexes,
  visibleCount,
  page,
  pageSize,
  totalPages,
  sortField,
  sortDirection,
  searchQuery,
  filterColumn,
  filterValue,
  onSearch,
  onFilterColumn,
  onFilterValue,
  onSort,
  onChangePage,
  onChangePageSize,
  onAddRow,
  onRemoveRow,
  onAddColumn,
  onRemoveColumn,
  onUpdateCell,
  onResetFilters,
}: Props) {
  const [newColumnName, setNewColumnName] = useState('')
  const hasData = headers.length > 0
  const filtersActive = Boolean(searchQuery.trim() || (filterColumn && filterValue.trim()) || sortField)

  const submitColumn = () => {
    if (!newColumnName.trim()) return
    onAddColumn(newColumnName)
    setNewColumnName('')
  }

  return (
    <section className="panel-card">
      <div className="section-header">
        <p className="eyebrow">Dataset Editor</p>
        <h2>Inspect and edit rows</h2>
        <p className="section-copy">
          Search, filter and sort the table, edit any cell (Enter saves, Esc cancels), and add or remove rows and columns.
        </p>
      </div>

      {!hasData ? (
        <div className="empty-section">
          <p>Upload a dataset on the Dashboard to start editing.</p>
        </div>
      ) : (
        <>
          <div className="editor-controls">
            <label className="field">
              Search rows
              <input type="search" value={searchQuery} onChange={(event) => onSearch(event.target.value)} placeholder="Search all columns" />
            </label>
            <label className="field">
              Filter column
              <select value={filterColumn} onChange={(event) => onFilterColumn(event.target.value)}>
                <option value="">None</option>
                {headers.map((column) => (
                  <option key={column} value={column}>{column}</option>
                ))}
              </select>
            </label>
            <label className="field">
              Filter text
              <input value={filterValue} onChange={(event) => onFilterValue(event.target.value)} disabled={!filterColumn} placeholder={filterColumn ? 'Contains...' : 'Select a column first'} />
            </label>
          </div>

          <div className="editor-toolbar">
            <div className="toolbar-group">
              <button type="button" className="primary-action" onClick={onAddRow}>Add row</button>
              <button type="button" className="secondary-action" onClick={onResetFilters} disabled={!filtersActive}>Clear search &amp; sort</button>
            </div>
            <form
              className="toolbar-group add-column"
              onSubmit={(event) => {
                event.preventDefault()
                submitColumn()
              }}
            >
              <input value={newColumnName} onChange={(event) => setNewColumnName(event.target.value)} placeholder="New column name" aria-label="New column name" />
              <button type="submit" className="secondary-action" disabled={!newColumnName.trim()}>Add column</button>
            </form>
          </div>

          <p className="table-meta">
            Showing {visibleCount.toLocaleString()} of {rows.length.toLocaleString()} rows
          </p>

          <div className="table-shell">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="index-col">#</th>
                  {headers.map((header) => (
                    <th key={header} aria-sort={sortField === header ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}>
                      <div className="th-inner">
                        <button type="button" className="sort-button" onClick={() => onSort(header)} title={`Sort by ${header}`}>
                          {header}
                          <span className={`sort-icon ${sortField === header ? 'on' : ''}`} aria-hidden="true">
                            {sortField === header && sortDirection === 'desc' ? '▼' : '▲'}
                          </span>
                        </button>
                        <button
                          type="button"
                          className="column-remove"
                          aria-label={`Delete column ${header}`}
                          title="Delete column"
                          onClick={() => {
                            if (window.confirm(`Delete the column "${header}"?`)) onRemoveColumn(header)
                          }}
                        >
                          ×
                        </button>
                      </div>
                    </th>
                  ))}
                  <th className="actions-col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageIndexes.map((rowIndex) => {
                  const row = rows[rowIndex]
                  return (
                    <tr key={rowIndex}>
                      <td className="index-col">{rowIndex + 1}</td>
                      {headers.map((header) => (
                        <td key={header}>
                          <EditableCell
                            value={row[header] ?? ''}
                            label={`${header}, row ${rowIndex + 1}`}
                            onCommit={(value) => onUpdateCell(rowIndex, header, value)}
                          />
                        </td>
                      ))}
                      <td className="actions-col">
                        <button type="button" className="link-danger" onClick={() => onRemoveRow(rowIndex)}>Delete</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {!pageIndexes.length ? (
              <div className="empty-section slim">
                <p>No rows match. Try a different search.</p>
              </div>
            ) : null}
          </div>

          <div className="pagination-bar">
            <div className="toolbar-group">
              <button type="button" onClick={() => onChangePage(Math.max(1, page - 1))} disabled={page <= 1}>Prev</button>
              <button type="button" onClick={() => onChangePage(Math.min(totalPages, page + 1))} disabled={page >= totalPages}>Next</button>
            </div>
            <div className="toolbar-group">
              <span>Page {page} of {totalPages}</span>
              <select value={pageSize} onChange={(event) => onChangePageSize(Number(event.target.value))} aria-label="Rows per page">
                {[10, 15, 25, 50, 100].map((size) => (
                  <option key={size} value={size}>{size} rows</option>
                ))}
              </select>
            </div>
          </div>
        </>
      )}
    </section>
  )
}
