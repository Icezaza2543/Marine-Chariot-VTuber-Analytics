import { format } from 'date-fns'
import { compactNumber } from '../../lib/format'
import type { AnalyticsBundle, ContentTypeMetric, VideoRecord } from '../../types'

export interface AnalyticsPanelProps {
  analytics: AnalyticsBundle
}

export interface CategoryMetric {
  contentType: string
  videos: number
  views: number
  likes: number
  comments: number
  avgViews: number
  avgEngagementRate: number
}

export const palette = ['#e44878', '#0891b2', '#2563eb', '#7c3aed', '#db2777', '#b45309', '#047857', '#64748b']

export const tooltipStyle = {
  background: 'rgba(255, 255, 255, 0.98)',
  border: '1px solid rgba(124, 58, 237, 0.22)',
  borderRadius: 10,
  color: '#20283a',
}

export function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="format-mini-stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

export function CategoryTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: CategoryMetric }> }) {
  if (!active || !payload?.[0]) {
    return null
  }

  const data = payload[0].payload

  return (
    <div className="custom-tooltip">
      <strong>{data.contentType}</strong>
      <span>{data.videos} วิดีโอ</span>
      <span>{compactNumber(data.avgViews)} วิวเฉลี่ย</span>
      <span>{compactNumber(data.views)} วิวรวม</span>
    </div>
  )
}

export function buildFormatMonthlyData(analytics: AnalyticsBundle) {
  return analytics.monthlyMetrics.map((metric) => {
    const records = analytics.filteredRecords.filter((record) => format(record.publishedAt, 'yyyy-MM') === metric.key)
    const videoRecords = records.filter(isVideoFormat)
    const talkRecords = records.filter((record) => !isVideoFormat(record))

    return {
      label: metric.label,
      videoViews: sum(videoRecords.map((record) => record.views)),
      talkViews: sum(talkRecords.map((record) => record.views)),
    }
  })
}

export function buildFormatTotals(records: VideoRecord[]) {
  const videoRecords = records.filter(isVideoFormat)
  const talkRecords = records.filter((record) => !isVideoFormat(record))

  return [
    formatTotal('Video', videoRecords),
    formatTotal('Content Talk', talkRecords),
  ]
}

export function buildShortsMonthlyData(analytics: AnalyticsBundle) {
  return analytics.monthlyMetrics.map((metric) => {
    const records = analytics.filteredRecords.filter(
      (record) => format(record.publishedAt, 'yyyy-MM') === metric.key && isShortVideo(record),
    )

    return {
      label: metric.label,
      views: sum(records.map((record) => record.views)),
      count: records.length,
    }
  })
}

export function compactCategories(metrics: ContentTypeMetric[]): CategoryMetric[] {
  const top = metrics.slice(0, 6).map(toCategoryMetric)
  const rest = metrics.slice(6)

  if (rest.length === 0) {
    return top
  }

  const otherViews = sum(rest.map((metric) => metric.views))
  const otherVideos = sum(rest.map((metric) => metric.videos))

  return [
    ...top,
    {
      contentType: 'Other',
      videos: otherVideos,
      views: otherViews,
      likes: sum(rest.map((metric) => metric.likes)),
      comments: sum(rest.map((metric) => metric.comments)),
      avgViews: safeDivide(otherViews, otherVideos),
      avgEngagementRate: averageWeighted(rest.map((metric) => [metric.avgEngagementRate, metric.videos])),
    },
  ]
}

export function isShortVideo(record: VideoRecord) {
  return /short/i.test(record.contentType) || record.minutes <= 1.2 || record.tags.some((tag) => /short/i.test(tag))
}

export function average(values: number[]) {
  return safeDivide(sum(values), values.length)
}

function toCategoryMetric(metric: ContentTypeMetric): CategoryMetric {
  return {
    contentType: metric.contentType,
    videos: metric.videos,
    views: metric.views,
    likes: metric.likes,
    comments: metric.comments,
    avgViews: metric.avgViews,
    avgEngagementRate: metric.avgEngagementRate,
  }
}

function formatTotal(name: 'Video' | 'Content Talk', records: VideoRecord[]) {
  const views = sum(records.map((record) => record.views))

  return {
    name,
    views,
    videos: records.length,
    avgViews: safeDivide(views, records.length),
  }
}

function isVideoFormat(record: VideoRecord) {
  const searchable = `${record.title} ${record.contentType} ${record.tags.join(' ')}`.toLowerCase()
  return isShortVideo(record) || /cover|mv|music|song|sing|karaoke|เพลง|ร้อง|short/.test(searchable)
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0)
}

function safeDivide(value: number, divisor: number) {
  return divisor === 0 ? 0 : value / divisor
}

function averageWeighted(values: Array<[number, number]>) {
  const totalWeight = sum(values.map(([, weight]) => weight))
  return safeDivide(sum(values.map(([value, weight]) => value * weight)), totalWeight)
}
