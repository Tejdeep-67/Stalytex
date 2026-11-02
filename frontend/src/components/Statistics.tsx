import { useMemo } from 'react'
import { Row } from '../types'
import { ColumnStats, columnStats } from '../lib/stats'

type Props = {
  headers: string[]
  rows: Row[]
  selectedColumn: string
  onSelectColumn: (column: string) => void
}

export function formatNumber(value: number | undefined) {
  if (value === undefined || !Number.isFinite(value)) return '–'
  return value.toLocaleString(undefined, { maximumFractionDigits: Math.abs(value) >= 100 ? 2 : 4 })
}

const pct = (part: number, whole: number) => (whole ? `${((part / whole) * 100).toFixed(1)}%` : '0%')

export default function Statistics({ headers, rows, selectedColumn, onSelectColumn }: Props) {
  const allStats = useMemo(() => {
    const map = new Map<string, ColumnStats>()
    headers.forEach((header) => map.set(header, columnStats(rows.map((row) => row[header] ?? ''))))
    return map
  }, [headers, rows])

  const stats = selectedColumn ? allStats.get(selectedColumn) : undefined

  if (!headers.length) {
    return (
      <section className="panel-card">
        <div className="section-header">
          <p className="eyebrow">Statistics</p>
          <h2>Column analytics</h2>
        </div>
        <div className="empty-section">
          <p>Upload a dataset to see column statistics.</p>
        </div>
      </section>
    )
  }

  const num = stats?.numeric
  const cards: Array<[string, string]> = stats
    ? [
        ['Filled values', stats.filled.toLocaleString()],
        ['Missing', `${stats.missing.toLocaleString()} (${pct(stats.missing, stats.total)})`],
        ['Unique values', stats.unique.toLocaleString()],
        ...(num
          ? ([
              ['Mean', formatNumber(num.mean)],
              ['Median', formatNumber(num.median)],
              ['Std deviation', formatNumber(num.std)],
              ['Minimum', formatNumber(num.min)],
              ['25th percentile', formatNumber(num.q1)],
              ['75th percentile', formatNumber(num.q3)],
              ['Maximum', formatNumber(num.max)],
              ['Sum', formatNumber(num.sum)],
              ['Range', formatNumber(num.max - num.min)],
            ] as Array<[string, string]>)
          : ([
              ['Most common', stats.top[0] ? `${stats.top[0].value}` : '–'],
            ] as Array<[string, string]>)),
      ]
    : []

  const topMax = stats?.top[0]?.count ?? 1

  return (
    <section className="panel-card">
      <div className="section-header">
        <p className="eyebrow">Statistics</p>
        <h2>Column analytics</h2>
        <p className="section-copy">
          Pick a column to see its summary. Number columns get mean, median, spread and percentiles (same method as pandas
          describe()); text columns get their most frequent values.
        </p>
      </div>

      <div className="stats-picker">
        <label className="field">
          Column
          <select value={selectedColumn} onChange={(event) => onSelectColumn(event.target.value)}>
            {headers.map((header) => (
              <option key={header} value={header}>{header}</option>
            ))}
          </select>
        </label>
        {stats ? <span className={`type-badge ${stats.kind}`}>{stats.kind === 'numeric' ? 'Number column' : stats.kind === 'text' ? 'Text column' : 'Empty column'}</span> : null}
      </div>

      {stats ? (
        <div key={selectedColumn} className="fade-in">
          {stats.ignored ? (
            <p className="note-text">{stats.ignored.toLocaleString()} non-numeric value(s) were left out of the number stats.</p>
          ) : null}
          <div className="stat-cards">
            {cards.map(([label, value], index) => (
              <div className="stat-card" key={label} style={{ animationDelay: `${index * 30}ms` }}>
                <strong title={value}>{value}</strong>
                <span>{label}</span>
              </div>
            ))}
          </div>

          {stats.kind === 'text' && stats.top.length ? (
            <div className="top-values">
              <h3>Top values</h3>
              {stats.top.map((item) => (
                <div className="top-row" key={item.value}>
                  <span className="top-label" title={item.value}>{item.value}</span>
                  <span className="top-bar"><span style={{ width: `${(item.count / topMax) * 100}%` }} /></span>
                  <span className="top-count">{item.count.toLocaleString()}</span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="overview">
        <h3>All columns</h3>
        <div className="table-shell">
          <table className="data-table compact">
            <thead>
              <tr>
                <th>Column</th>
                <th>Type</th>
                <th>Missing</th>
                <th>Unique</th>
                <th>Mean</th>
                <th>Median</th>
                <th>Std</th>
                <th>Min</th>
                <th>Max</th>
              </tr>
            </thead>
            <tbody>
              {headers.map((header) => {
                const s = allStats.get(header)!
                return (
                  <tr key={header} className={header === selectedColumn ? 'selected' : ''} onClick={() => onSelectColumn(header)}>
                    <td><button type="button" className="row-link" onClick={() => onSelectColumn(header)}>{header}</button></td>
                    <td>{s.kind}</td>
                    <td>{s.missing.toLocaleString()}</td>
                    <td>{s.unique.toLocaleString()}</td>
                    <td>{formatNumber(s.numeric?.mean)}</td>
                    <td>{formatNumber(s.numeric?.median)}</td>
                    <td>{formatNumber(s.numeric?.std)}</td>
                    <td>{formatNumber(s.numeric?.min)}</td>
                    <td>{formatNumber(s.numeric?.max)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
