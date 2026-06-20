import { describe, expect, it } from 'vitest'
import { buildAnalytics, filterRecords } from './analytics'
import { DEFAULT_FILTERS } from '../store/useDashboardStore'
import type { XDataset } from '../types'
import { videoRecord } from '../test/factories'

describe('filterRecords', () => {
  it('filters by date, type, search, and tag together', () => {
    const records = [
      videoRecord({
        id: 1,
        title: 'Marine horror game night',
        contentType: 'Gaming',
        tags: ['Gaming', 'Horror'],
        publishedAt: new Date('2026-01-15T00:00:00.000Z'),
        publishedDate: '2026-01-15',
        uploadMonth: 1,
      }),
      videoRecord({
        id: 2,
        title: 'Marine free talk',
        contentType: 'FreeTalk',
        tags: ['FreeTalk'],
        publishedAt: new Date('2026-02-10T00:00:00.000Z'),
        publishedDate: '2026-02-10',
        uploadMonth: 2,
      }),
    ]

    const filtered = filterRecords(records, {
      ...DEFAULT_FILTERS,
      dateStart: '2026-01-01',
      dateEnd: '2026-01-31',
      contentTypes: ['Gaming'],
      search: 'horror',
      tag: 'horror',
    })

    expect(filtered.map((record) => record.id)).toEqual([1])
  })
})

describe('buildAnalytics', () => {
  it('builds top videos, forecasts, content metrics, and social matches', () => {
    const records = [
      videoRecord({
        id: 1,
        url: 'https://www.youtube.com/watch?v=alpha123',
        title: 'Marine Chariot Alpha Stream',
        views: 1000,
        likes: 100,
        comments: 15,
        viralScore: 55,
        publishedAt: new Date('2026-01-01T00:00:00.000Z'),
        publishedDate: '2026-01-01',
      }),
      videoRecord({
        id: 2,
        url: 'https://youtu.be/beta456',
        title: 'Marine Chariot Beta ASMR',
        contentType: 'ASMR',
        tags: ['ASMR'],
        views: 2500,
        likes: 240,
        comments: 40,
        viralScore: 88,
        publishedAt: new Date('2026-02-01T00:00:00.000Z'),
        publishedDate: '2026-02-01',
        uploadMonth: 2,
        uploadWeek: 5,
      }),
    ]
    const xData: XDataset = {
      sourceUrl: 'https://x.com/MarineChariot',
      fetchedAt: '2026-02-02T00:00:00.000Z',
      profile: null,
      posts: [
        {
          id: 'post-1',
          url: 'https://x.com/MarineChariot/status/post-1',
          text: 'Watch Marine Chariot Beta ASMR https://youtu.be/beta456',
          createdAt: '2026-02-02T00:00:00.000Z',
          lang: 'en',
          conversationId: 'post-1',
          likeCount: 20,
          repostCount: 5,
          replyCount: 2,
          quoteCount: 1,
          bookmarkCount: 0,
          impressionCount: 500,
          engagementCount: 28,
          hashtags: ['MarineChariot'],
          urls: [
            {
              url: 'https://t.co/beta',
              expandedUrl: 'https://youtu.be/beta456',
              displayUrl: 'youtu.be/beta456',
              title: 'Marine Chariot Beta ASMR',
              description: '',
            },
          ],
          referencedTweets: [],
        },
      ],
      meta: {
        status: 'ok',
      },
    }

    const analytics = buildAnalytics(
      records,
      DEFAULT_FILTERS,
      10,
      { key: 'viralScore', direction: 'desc' },
      xData,
    )

    expect(analytics.topVideos.map((record) => record.id)).toEqual([2, 1])
    expect(analytics.contentMetrics.map((metric) => metric.contentType)).toContain('ASMR')
    expect(analytics.forecast).toHaveLength(6)
    expect(analytics.social.status).toBe('ready')
    expect(analytics.social.videoMatches[0]).toMatchObject({
      videoId: 2,
      matchedPostCount: 1,
    })
  })
})
