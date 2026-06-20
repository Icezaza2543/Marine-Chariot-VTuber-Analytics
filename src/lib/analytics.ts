import {
  compareAsc,
  eachMonthOfInterval,
  format,
  getMonth,
  startOfMonth,
} from 'date-fns'
import { compactNumber, percent, thaiMonthLabel } from './format'
import { buildForecast, computeProjectedGrowth } from './analytics/forecast'
import { filterRecords } from './analytics/filtering'
import { average, clamp, deltaPercent, groupBy, median, safeDivide, sum, unique } from './analytics/math'
import { buildSocialAnalytics } from './analytics/social'
import type {
  AnalyticsBundle,
  ContentTypeMetric,
  DashboardFilters,
  DurationBucketMetric,
  EngagementMixMetric,
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
  SocialAnalytics,
  ForecastPoint,
} from '../types'

export { filterRecords } from './analytics/filtering'
export { durationInsight, metricLabel, retentionLabel } from './analytics/labels'

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
  const kpis = buildKpis(filteredRecords)
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

function buildKpis(records: VideoRecord[]): KpiValue[] {
  const current = summarize(records)

  return [
    {
      label: 'ยอดวิวรวม',
      value: compactNumber(current.views),
      rawValue: current.views,
      tone: 'pink',
    },
    {
      label: 'ไลก์รวม',
      value: compactNumber(current.likes),
      rawValue: current.likes,
      tone: 'violet',
    },
    {
      label: 'อัตรามีส่วนร่วม',
      value: percent(current.avgEngagementRate),
      rawValue: current.avgEngagementRate,
      tone: 'cyan',
    },
    {
      label: 'จำนวนวิดีโอ',
      value: compactNumber(current.videos),
      rawValue: current.videos,
      tone: 'green',
    },
    {
      label: 'วิวเฉลี่ย/วิดีโอ',
      value: compactNumber(current.avgViews),
      rawValue: current.avgViews,
      tone: 'amber',
    },
    {
      label: 'การดูต่อโดยประมาณ',
      value: `${current.avgRetentionScore.toFixed(1)}`,
      rawValue: current.avgRetentionScore,
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
      ? `เดือนถัดไปคาดการณ์ ${compactNumber(firstForecast.views)} วิว จากโมเดล regression + smoothing เทียบเดือนล่าสุด ${compactNumber(latestMonth.views)} วิว`
      : 'ต้องมีข้อมูลรายเดือนเพิ่มเพื่อให้การคาดการณ์แข็งแรงขึ้น'

  const insights: StrategyInsight[] = [
    {
      title: 'ชีพจรการเติบโต',
      body: `${forecastText}; การเติบโตคาดการณ์ 3 เดือนอยู่ที่ ${input.projectedGrowthRate.toFixed(1)}%`,
      confidence: 82,
      tone: 'pink',
    },
    {
      title: 'กลยุทธ์คอนเทนต์',
      body: topContent
        ? `เดือนถัดไปควรเน้น ${topContent.contentType} เพราะวิวเฉลี่ย ${compactNumber(topContent.avgViews)} และอัตรามีส่วนร่วม ${percent(topContent.avgEngagementRate)} ยังเด่น`
        : 'ยังไม่มี content type ที่เด่นพอหลัง filter ปัจจุบัน',
      confidence: 86,
      tone: 'violet',
    },
    {
      title: 'แผนเพิ่ม Retention',
      body: bestDuration
        ? `กลุ่มความยาว ${bestDuration.bucket} ทำผลงานเฉลี่ยดีที่สุด ควรใช้เป็นแม่แบบ pacing และช่วง hook`
        : 'ยังไม่มีข้อมูล duration เพียงพอ',
      confidence: 76,
      tone: 'cyan',
    },
    {
      title: 'จังหวะการลงคอนเทนต์',
      body: input.bestPostingSlot
        ? `ช่วงเวลาที่ควรทดลองซ้ำคือ ${input.bestPostingSlot.weekdayLabel} ${input.bestPostingSlot.slot}; ความถี่ที่น่าเก็บต่อคือ ${input.optimalFrequency}`
        : 'ยังหาช่วงเวลาที่ชัดไม่ได้จาก filter นี้',
      confidence: 69,
      tone: 'green',
    },
    {
      title: 'แรงส่งไวรัล',
      body: topVideo
        ? `ใช้ ${topVideo.contentType} จากวิดีโอคะแนนไวรัล ${topVideo.viralScore.toFixed(1)} เป็นต้นแบบทำ Shorts cutdown แล้วพาคนกลับไป long-form`
        : 'ยังไม่มีวิดีโอในช่วงที่เลือก',
      confidence: 80,
      tone: 'amber',
    },
  ]

  insights.push({
    title: 'สัญญาณจาก X',
    body:
      input.social.status === 'ready'
        ? `X มี ${input.social.postCount} โพสต์, engagement รวม ${compactNumber(input.social.totalEngagement)} และ cross-promo rate ${percent(input.social.crossPromoRate)}; ใช้โพสต์ที่พูดถึงไลฟ์/YouTube เป็นตัวเร่ง traffic กลับคลิป`
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
