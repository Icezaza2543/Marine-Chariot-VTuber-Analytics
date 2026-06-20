import { afterEach, describe, expect, it, vi } from 'vitest'
import { loadMarineData } from './loadMarineData'

const header =
  'No,Urls,Video Name,View,Like,Comm,published_date,duration,minute,type,Engagement Rate,AVG View Duration,Views to Likes Ratio'

describe('loadMarineData', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('parses, normalizes, sorts, and scores CSV rows', async () => {
    const csv = [
      header,
      '2,https://youtu.be/beta456,Marine Beta FreeTalk,"2,000",200,20,2026-02-01,00:45:00,45,free talk,0.11,0.08,10',
      '1,https://www.youtube.com/watch?v=alpha123,Marine Alpha ASMR,1000,100,10,2026-01-01,00:30:00,30,Gaming,0.10,0.06,10',
    ].join('\n')

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(csv, { status: 200 })),
    )

    const records = await loadMarineData()

    expect(records.map((record) => record.id)).toEqual([1, 2])
    expect(records[0]).toMatchObject({
      contentType: 'ASMR',
      views: 1000,
      likes: 100,
      comments: 10,
      uploadYear: 2026,
      uploadMonth: 1,
    })
    expect(records[1].contentType).toBe('FreeTalk')
    expect(records.every((record) => record.viralScore > 0)).toBe(true)
  })

  it('throws a clear validation error when required CSV columns are missing', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('No,Urls\n1,https://youtu.be/missing', { status: 200 })),
    )

    await expect(loadMarineData()).rejects.toThrow(/missing required CSV fields/i)
  })
})
