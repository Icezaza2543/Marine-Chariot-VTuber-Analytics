import { differenceInCalendarDays, format, getMonth, parseISO } from 'date-fns'
import { thaiMonthLabel } from '../format'
import type { SocialAnalytics, SocialVideoMatch, VideoRecord, XDataset, XPost } from '../../types'
import { clamp, safeDivide, sum } from './math'

export function buildSocialAnalytics(records: VideoRecord[], xData?: XDataset): SocialAnalytics {
  const posts = xData?.posts ?? []
  const sourceUrl = xData?.sourceUrl ?? 'https://x.com/MarineChariot'

  if (posts.length === 0) {
    return {
      sourceUrl,
      fetchedAt: xData?.fetchedAt ?? null,
      status: 'empty',
      statusMessage: xData?.meta?.message ?? 'ยังไม่มีโพสต์ X ใน cache',
      profile: xData?.profile ?? null,
      postCount: 0,
      totalEngagement: 0,
      avgEngagement: 0,
      estimatedReach: 0,
      crossPromoPostCount: 0,
      crossPromoRate: 0,
      topPost: null,
      topHashtags: [],
      monthlyMetrics: [],
      videoMatches: [],
      strategicInsight: `ยังไม่มีข้อมูล X สด ให้รัน npm run fetch:x แล้ว deploy ใหม่เพื่อผสม social signal จาก ${sourceUrl}`,
    }
  }

  const totalEngagement = sum(posts.map((post) => post.engagementCount))
  const estimatedReach = sum(posts.map((post) => estimatePostReach(post)))
  const topPost = [...posts].sort((a, b) => b.engagementCount - a.engagementCount)[0] ?? null
  const crossPromoPosts = posts.filter(isCrossPromoPost)
  const topHashtags = buildHashtagMetrics(posts)
  const monthlyMetrics = buildSocialMonthlyMetrics(posts)
  const videoMatches = buildSocialVideoMatches(records, posts)
  const bestMatch = videoMatches[0]
  const strategicInsight = bestMatch
    ? `สัญญาณจาก X ชี้ว่าคลิป "${bestMatch.title}" มี social lift ${bestMatch.liftScore.toFixed(1)} จาก ${bestMatch.matchedPostCount} โพสต์ ควรใช้เป็นต้นแบบ cross-promo`
    : `X มี ${posts.length} โพสต์ แต่ยังจับคู่กับวิดีโอใน filter นี้ได้น้อย ควรใส่ YouTube URL หรือ keyword ชื่อเกม/ซีรีส์ในโพสต์ให้ชัดขึ้น`

  return {
    sourceUrl,
    fetchedAt: xData?.fetchedAt ?? null,
    status: 'ready',
    statusMessage: `โหลดโพสต์ X แล้ว ${posts.length} รายการ`,
    profile: xData?.profile ?? null,
    postCount: posts.length,
    totalEngagement,
    avgEngagement: safeDivide(totalEngagement, posts.length),
    estimatedReach,
    crossPromoPostCount: crossPromoPosts.length,
    crossPromoRate: safeDivide(crossPromoPosts.length, posts.length),
    topPost,
    topHashtags,
    monthlyMetrics,
    videoMatches,
    strategicInsight,
  }
}

function buildHashtagMetrics(posts: XPost[]) {
  const counts = posts.reduce((map, post) => {
    for (const tag of post.hashtags) {
      const normalized = tag.toLowerCase()
      map.set(normalized, (map.get(normalized) ?? 0) + 1)
    }

    return map
  }, new Map<string, number>())

  return Array.from(counts.entries())
    .map(([tag, count]) => ({ tag: `#${tag}`, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6)
}

function buildSocialMonthlyMetrics(posts: XPost[]) {
  const byMonth = posts.reduce((map, post) => {
    const date = parseISO(post.createdAt)

    if (Number.isNaN(date.getTime())) {
      return map
    }

    const key = format(date, 'yyyy-MM')
    const current = map.get(key) ?? {
      key,
      label: `${thaiMonthLabel(getMonth(date) + 1)} ${format(date, 'yy')}`,
      posts: 0,
      engagement: 0,
    }
    current.posts += 1
    current.engagement += post.engagementCount
    map.set(key, current)
    return map
  }, new Map<string, { key: string; label: string; posts: number; engagement: number }>())

  return Array.from(byMonth.values()).sort((a, b) => a.key.localeCompare(b.key))
}

function buildSocialVideoMatches(records: VideoRecord[], posts: XPost[]): SocialVideoMatch[] {
  const maxEngagement = Math.max(...posts.map((post) => post.engagementCount), 1)

  return records
    .map((record) => {
      const matches = posts.filter((post) => isPostVideoMatch(record, post))
      const socialEngagement = sum(matches.map((post) => post.engagementCount))
      const estimatedReach = sum(matches.map((post) => estimatePostReach(post)))
      const topPost = [...matches].sort((a, b) => b.engagementCount - a.engagementCount)[0]
      const socialScore = clamp((socialEngagement / maxEngagement) * 35, 0, 35)

      return {
        videoId: record.id,
        title: record.title,
        publishedDate: record.publishedDate,
        contentType: record.contentType,
        matchedPostCount: matches.length,
        socialEngagement,
        estimatedReach,
        liftScore: clamp(record.viralScore * 0.65 + socialScore, 0, 100),
        topPostText: topPost?.text ?? '',
        topPostUrl: topPost?.url ?? '',
      }
    })
    .filter((match) => match.matchedPostCount > 0)
    .sort((a, b) => b.liftScore - a.liftScore)
    .slice(0, 8)
}

function isPostVideoMatch(record: VideoRecord, post: XPost) {
  const text = `${post.text} ${post.urls.map((url) => `${url.expandedUrl} ${url.title}`).join(' ')}`.toLowerCase()
  const videoId = extractYouTubeId(record.url)
  const postDate = parseISO(post.createdAt)
  const dayDistance = Number.isNaN(postDate.getTime())
    ? Number.POSITIVE_INFINITY
    : Math.abs(differenceInCalendarDays(postDate, record.publishedAt))
  const hasVideoUrl = videoId.length > 0 && text.includes(videoId.toLowerCase())
  const hasYouTubeUrl = /youtube\.com|youtu\.be/.test(text)
  const keywordHits = titleKeywords(record.title).filter((keyword) => text.includes(keyword)).length

  return hasVideoUrl || (dayDistance <= 3 && (hasYouTubeUrl || keywordHits >= 2))
}

function isCrossPromoPost(post: XPost) {
  const text = `${post.text} ${post.urls.map((url) => url.expandedUrl).join(' ')}`.toLowerCase()
  return /youtube\.com|youtu\.be|stream|live|shorts|配信|動画|ไลฟ์|คลิป|เกม|ร้องเพลง|asmr/.test(text)
}

function estimatePostReach(post: XPost) {
  return post.impressionCount > 0 ? post.impressionCount : post.engagementCount * 12
}

function extractYouTubeId(url: string) {
  const match = url.match(/[?&]v=([^&]+)/) ?? url.match(/youtu\.be\/([^?&]+)/)
  return match?.[1] ?? ''
}

function titleKeywords(title: string) {
  return title
    .toLowerCase()
    .replace(/[【】\[\]().|]/g, ' ')
    .split(/\s+/)
    .map((part) => part.trim())
    .filter((part) => part.length >= 4)
    .slice(0, 8)
}
