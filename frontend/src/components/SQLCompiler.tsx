import { useMemo, useState } from 'react'
import initSqlJs from 'sql.js'
import sqlWasm from 'sql.js/dist/sql-wasm.wasm?url'
import { Row } from '../types'

type Props = {
  headers: string[]
  rows: Row[]
}

export default function SQLCompiler({ headers, rows }: Props) {
  const [query, setQuery] = useState('SELECT * FROM dataset LIMIT 10;')
  const [resultRows, setResultRows] = useState<Record<string, string | number>[]>([])
  const [status, setStatus] = useState('Load a dataset, then run SQL against it in-browser.')
  const [errorMessage, setErrorMessage] = useState('')
  const [isRunning, setIsRunning] = useState(false)

  const canRunQuery = headers.length > 0

  const sampleQuery = useMemo(() => {
    return headers.length
      ? `SELECT ${headers.map((header) => `"${header}"`).join(', ')} FROM dataset LIMIT 10;`
      : 'SELECT * FROM dataset LIMIT 10;'
  }, [headers])

  const runQuery = async () => {
    if (!headers.length) {
      setStatus('Upload a dataset first so the SQL engine has a table to query.')
      return
    }

    setIsRunning(true)
    setStatus('Running SQL…')
    setErrorMessage('')

    try {
      const SQL = await initSqlJs({
        locateFile: () => sqlWasm,
      })

      const db = new SQL.Database()
      const safeHeaders = headers.map((header) => header.replace(/"/g, '""'))
      db.exec(`CREATE TABLE dataset (${safeHeaders.map((header) => `"${header}" TEXT`).join(', ')});`)

      rows.forEach((row) => {
        const values = headers.map((originalHeader) => {
          const value = row[originalHeader] ?? ''
          return `'${String(value).replace(/'/g, "''")}'`
        })
        db.exec(`INSERT INTO dataset ("${safeHeaders.join('", "')}") VALUES (${values.join(', ')});`)
      })

      const sql = (query.trim() || sampleQuery).trim()
      const results = db.exec(sql)

      if (!results.length) {
        setResultRows([])
        setStatus('Query executed successfully but returned no result set.')
        return
      }

      const [result] = results
      const output = result.values.map((valueRow) => Object.fromEntries(
        result.columns.map((column, index) => [column, valueRow[index] ?? ''])
      )) as Record<string, string | number>[]

      setResultRows(output)
      setStatus(`Query returned ${output.length} row${output.length === 1 ? '' : 's'}.`)
    } catch (error) {
      setResultRows([])
      setStatus('SQL execution failed.')
      setErrorMessage(error instanceof Error ? error.message : 'Unknown SQL error.')
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <section className="panel-card">
      <div className="section-header">
        <p className="eyebrow">SQL</p>
        <h2>Run SQL online on your uploaded data</h2>
        <p className="section-copy">
          Execute browser-side SQL queries against the current dataset and inspect the returned rows directly in the app.
        </p>
      </div>

      <div className="sql-shell" style={{ marginTop: '22px' }}>
        <label>
          SQL query
          <textarea
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            rows={8}
            placeholder="SELECT * FROM dataset LIMIT 10;"
          />
        </label>
        <div className="input-row" style={{ marginTop: '12px' }}>
          <button type="button" className="primary-action" onClick={runQuery} disabled={isRunning || !canRunQuery}>
            {isRunning ? 'Running…' : 'Run SQL'}
          </button>
          <button type="button" className="secondary-action" onClick={() => setQuery(sampleQuery)}>
            Load sample query
          </button>
        </div>
        <p className="warning-text" style={{ marginTop: '10px' }}>{status}</p>
        {errorMessage ? <p className="warning-text" style={{ marginTop: '6px' }}>{errorMessage}</p> : null}
      </div>

      <div className="table-shell" style={{ marginTop: '18px' }}>
        {resultRows.length ? (
          <table className="data-table">
            <thead>
              <tr>
                {Object.keys(resultRows[0]).map((key) => (
                  <th key={key}>{key}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {resultRows.map((row, index) => (
                <tr key={`sql-result-${index}`}>
                  {Object.keys(row).map((key) => (
                    <td key={`${index}-${key}`}>{String(row[key] ?? '')}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="empty-section" style={{ minHeight: '180px' }}>
            <p>Run a query to see the output table here.</p>
          </div>
        )}
      </div>
    </section>
  )
}
