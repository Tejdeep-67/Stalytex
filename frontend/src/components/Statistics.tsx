import { useMemo, useState } from 'react'
import { Row } from '../types'

type Props = {
  headers: string[]
  rows: Row[]
  selectedColumn: string
  onSelectColumn: (column: string) => void
}

function formatNumber(value: number) {
  return Number.isFinite(value) ? value.toLocaleString() : '-'
}

export default function Statistics({ headers, rows, selectedColumn, onSelectColumn }: Props) {
  const [refreshTick, setRefreshTick] = useState(0)

  const stats = useMemo(() => {
    if (!selectedColumn || !headers.includes(selectedColumn)) {
      return null
    }

    const values = rows.map((row) => row[selectedColumn]?.toString().trim()).filter(Boolean)
    const numeric = values.map(Number).filter((value) => !Number.isNaN(value))
    const unique = new Set(values).size
    const empty = rows.length - values.length
    const total = values.length
    const min = Math.min(...numeric)
    const max = Math.max(...numeric)
    const average = numeric.length ? numeric.reduce((sum, value) => sum + value, 0) / numeric.length : NaN

    return {
      total,
      unique,
      empty,
      min,
      max,
      average,
      numericCount: numeric.length,
    }
  }, [headers, rows, selectedColumn, refreshTick])

  return (
    <section className="panel-card">
      <div className="section-header">
        <p className="eyebrow">Statistics</p>
        <h2>Column analytics</h2>
        <p className="section-copy">
          Review column-level metrics, compare numeric and categorical distributions, and identify missing data.
        </p>
      </div>

      <div className="input-row" style={{ marginTop: '20px' }}>
        <label>
          Select column
          <select value={selectedColumn} onChange={(event) => onSelectColumn(event.target.value)}>
            <option value="">Choose a column</option>
            {headers.map((header) => (
              <option key={header} value={header}>{header}</option>
            ))}
          </select>
        </label>
        <button type="button" className="secondary-action" style={{ alignSelf: 'end' }} onClick={() => setRefreshTick((value) => value + 1)}>
          Refresh insights
        </button>
      </div>

      {!stats ? (
        <div className="empty-section" style={{ padding: '28px 20px' }}>
          <p>Select a column to see data statistics.</p>
        </div>
      ) : (
        <div className="stat-cards" style={{ marginTop: '24px' }}>
          <div className="stat-card">
            <strong>{stats.total.toLocaleString()}</strong>
            <span>Non-empty values</span>
          </div>
          <div className="stat-card">
            <strong>{stats.unique.toLocaleString()}</strong>
            <span>Unique values</span>
          </div>
          <div className="stat-card">
            <strong>{stats.empty.toLocaleString()}</strong>
            <span>Empty cells</span>
          </div>
          <div className="stat-card">
            <strong>{formatNumber(stats.min)}</strong>
            <span>Minimum value</span>
          </div>
          <div className="stat-card">
            <strong>{formatNumber(stats.max)}</strong>
            <span>Maximum value</span>
          </div>
          <div className="stat-card">
            <strong>{formatNumber(stats.average)}</strong>
            <span>Average value</span>
          </div>
        </div>
      )}
    </section>
  )
}
