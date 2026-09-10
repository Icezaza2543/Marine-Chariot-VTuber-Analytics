import { describe, expect, it } from 'vitest'
import { parseMarineCsv } from './parseMarineCsv'

const header =
  'No,Urls,Video Name,View,Like,Comm,published_date,duration,minute,type,Engagement Rate,AVG View Duration,Views to Likes Ratio'
const complete =
  '1,https://youtu.be/alpha123,Marine Alpha,1000,100,10,2026-01-01,00:30:00,30,Gaming,0.11,0.06,10'
const pending = ',https://youtu.be/pending,Pending video,,,,2026-09-09,,,,,,'

describe('shared CSV validation', () => {
  it('excludes incomplete rows without inventing zero metrics', () => {
    const result = parseMarineCsv([header, pending, complete].join('\n'), 'test')
    expect(result.skippedRows).toBe(1)
    expect(result.records).toHaveLength(1)
    expect(result.records[0].views).toBe(1000)
    expect(result.rows).toHaveLength(1)
  })

  it('rejects all-incomplete and empty datasets so they cannot replace a valid snapshot', () => {
    expect(() => parseMarineCsv([header, pending].join('\n'), 'test')).toThrow(
      /no complete data rows/,
    )
    expect(() => parseMarineCsv(header, 'test')).toThrow(/no complete data rows/)
  })

  it('preserves the source row number for malformed complete records after skipped rows', () => {
    expect(() =>
      parseMarineCsv([header, pending, complete.replace(',1000,', ',invalid,')].join('\n'), 'test'),
    ).toThrow(/invalid View at row 3/)
  })

  it('retains real zero values', () => {
    const result = parseMarineCsv(
      [header, complete.replace(',1000,100,10,', ',0,0,0,')].join('\n'),
      'test',
    )
    expect(result.skippedRows).toBe(0)
    expect(result.records[0]).toMatchObject({ views: 0, likes: 0, comments: 0 })
  })
})
