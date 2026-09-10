import { describe, expect, it } from 'vitest'
import { parseMarineSheet } from './parseMarineSheet'
import { completeRow, sheetPayload } from '../test/sheetFixture'
const pending = { ...completeRow, View: '', Like: '', Comm: '' }
describe('Google Sheets JSON validation', () => {
  it('excludes incomplete metrics without inventing zeros', () => {
    const result = parseMarineSheet(sheetPayload([pending, completeRow]), 'test')
    expect(result.skippedRows).toBe(1)
    expect(result.records).toHaveLength(1)
  })
  it('keeps row numbers after skipped rows', () => {
    expect(() =>
      parseMarineSheet(sheetPayload([pending, { ...completeRow, View: 'bad' }]), 'test'),
    ).toThrow(/invalid View at row 3/)
  })
  it('preserves zero counts and undefined views-to-likes with zero likes', () => {
    const result = parseMarineSheet(
      sheetPayload([{ ...completeRow, View: 0, Like: 0, Comm: 0, 'Views to Likes Ratio': '' }]),
      'test',
    )
    expect(result.records[0]).toMatchObject({
      views: 0,
      likes: 0,
      comments: 0,
      viewsToLikesRatio: null,
    })
  })
  it('rejects missing columns and retention units that could corrupt analytics', () => {
    expect(() => parseMarineSheet(sheetPayload([{ No: 1 }]), 'test')).toThrow(/invalid row/)
    expect(() =>
      parseMarineSheet({ ...sheetPayload([completeRow]), retention: { unit: 'ratio' } }, 'test'),
    ).toThrow(/Invalid Google Sheets response/)
  })
  it('normalizes types, sorts by date, and scores records', () => {
    const rows = [
      { ...completeRow, No: 2, published_date: '2026-02-01', type: 'free talk' },
      { ...completeRow, 'Video Name': 'Marine ASMR' },
    ]
    const result = parseMarineSheet(sheetPayload(rows), 'test')
    expect(result.records.map((r) => r.id)).toEqual([1, 2])
    expect(result.records.map((r) => r.contentType)).toEqual(['ASMR', 'FreeTalk'])
    expect(result.records.every((r) => r.viralScore > 0)).toBe(true)
  })
})
