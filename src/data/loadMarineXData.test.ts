import { afterEach, describe, expect, it, vi } from 'vitest'
import { loadMarineXData } from './loadMarineXData'

describe('loadMarineXData', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('validates and normalizes cached X posts', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              sourceUrl: 'https://x.com/MarineChariot',
              fetchedAt: '2026-02-02T00:00:00.000Z',
              posts: [
                {
                  id: 123,
                  text: 'New stream',
                  createdAt: '2026-02-02T00:00:00.000Z',
                  likeCount: 3,
                  repostCount: 2,
                  replyCount: 1,
                  quoteCount: 1,
                  bookmarkCount: 1,
                  hashtags: ['MarineChariot'],
                  urls: [],
                },
              ],
              meta: {
                status: 'ok',
                username: 'MarineChariot',
              },
            }),
            { status: 200 },
          ),
      ),
    )

    const dataset = await loadMarineXData()

    expect(dataset.posts[0]).toMatchObject({
      id: '123',
      url: 'https://x.com/MarineChariot/status/123',
      engagementCount: 8,
      hashtags: ['MarineChariot'],
    })
    expect(dataset.meta.status).toBe('ok')
  })

  it('returns an empty dataset with the validation message when cache shape is invalid', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ posts: 'not-an-array' }), { status: 200 })),
    )

    const dataset = await loadMarineXData()

    expect(dataset.posts).toEqual([])
    expect(dataset.meta.status).toBe('empty-cache')
    expect(dataset.meta.message).toMatch(/Invalid X cache shape/i)
  })
})
