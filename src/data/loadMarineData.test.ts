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

    const snapshot = await loadMarineData()
    const records = snapshot.records

    expect(snapshot.source).toBe('live')
    expect(snapshot.newestPublishedDate).toBe('2026-02-01')
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

  it('uses the local snapshot when the live source is unavailable', async () => {
    const csv = [
      header,
      '1,https://youtu.be/alpha123,Marine Alpha,1000,100,10,2026-01-01,00:30:00,30,Gaming,0.11,0.06,10',
    ].join('\n')
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('unavailable', { status: 503 }))
      .mockResolvedValueOnce(new Response(csv, { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    const snapshot = await loadMarineData()

    expect(snapshot.source).toBe('fallback')
    expect(snapshot.sourcePath).toBe('/data/marine-ch-data.csv')
    expect(snapshot.records).toHaveLength(1)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('rejects invalid numeric metrics instead of silently replacing them with zero', async () => {
    const csv = [
      header,
      '1,https://youtu.be/alpha123,Marine Alpha,not-a-number,100,10,2026-01-01,00:30:00,30,Gaming,0.11,0.06,10',
    ].join('\n')

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(csv, { status: 200 })),
    )

    await expect(loadMarineData()).rejects.toThrow(/invalid View at row 2/i)
  })

  it.each([
    'No,Urls\n1,https://youtu.be/broken',
    header,
    `${header}\n1,https://youtu.be/a,Alpha,bad,1,1,2026-01-01,30,30,Gaming,1,1,1`,
  ])('falls back when a successful HTTP response contains unusable CSV', async (badCsv) => {
    const goodCsv = `${header}\n1,https://youtu.be/a,Alpha,100,1,1,2026-01-01,30,30,Gaming,1,1,1`
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(badCsv))
      .mockResolvedValueOnce(new Response(goodCsv))
    vi.stubGlobal('fetch', fetchMock)
    expect((await loadMarineData()).source).toBe('fallback')
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('does not start a fallback request after cancellation', async () => {
    const controller = new AbortController()
    controller.abort()
    const fetchMock = vi.fn().mockRejectedValue(new DOMException('Cancelled', 'AbortError'))
    vi.stubGlobal('fetch', fetchMock)
    await expect(loadMarineData(controller.signal)).rejects.toThrow('Cancelled')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('falls back after a request timeout', async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new DOMException('Timed out', 'TimeoutError'))
      .mockResolvedValueOnce(
        new Response(`${header}\n1,https://youtu.be/a,Alpha,100,1,1,2026-01-01,30,30,Gaming,1,1,1`),
      )
    vi.stubGlobal('fetch', fetchMock)
    expect((await loadMarineData()).source).toBe('fallback')
  })
})
