import { beforeAll, describe, expect, it } from 'vitest'
import initSqlJs, { SqlJsStatic } from 'sql.js'
import { buildDatabase, inferColumnType, runQuery } from './sql'
import { toNumber } from './numbers'

let SQL: SqlJsStatic
beforeAll(async () => {
  SQL = await initSqlJs()
})

describe('toNumber', () => {
  it('reads normal and comma formatted numbers', () => {
    expect(toNumber(' 42 ')).toBe(42)
    expect(toNumber('1,234.50')).toBe(1234.5)
    expect(toNumber('-0.5')).toBe(-0.5)
    expect(toNumber('1e3')).toBe(1000)
  })
  it('rejects blanks and junk', () => {
    expect(toNumber('')).toBeNull()
    expect(toNumber('N/A')).toBeNull()
    expect(toNumber('0x1A')).toBeNull()
    expect(toNumber('12,34')).toBeNull()
    expect(toNumber('Infinity')).toBeNull()
  })
})

describe('sql table', () => {
  const headers = ['city', 'price', 'units']
  const rows = [
    { city: 'Guntur', price: '999', units: '2' },
    { city: 'Vijayawada', price: '1000.5', units: '' },
    { city: 'Guntur', price: '1,200', units: '4' },
  ]

  it('infers column types', () => {
    expect(inferColumnType(['1', '2', ''])).toBe('INTEGER')
    expect(inferColumnType(['1', '2.5'])).toBe('REAL')
    expect(inferColumnType(['1', 'abc'])).toBe('TEXT')
  })

  it('compares numbers as numbers, not text', () => {
    const { db } = buildDatabase(SQL, headers, rows)
    const r = runQuery(db, 'SELECT COUNT(*) FROM dataset WHERE price > 1000')
    expect(r?.values[0][0]).toBe(2)
    const top = runQuery(db, 'SELECT price FROM dataset ORDER BY price DESC LIMIT 1')
    expect(top?.values[0][0]).toBe(1200)
  })

  it('treats blanks as NULL so AVG and COUNT are right', () => {
    const { db } = buildDatabase(SQL, headers, rows)
    const r = runQuery(db, 'SELECT AVG(units), COUNT(units) FROM data')
    expect(r?.values[0]).toEqual([3, 2])
  })

  it('returns the last result when there are several statements', () => {
    const { db } = buildDatabase(SQL, headers, rows)
    const r = runQuery(db, "UPDATE dataset SET city = 'GNT' WHERE city = 'Guntur'; SELECT city, COUNT(*) FROM dataset GROUP BY city ORDER BY city")
    expect(r?.values).toEqual([['GNT', 2], ['Vijayawada', 1]])
  })
})
