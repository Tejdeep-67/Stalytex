import type { Database, SqlJsStatic } from 'sql.js'
import { Row } from '../types'
import { isNumericColumn, toNumber } from './numbers'

export type ColumnType = 'INTEGER' | 'REAL' | 'TEXT'

export function inferColumnType(values: string[]): ColumnType {
  if (!isNumericColumn(values)) return 'TEXT'
  return values.every((v) => {
    const n = toNumber(v)
    return n === null || Number.isInteger(n)
  }) ? 'INTEGER' : 'REAL'
}

const quoteIdent = (name: string) => `"${name.replace(/"/g, '""')}"`

// Loads the rows into a fresh in-memory SQLite table called "dataset" (plus a "data" view).
// Numeric columns get a numeric type and blank cells become NULL, otherwise SQLite
// compares numbers as text ('999' > '1000') and AVG() counts blanks as 0.
export function buildDatabase(SQL: SqlJsStatic, headers: string[], rows: Row[]): { db: Database; types: ColumnType[] } {
  const db = new SQL.Database()
  const types = headers.map((h) => inferColumnType(rows.map((r) => r[h] ?? '')))
  const columns = headers.map((h, i) => `${quoteIdent(h)} ${types[i]}`).join(', ')
  db.run(`CREATE TABLE dataset (${columns});`)
  db.run('CREATE VIEW data AS SELECT * FROM dataset;')

  const placeholders = headers.map(() => '?').join(', ')
  const insert = db.prepare(`INSERT INTO dataset VALUES (${placeholders});`)
  db.run('BEGIN')
  try {
    for (const row of rows) {
      insert.run(headers.map((h, i) => {
        const raw = row[h] ?? ''
        if (raw.trim() === '') return null
        return types[i] === 'TEXT' ? raw : toNumber(raw)
      }))
    }
    db.run('COMMIT')
  } catch (error) {
    db.run('ROLLBACK')
    throw error
  } finally {
    insert.free()
  }
  return { db, types }
}

export type QueryResult = {
  columns: string[]
  values: unknown[][]
}

// Runs everything the user typed and returns the last statement that produced rows.
export function runQuery(db: Database, sql: string): QueryResult | null {
  const results = db.exec(sql)
  if (!results.length) return null
  const last = results[results.length - 1]
  return { columns: last.columns, values: last.values }
}
