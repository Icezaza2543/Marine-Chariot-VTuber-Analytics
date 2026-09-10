import { afterEach, describe, expect, it, vi } from 'vitest'
import { loadMarineData } from './loadMarineData'

import { sheetPayload, completeRow } from '../test/sheetFixture'

const payload = sheetPayload([completeRow])

describe('loadMarineData', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('loads numeric JSON cells and converts estimated minutes into a ratio', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json(payload)),
    )
    const snapshot = await loadMarineData()
    expect(snapshot.source).toBe('live')
    expect(snapshot.updatedAt).toBe(payload.updatedAt)
    expect(snapshot.records[0]).toMatchObject({
      views: 1000,
      retentionMinutes: 13.5,
      avgViewDurationRatio: 0.45,
    })
  })

  it.each([
    {},
    { error: 'refresh_in_progress' },
    sheetPayload([]),
    sheetPayload([{ ...completeRow, View: 'bad' }]),
  ])('falls back for invalid JSON data', async (invalid) => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json(invalid))
      .mockResolvedValueOnce(Response.json(payload))
    vi.stubGlobal('fetch', fetchMock)
    const snapshot = await loadMarineData()
    expect(snapshot.source).toBe('fallback')
    expect(snapshot.sourcePath).toBe('/data/marine-sheet.json')
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('reports both sources failing', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('down', { status: 503 })),
    )
    await expect(loadMarineData()).rejects.toThrow(/Primary source failed.*Local fallback failed/)
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
      .mockResolvedValueOnce(Response.json(payload))
    vi.stubGlobal('fetch', fetchMock)
    expect((await loadMarineData()).source).toBe('fallback')
  })
})
