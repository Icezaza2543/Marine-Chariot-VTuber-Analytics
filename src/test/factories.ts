import type { VideoRecord } from '../types'

export function videoRecord(overrides: Partial<VideoRecord> = {}): VideoRecord {
  const publishedAt = overrides.publishedAt ?? new Date('2026-01-01T00:00:00.000Z')

  return {
    id: 1,
    url: 'https://www.youtube.com/watch?v=alpha123',
    title: 'Marine Chariot test stream',
    views: 1000,
    likes: 100,
    comments: 10,
    publishedAt,
    publishedDate: publishedAt.toISOString().slice(0, 10),
    duration: '01:00:00',
    minutes: 60,
    contentType: 'Gaming',
    engagementRate: 0.11,
    avgViewDurationRatio: 0.08,
    viewsToLikesRatio: 10,
    tags: ['Gaming'],
    retentionMinutes: 4.8,
    retentionScore: 66.67,
    viralScore: 50,
    uploadYear: publishedAt.getUTCFullYear(),
    uploadMonth: publishedAt.getUTCMonth() + 1,
    uploadWeek: 1,
    weekday: publishedAt.getUTCDay(),
    ...overrides,
  }
}
