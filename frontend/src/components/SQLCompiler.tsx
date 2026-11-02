import { useEffect, useMemo, useRef, useState } from 'react'
import initSqlJs, { Database, SqlJsStatic } from 'sql.js'
import sqlWasm from 'sql.js/dist/sql-wasm.wasm?url'
import { Row } from '../types'
import { buildDatabase, ColumnType, QueryResult, runQuery } from '../lib/sql'

type Props = {
  headers: string[]
  rows: Row[]
}

const MAX_SHOWN = 500

let sqlModule: Promise<SqlJsStatic> | null = null
const loadSql = () => {
  if (!sqlModule) sqlModule = initSqlJs({ locateFile: () => sqlWasm })
  return sqlModule
}

const quote = (name: string) => (/^[A-Za-z_][A-Za-z0-9_]*$/.test(name) ? name : `"${name.replace(/"/g, '""')}"`)

export default function SQLCompiler({ headers, rows }: Props) {
  const [query, setQuery] = useState('SELECT * FROM dataset LIMIT 10;')
  const [result, setResult] = useState<QueryResult | null>(null)
  const [status, setStatus] = useState('Load a dataset, then run SQL against it in-browser.')
  const [errorMessage, setErrorMessage] = useState('')
  const [isRunning, setIsRunning] = useState(false)
  const [types, setTypes] = useState<ColumnType[]>([])
  const dbRef = useRef<{ db: Database; rows: Row[]; headers: string[] } | null>(null)

  const canRunQuery = headers.length > 0

  // the table is rebuilt lazily, only when the data changed since the last run
  useEffect(() => () => {
    dbRef.current?.db.close()
    dbRef.current = null
  }, [])

  const sampleQuery = useMemo(() => {
    return headers.length
      ? `SELECT ${headers.slice(0, 6).map(quote).join(', ')}\nFROM dataset\nLIMIT 10;`
      : 'SELECT * FROM dataset LIMIT 10;'
  }, [headers])

  const getDatabase = async () => {
    const cached = dbRef.current
    if (cached && cached.rows === rows && cached.headers === headers) return cached.db
    cached?.db.close()
    const SQL = await loadSql()
    const built = buildDatabase(SQL, headers, rows)
    dbRef.current = { db: built.db, rows, headers }
    setTypes(built.types)
    return built.db
  }

  const run = async () => {
    if (!headers.length) {
      setStatus('Upload a dataset first so the SQL engine has a table to query.')
      return
    }

    setIsRunning(true)
    setStatus('Running SQL…')
    setErrorMessage('')

    try {
      const db = await getDatabase()
      const started = performance.now()
      const output = runQuery(db, query.trim() || sampleQuery)
      const ms = Math.round(performance.now() - started)
      setResult(output)

      if (!output) {
        setStatus(`Query ran in ${ms} ms but returned no rows.`)
      } else {
        const count = output.values.length
        const shown = count > MAX_SHOWN ? ` (showing the first ${MAX_SHOWN})` : ''
        setStatus(`${count.toLocaleString()} row${count === 1 ? '' : 's'} in ${ms} ms${shown}.`)
      }
    } catch (error) {
      setResult(null)
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
        <h2>Run SQL on your uploaded data</h2>
        <p className="section-copy">
          Your data is loaded into an in-browser SQLite table called <code>dataset</code> (or <code>data</code>).
          Number columns are stored as numbers and empty cells as NULL. Queries don&apos;t change the table in the editor.
        </p>
      </div>

      {headers.length ? (
        <div className="schema-list" aria-label="Table columns">
          {headers.map((header, index) => (
            <button type="button" key={header} className="schema-chip" title="Insert column name" onClick={() => setQuery((q) => `${q.trimEnd()} ${quote(header)}`)}>
              {header}
              {types[index] ? <span>{types[index].toLowerCase()}</span> : null}
            </button>
          ))}
        </div>
      ) : null}

      <div className="sql-shell">
        <label>
          SQL query
          <textarea
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
                event.preventDefault()
                void run()
              }
            }}
            rows={7}
            spellCheck={false}
            placeholder="SELECT * FROM dataset LIMIT 10;"
          />
        </label>
        <div className="input-row sql-actions">
          <button type="button" className="primary-action" onClick={run} disabled={isRunning || !canRunQuery}>
            {isRunning ? 'Running…' : 'Run SQL'}
          </button>
          <button type="button" className="secondary-action" onClick={() => setQuery(sampleQuery)} disabled={!canRunQuery}>
            Load sample query
          </button>
          <small className="hint">Ctrl + Enter runs the query</small>
        </div>
        <p className="status-text" role="status">{status}</p>
        {errorMessage ? <p className="warning-text">{errorMessage}</p> : null}
      </div>

      <div className="table-shell">
        {result && result.values.length ? (
          <table className="data-table result-table">
            <thead>
              <tr>
                {result.columns.map((column, index) => (
                  <th key={`${column}-${index}`}>{column}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.values.slice(0, MAX_SHOWN).map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((value, colIndex) => (
                    <td key={colIndex} className={value === null ? 'null-cell' : undefined}>
                      {value === null ? 'NULL' : String(value)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="empty-section">
            <p>{canRunQuery ? 'Run a query to see the output table here.' : 'Upload a dataset to start querying.'}</p>
          </div>
        )}
      </div>
    </section>
  )
}
