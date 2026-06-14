import {
  addMonths,
  compareAsc,
  differenceInCalendarDays,
  eachMonthOfInterval,
  format,
  getMonth,
  isWithinInterval,
  parseISO,
  startOfMonth,
  subDays,
} from 'date-fns'
import { compactNumber, minutesLabel, percent, thaiMonthLabel } from './format'
import type {
  AnalyticsBundle,
  ContentTypeMetric,
  DashboardFilters,
  DurationBucketMetric,
  EngagementMixMetric,
  ForecastPoint,
  HeatmapCell,
  KpiValue,
  MetricKey,
  MonthlyMetric,
  ScatterPoint,
  StrategyInsight,
  TableSort,
  VideoRecord,
  YearlyMetric,
  XDataset,
  XPost,
  SocialAnalytics,
  SocialVideoMatch,
} from '../types'

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const HEATMAP_SLOTS = ['12:00 Shorts', '18:00 Compact', '20:00 Prime', '22:00 Long']

export function buildAnalytics(
  records: VideoRecord[],
  filters: DashboardFilters,
  topLimit: 10 | 20,
  tableSort: TableSort,
  xData?: XDataset,
): AnalyticsBundle {
  const allContentTypes = unique(records.map((record) => record.contentType))
  const allYears = unique(records.map((record) => record.uploadYear)).sort((a, b) => b - a)
  const allMonths = Array.from({ length: 12 }, (_, index) => index + 1)
  const allWeeks = unique(records.map((record) => record.uploadWeek)).sort((a, b) => a - b)
  const filteredRecords = filterRecords(records, filters)
  const previousRecords = getPreviousPeriodRecords(records, filters)
  const kpis = buildKpis(filteredRecords, previousRecords)
  const monthlyMetrics = buildMonthlyMetrics(filteredRecords)
  const forecast = buildForecast(monthlyMetrics)
  const contentMetrics = buildContentMetrics(filteredRecords)
  const yearlyMetrics = buildYearlyMetrics(filteredRecords)
  const engagementMix = buildEngagementMix(filteredRecords)
  const durationMetrics = buildDurationMetrics(filteredRecords)
  const scatterPoints = buildScatterPoints(filteredRecords)
  const heatmap = buildHeatmap(filteredRecords)
  const topVideos = sortVideos(filteredRecords, tableSort).slice(0, topLimit)
  const social = buildSocialAnalytics(filteredRecords, xData)
  const nextContentRecommendation = contentMetrics[0] ?? null
  const bestPostingSlot = heatmap.reduce<HeatmapCell | null>(
    (best, cell) => (cell.score > (best?.score ?? -1) ? cell : best),
    null,
  )
  const projectedGrowthRate = computeProjectedGrowth(monthlyMetrics, forecast)
  const optimalFrequency = buildOptimalFrequency(filteredRecords)
  const insights = buildInsights({
    filteredRecords,
    monthlyMetrics,
    contentMetrics,
    durationMetrics,
    forecast,
    bestPostingSlot,
    nextContentRecommendation,
    projectedGrowthRate,
    optimalFrequency,
    social,
  })
  const sectionInsights = buildSectionInsights({
    contentMetrics,
    durationMetrics,
    forecast,
    bestPostingSlot,
    topVideos,
    projectedGrowthRate,
    social,
  })

  return {
    records,
    filteredRecords,
    social,
    kpis,
    monthlyMetrics,
    forecast,
    contentMetrics,
    yearlyMetrics,
    engagementMix,
    durationMetrics,
    scatterPoints,
    heatmap,
    topVideos,
    allContentTypes,
    allYears,
    allMonths,
    allWeeks,
    nextContentRecommendation,
    optimalFrequency,
    bestPostingSlot,
    projectedGrowthRate,
    insights,
    sectionInsights,
  }
}

export function filterRecords(records: VideoRecord[], filters: DashboardFilters) {
  const search = filters.search.trim().toLowerCase()
  const tag = filters.tag.trim().toLowerCase()
  const selectedTypes = new Set(filters.contentTypes)
  const selectedYears = new Set(filters.years)
  const selectedMonths = new Set(filters.months)
  const selectedWeeks = new Set(filters.weeks)
  const startDate = filters.dateStart ? parseISO(filters.dateStart) : null
  const endDate = filters.dateEnd ? parseISO(filters.dateEnd) : null

  return records.filter((record) => {
    const matchesDateStart = !startDate || record.publishedAt >= startDate
    const matchesDateEnd = !endDate || record.publishedAt <= endDate
    const matchesType = selectedTypes.size === 0 || selectedTypes.has(record.contentType)
    const matchesYear = selectedYears.size === 0 || selectedYears.has(record.uploadYear)
    const matchesMonth = selectedMonths.size === 0 || selectedMonths.has(record.uploadMonth)
    const matchesWeek = selectedWeeks.size === 0 || selectedWeeks.has(record.uploadWeek)
    const searchable = `${record.title} ${record.contentType} ${record.tags.join(' ')}`.toLowerCase()
    const matchesSearch = search.length === 0 || searchable.includes(search)
    const matchesTag = tag.length === 0 || record.tags.some((value) => value.toLowerCase().includes(tag))

    return (
      matchesDateStart &&
      matchesDateEnd &&
      matchesType &&
      matchesYear &&
      matchesMonth &&
      matchesWeek &&
      matchesSearch &&
      matchesTag
    )
  })
}

function getPreviousPeriodRecords(records: VideoRecord[], filters: DashboardFilters) {
  const nonDateFilters = {
    ...filters,
    dateStart: '',
    dateEnd: '',
  }
  const comparableRecords = filterRecords(records, nonDateFilters)

  if (comparableRecords.length === 0) {
    return []
  }

  const currentRecords = filterRecords(records, filters)
  const currentStart = filters.dateStart
    ? parseISO(filters.dateStart)
    : currentRecords[0]?.publishedAt ?? comparableRecords[0].publishedAt
  const currentEnd = filters.dateEnd
    ? parseISO(filters.dateEnd)
    : currentRecords.at(-1)?.publishedAt ?? comparableRecords.at(-1)!.publishedAt
  const span = Math.max(differenceInCalendarDays(currentEnd, currentStart) + 1, 30)
  const previousStart = subDays(currentStart, span)
  const previousEnd = subDays(currentStart, 1)

  return comparableRecords.filter((record) =>
    isWithinInterval(record.publishedAt, {
      start: previousStart,
      end: previousEnd,
    }),
  )
}

function buildKpis(records: VideoRecord[], previousRecords: VideoRecord[]): KpiValue[] {
  const current = summarize(records)
  const previous = summarize(previousRecords)

  return [
    {
      label: 'Total Views',
      value: compactNumber(current.views),
      rawValue: current.views,
      delta: deltaPercent(current.views, previous.views),
      tone: 'pink',
    },
    {
      label: 'Likes',
      value: compactNumber(current.likes),
      rawValue: current.likes,
      delta: deltaPercent(current.likes, previous.likes),
      tone: 'violet',
    },
    {
      label: 'Engagement',
      value: percent(current.avgEngagementRate),
      rawValue: current.avgEngagementRate,
      delta: deltaPercent(current.avgEngagementRate, previous.avgEngagementRate),
      tone: 'cyan',
    },
    {
      label: 'Videos',
      value: compactNumber(current.videos),
      rawValue: current.videos,
      delta: deltaPercent(current.videos, previous.videos),
      tone: 'green',
    },
    {
      label: 'Avg Views / Video',
      value: compactNumber(current.avgViews),
      rawValue: current.avgViews,
      delta: deltaPercent(current.avgViews, previous.avgViews),
      tone: 'amber',
    },
    {
      label: 'Retention Approx.',
      value: `${current.avgRetentionScore.toFixed(1)}`,
      rawValue: current.avgRetentionScore,
      delta: deltaPercent(current.avgRetentionScore, previous.avgRetentionScore),
      tone: 'violet',
    },
  ]
}

function buildMonthlyMetrics(records: VideoRecord[]) {
  if (records.length === 0) {
    return []
  }

  const sortedRecords = [...records].sort((a, b) => compareAsc(a.publishedAt, b.publishedAt))
  const months = eachMonthOfInterval({
    start: startOfMonth(sortedRecords[0].publishedAt),
    end: startOfMonth(sortedRecords.at(-1)!.publishedAt),
  })
  let cumulativeViews = 0
  let cumulativeLikes = 0

  return months.map<MonthlyMetric>((date) => {
    const key = format(date, 'yyyy-MM')
    const monthRecords = sortedRecords.filter((record) => format(record.publishedAt, 'yyyy-MM') === key)
    const summary = summarize(monthRecords)
    cumulativeViews += summary.views
    cumulativeLikes += summary.likes

    return {
      key,
      label: `${thaiMonthLabel(getMonth(date) + 1)} ${format(date, 'yy')}`,
      date,
      views: summary.views,
      likes: summary.likes,
      comments: summary.comments,
      videos: summary.videos,
      engagementRate: summary.avgEngagementRate,
      cumulativeViews,
      cumulativeLikes,
    }
  })
}

function buildForecast(monthlyMetrics: MonthlyMetric[]) {
  if (monthlyMetrics.length === 0) {
    return []
  }

  const views = monthlyMetrics.map((metric) => metric.views)
  const likes = monthlyMetrics.map((metric) => metric.likes)
  const engagement = monthlyMetrics.map((metric) => metric.engagementRate)
  const linearViews = linearRegressionForecast(views, 6)
  const smoothViews = exponentialSmoothingForecast(views, 6)
  const linearLikes = linearRegressionForecast(likes, 6)
  const smoothLikes = exponentialSmoothingForecast(likes, 6)
  const linearEngagement = linearRegressionForecast(engagement, 6)
  const smoothEngagement = exponentialSmoothingForecast(engagement, 6)
  const lastMonth = monthlyMetrics.at(-1)!.date

  return Array.from({ length: 6 }, (_, index): ForecastPoint => {
    const date = addMonths(lastMonth, index + 1)

    return {
      key: format(date, 'yyyy-MM'),
      label: `${thaiMonthLabel(getMonth(date) + 1)} ${format(date, 'yy')}`,
      views: Math.max(0, Math.round((linearViews[index] + smoothViews[index]) / 2)),
      likes: Math.max(0, Math.round((linearLikes[index] + smoothLikes[index]) / 2)),
      engagementRate: clamp((linearEngagement[index] + smoothEngagement[index]) / 2, 0, 1),
      linearViews: Math.max(0, Math.round(linearViews[index])),
      smoothedViews: Math.max(0, Math.round(smoothViews[index])),
    }
  })
}

function buildContentMetrics(records: VideoRecord[]) {
  const byType = groupBy(records, (record) => record.contentType)
  const metrics = Array.from(byType.entries()).map<ContentTypeMetric>(([contentType, values]) => {
    const summary = summarize(values)
    const monthly = buildMonthlyMetrics(values)
    const bestMonthMetric = [...monthly].sort((a, b) => b.views - a.views)[0]
    const growthRate = growthFromRecentMonths(monthly)

    return {
      contentType,
      videos: summary.videos,
      views: summary.views,
      likes: summary.likes,
      comments: summary.comments,
      avgViews: summary.avgViews,
      avgEngagementRate: summary.avgEngagementRate,
      growthRate,
      bestMonth: bestMonthMetric?.label ?? '-',
      avgRetentionScore: summary.avgRetentionScore,
      avgViralScore: summary.avgViralScore,
      score: 0,
    }
  })

  return rankContentTypes(metrics)
}

function buildYearlyMetrics(records: VideoRecord[]) {
  const byYear = groupBy(records, (record) => String(record.uploadYear))

  return Array.from(byYear.entries())
    .map<YearlyMetric>(([year, values]) => {
      const summary = summarize(values)

      return {
        year: Number(year),
        videos: summary.videos,
        views: summary.views,
        likes: summary.likes,
        comments: summary.comments,
        avgViews: summary.avgViews,
        engagementRate: summary.avgEngagementRate,
        retentionScore: summary.avgRetentionScore,
        viralScore: summary.avgViralScore,
      }
    })
    .sort((a, b) => a.year - b.year)
}

function buildEngagementMix(records: VideoRecord[]) {
  const byType = groupBy(records, (record) => record.contentType)
  const totalComments = sum(records.map((record) => record.comments))

  return Array.from(byType.entries())
    .map<EngagementMixMetric>(([contentType, values]) => {
      const summary = summarize(values)

      return {
        contentType,
        views: summary.views,
        likes: summary.likes,
        comments: summary.comments,
        likesPerThousandViews: safeDivide(summary.likes, summary.views) * 1000,
        commentsPerThousandViews: safeDivide(summary.comments, summary.views) * 1000,
        conversationShare: safeDivide(summary.comments, totalComments),
      }
    })
    .sort((a, b) => b.likesPerThousandViews + b.commentsPerThousandViews - (a.likesPerThousandViews + a.commentsPerThousandViews))
}

function buildDurationMetrics(records: VideoRecord[]) {
  const byBucket = groupBy(records, (record) => durationBucket(record.minutes))

  return Array.from(byBucket.entries())
    .map<DurationBucketMetric>(([bucket, values]) => {
      const summary = summarize(values)

      return {
        bucket,
        videos: summary.videos,
        avgViews: summary.avgViews,
        avgEngagementRate: summary.avgEngagementRate,
        avgRetentionScore: summary.avgRetentionScore,
      }
    })
    .sort((a, b) => durationBucketOrder(a.bucket) - durationBucketOrder(b.bucket))
}

function buildScatterPoints(records: VideoRecord[]): ScatterPoint[] {
  return records.map((record) => ({
    x: record.minutes,
    y: record.engagementRate * 100,
    r: clamp(record.views / 80, 4, 18),
    title: record.title,
    contentType: record.contentType,
    views: record.views,
    viralScore: record.viralScore,
  }))
}

function buildHeatmap(records: VideoRecord[]) {
  const cells: HeatmapCell[] = []

  for (let weekday = 0; weekday < 7; weekday += 1) {
    for (const slot of HEATMAP_SLOTS) {
      const values = records.filter(
        (record) => record.weekday === weekday && estimateSlot(record) === slot,
      )
      const summary = summarize(values)
      const viewsPerUpload = summary.avgViews
      const score = viewsPerUpload * 0.65 + summary.avgEngagementRate * 10_000 * 0.35

      cells.push({
        weekday,
        weekdayLabel: WEEKDAY_LABELS[weekday],
        slot,
        count: values.length,
        viewsPerUpload,
        engagementRate: summary.avgEngagementRate,
        score,
      })
    }
  }

  return cells
}

function buildOptimalFrequency(records: VideoRecord[]) {
  if (records.length < 2) {
    return 'ต้องมีข้อมูลเพิ่มอีกเล็กน้อยก่อนคำนวณ cadence'
  }

  const byWeek = groupBy(records, (record) => `${record.uploadYear}-W${record.uploadWeek}`)
  const weekSummaries = Array.from(byWeek.values()).map((values) => {
    const summary = summarize(values)
    return {
      count: values.length,
      avgViews: summary.avgViews,
      engagementRate: summary.avgEngagementRate,
    }
  })
  const best = [...weekSummaries].sort(
    (a, b) => b.avgViews * b.engagementRate - a.avgViews * a.engagementRate,
  )[0]

  if (!best) {
    return 'คง cadence ปัจจุบันไว้ก่อน'
  }

  return `${best.count} วิดีโอ/สัปดาห์`
}

function computeProjectedGrowth(monthlyMetrics: MonthlyMetric[], forecast: ForecastPoint[]) {
  const recentActual = monthlyMetrics.slice(-3)
  const nextForecast = forecast.slice(0, 3)
  const recentViews = sum(recentActual.map((metric) => metric.views))
  const projectedViews = sum(nextForecast.map((metric) => metric.views))

  return deltaPercent(projectedViews, recentViews)
}

function buildInsights(input: {
  filteredRecords: VideoRecord[]
  monthlyMetrics: MonthlyMetric[]
  contentMetrics: ContentTypeMetric[]
  durationMetrics: DurationBucketMetric[]
  forecast: ForecastPoint[]
  bestPostingSlot: HeatmapCell | null
  nextContentRecommendation: ContentTypeMetric | null
  projectedGrowthRate: number
  optimalFrequency: string
  social: SocialAnalytics
}): StrategyInsight[] {
  const topContent = input.nextContentRecommendation
  const bestDuration = [...input.durationMetrics].sort((a, b) => b.avgViews - a.avgViews)[0]
  const firstForecast = input.forecast[0]
  const latestMonth = input.monthlyMetrics.at(-1)
  const topVideo = [...input.filteredRecords].sort((a, b) => b.viralScore - a.viralScore)[0]
  const forecastText =
    firstForecast && latestMonth
      ? `เดือนถัดไปคาดการณ์ ${compactNumber(firstForecast.views)} views จากโมเดล regression + smoothing เทียบเดือนล่าสุด ${compactNumber(latestMonth.views)} views`
      : 'ต้องมีข้อมูลรายเดือนเพิ่มเพื่อให้ forecast แข็งแรงขึ้น'

  const insights: StrategyInsight[] = [
    {
      title: 'Growth Pulse',
      body: `${forecastText}; projected growth 3 เดือนอยู่ที่ ${input.projectedGrowthRate.toFixed(1)}%`,
      confidence: 82,
      tone: 'pink',
    },
    {
      title: 'Content Strategy',
      body: topContent
        ? `เดือนถัดไปควรเน้น ${topContent.contentType} เพราะ avg views ${compactNumber(topContent.avgViews)} และ engagement ${percent(topContent.avgEngagementRate)} ยังเด่น`
        : 'ยังไม่มี content type ที่เด่นพอหลัง filter ปัจจุบัน',
      confidence: 86,
      tone: 'violet',
    },
    {
      title: 'Retention Move',
      body: bestDuration
        ? `กลุ่มความยาว ${bestDuration.bucket} ทำผลงานเฉลี่ยดีที่สุด ควรใช้เป็นแม่แบบ pacing และช่วง hook`
        : 'ยังไม่มีข้อมูล duration เพียงพอ',
      confidence: 76,
      tone: 'cyan',
    },
    {
      title: 'Publishing Cadence',
      body: input.bestPostingSlot
        ? `slot ที่ควรทดลองซ้ำคือ ${input.bestPostingSlot.weekdayLabel} ${input.bestPostingSlot.slot}; cadence ที่น่าเก็บต่อคือ ${input.optimalFrequency}`
        : 'ยังหา slot ที่ชัดไม่ได้จาก filter นี้',
      confidence: 69,
      tone: 'green',
    },
    {
      title: 'Viral Lever',
      body: topVideo
        ? `ใช้ ${topVideo.contentType} จากวิดีโอ viral score ${topVideo.viralScore.toFixed(1)} เป็นต้นแบบทำ Shorts cutdown แล้วพาคนกลับไป long-form`
        : 'ยังไม่มีวิดีโอในช่วงที่เลือก',
      confidence: 80,
      tone: 'amber',
    },
  ]

  insights.push({
    title: 'X Signal',
    body:
      input.social.status === 'ready'
        ? `X มี ${input.social.postCount} posts, engagement รวม ${compactNumber(input.social.totalEngagement)} และ cross-promo rate ${percent(input.social.crossPromoRate)}; ใช้ post ที่พูดถึงไลฟ์/YouTube เป็นตัวเร่ง traffic กลับคลิป`
        : `ยังไม่มี X data สดใน cache; รัน npm run fetch:x พร้อม X_BEARER_TOKEN เพื่อเพิ่ม social signal จาก ${input.social.sourceUrl}`,
    confidence: input.social.status === 'ready' ? 78 : 54,
    tone: 'cyan',
  })

  return insights
}

function buildSectionInsights(input: {
  contentMetrics: ContentTypeMetric[]
  durationMetrics: DurationBucketMetric[]
  forecast: ForecastPoint[]
  bestPostingSlot: HeatmapCell | null
  topVideos: VideoRecord[]
  projectedGrowthRate: number
  social: SocialAnalytics
}) {
  const topContent = input.contentMetrics[0]
  const secondContent = input.contentMetrics[1]
  const topDuration = [...input.durationMetrics].sort((a, b) => b.avgEngagementRate - a.avgEngagementRate)[0]
  const forecastPeak = [...input.forecast].sort((a, b) => b.views - a.views)[0]
  const topVideo = input.topVideos[0]

  return {
    growth: forecastPeak
      ? `Forecast ชี้ว่า ${forecastPeak.label} มีโอกาสเป็นเดือนที่ views สูงสุดใน 6 เดือนหน้า และ growth รวมคาดที่ ${input.projectedGrowthRate.toFixed(1)}%`
      : 'ยังต้องมีข้อมูลรายเดือนเพิ่มเพื่อสร้าง forecast ที่มั่นใจ',
    content: topContent
      ? `${topContent.contentType} เป็นหัวหอกตอนนี้${secondContent ? ` ส่วน ${secondContent.contentType} เหมาะใช้เป็น content support` : ''}`
      : 'ไม่มี content type หลัง filter นี้',
    duration: topDuration
      ? `duration กลุ่ม ${topDuration.bucket} ให้ engagement เฉลี่ย ${percent(topDuration.avgEngagementRate)} จึงเหมาะกับคอนเทนต์ที่ต้องการคอมเมนต์/ไลก์`
      : 'ไม่มี duration bucket หลัง filter นี้',
    timing: input.bestPostingSlot
      ? `${input.bestPostingSlot.weekdayLabel} ${input.bestPostingSlot.slot} เป็น slot ที่คะแนนรวมดีที่สุดจากวันที่อัปโหลดและ proxy time-slot`
      : 'ยังไม่มี slot ที่ชัดเจนหลัง filter นี้',
    videos: topVideo
      ? `Top viral candidate คือ "${topVideo.title}" ด้วย score ${topVideo.viralScore.toFixed(1)} ควรนำ pattern ชื่อคลิปและ opening hook ไปทำซ้ำ`
      : 'ไม่มีวิดีโอหลัง filter นี้',
    social: input.social.strategicInsight,
  }
}

function buildSocialAnalytics(records: VideoRecord[], xData?: XDataset): SocialAnalytics {
  const posts = xData?.posts ?? []
  const sourceUrl = xData?.sourceUrl ?? 'https://x.com/MarineChariot'

  if (posts.length === 0) {
    return {
      sourceUrl,
      fetchedAt: xData?.fetchedAt ?? null,
      status: 'empty',
      statusMessage: xData?.meta?.message ?? 'No X posts loaded yet.',
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
    ? `X signal ชี้ว่าคลิป "${bestMatch.title}" มี social lift ${bestMatch.liftScore.toFixed(1)} จาก ${bestMatch.matchedPostCount} posts ควรใช้เป็นต้นแบบ cross-promo`
    : `X มี ${posts.length} posts แต่ยังจับคู่กับวิดีโอใน filter นี้ได้น้อย ควรใส่ YouTube URL หรือ keyword ชื่อเกม/ซีรีส์ใน post ให้ชัดขึ้น`

  return {
    sourceUrl,
    fetchedAt: xData?.fetchedAt ?? null,
    status: 'ready',
    statusMessage: `${posts.length} X posts loaded`,
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

function summarize(records: VideoRecord[]) {
  const videos = records.length
  const views = sum(records.map((record) => record.views))
  const likes = sum(records.map((record) => record.likes))
  const comments = sum(records.map((record) => record.comments))

  return {
    videos,
    views,
    likes,
    comments,
    avgViews: safeDivide(views, videos),
    avgLikes: safeDivide(likes, videos),
    avgEngagementRate: average(records.map((record) => record.engagementRate)),
    avgRetentionScore: average(records.map((record) => record.retentionScore)),
    avgViralScore: average(records.map((record) => record.viralScore)),
    medianMinutes: median(records.map((record) => record.minutes)),
  }
}

function sortVideos(records: VideoRecord[], tableSort: TableSort) {
  return [...records].sort((a, b) => {
    const direction = tableSort.direction === 'asc' ? 1 : -1
    const aValue = getSortableValue(a, tableSort.key)
    const bValue = getSortableValue(b, tableSort.key)

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return aValue.localeCompare(bValue, 'th') * direction
    }

    return ((aValue as number) - (bValue as number)) * direction
  })
}

function getSortableValue(record: VideoRecord, key: TableSort['key']) {
  if (key === 'publishedAt') {
    return record.publishedAt.getTime()
  }

  if (key === 'title') {
    return record.title
  }

  if (key === 'contentType') {
    return record.contentType
  }

  return record[key as MetricKey]
}

function rankContentTypes(metrics: ContentTypeMetric[]) {
  const maxViews = Math.max(...metrics.map((metric) => metric.avgViews), 1)
  const maxGrowth = Math.max(...metrics.map((metric) => Math.max(metric.growthRate, 0)), 1)
  const maxViral = Math.max(...metrics.map((metric) => metric.avgViralScore), 1)

  return metrics
    .map((metric) => ({
      ...metric,
      score:
        (metric.avgViews / maxViews) * 38 +
        metric.avgEngagementRate * 100 * 18 +
        (Math.max(metric.growthRate, 0) / maxGrowth) * 20 +
        (metric.avgRetentionScore / 100) * 10 +
        (metric.avgViralScore / maxViral) * 14,
    }))
    .sort((a, b) => b.score - a.score)
}

function growthFromRecentMonths(monthly: MonthlyMetric[]) {
  if (monthly.length < 4) {
    return 0
  }

  const recent = monthly.slice(-3)
  const previous = monthly.slice(-6, -3)

  return deltaPercent(sum(recent.map((metric) => metric.views)), sum(previous.map((metric) => metric.views)))
}

function linearRegressionForecast(values: number[], horizon: number) {
  if (values.length === 0) {
    return Array.from({ length: horizon }, () => 0)
  }

  const n = values.length
  const xs = values.map((_, index) => index + 1)
  const sumX = sum(xs)
  const sumY = sum(values)
  const sumXY = sum(values.map((value, index) => value * xs[index]))
  const sumXX = sum(xs.map((value) => value * value))
  const denominator = n * sumXX - sumX * sumX
  const slope = denominator === 0 ? 0 : (n * sumXY - sumX * sumY) / denominator
  const intercept = (sumY - slope * sumX) / n

  return Array.from({ length: horizon }, (_, index) => intercept + slope * (n + index + 1))
}

function exponentialSmoothingForecast(values: number[], horizon: number, alpha = 0.35) {
  if (values.length === 0) {
    return Array.from({ length: horizon }, () => 0)
  }

  let level = values[0]

  for (const value of values.slice(1)) {
    level = alpha * value + (1 - alpha) * level
  }

  return Array.from({ length: horizon }, () => level)
}

function estimateSlot(record: VideoRecord) {
  if (record.contentType === 'Shorts' || record.minutes <= 15) {
    return '12:00 Shorts'
  }

  if (record.minutes <= 60) {
    return '18:00 Compact'
  }

  if (record.minutes <= 130) {
    return '20:00 Prime'
  }

  return '22:00 Long'
}

function durationBucket(minutes: number) {
  if (minutes <= 15) {
    return '<= 15m'
  }

  if (minutes <= 60) {
    return '15-60m'
  }

  if (minutes <= 120) {
    return '1-2h'
  }

  return '2h+'
}

function durationBucketOrder(bucket: string) {
  return ['<= 15m', '15-60m', '1-2h', '2h+'].indexOf(bucket)
}

function groupBy<T>(values: T[], getKey: (value: T) => string) {
  return values.reduce((map, value) => {
    const key = getKey(value)
    const items = map.get(key) ?? []
    items.push(value)
    map.set(key, items)
    return map
  }, new Map<string, T[]>())
}

function unique<T>(values: T[]) {
  return Array.from(new Set(values))
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0)
}

function average(values: number[]) {
  return safeDivide(sum(values), values.length)
}

function median(values: number[]) {
  if (values.length === 0) {
    return 0
  }

  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)

  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2
  }

  return sorted[middle]
}

function safeDivide(value: number, divisor: number) {
  return divisor === 0 ? 0 : value / divisor
}

function deltaPercent(current: number, previous: number) {
  if (previous === 0) {
    return current > 0 ? 100 : 0
  }

  return ((current - previous) / previous) * 100
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

export function metricLabel(key: MetricKey | 'publishedAt' | 'title' | 'contentType') {
  const labels: Record<string, string> = {
    views: 'Views',
    likes: 'Likes',
    comments: 'Comments',
    engagementRate: 'Engagement',
    viralScore: 'Viral',
    retentionScore: 'Retention',
    publishedAt: 'Date',
    title: 'Video',
    contentType: 'Type',
  }

  return labels[key] ?? key
}

export function durationInsight(metrics: DurationBucketMetric[]) {
  const top = [...metrics].sort((a, b) => b.avgViews - a.avgViews)[0]
  return top ? `${top.bucket} / ${compactNumber(top.avgViews)} avg views` : '-'
}

export function retentionLabel(record: VideoRecord) {
  return `${record.retentionScore.toFixed(1)} / ${minutesLabel(record.retentionMinutes)}`
}
