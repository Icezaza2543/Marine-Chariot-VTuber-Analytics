import { compactNumber, minutesLabel } from '../format'
import type { DurationBucketMetric, MetricKey, VideoRecord } from '../../types'

export function metricLabel(key: MetricKey | 'publishedAt' | 'title' | 'contentType') {
  const labels: Record<string, string> = {
    views: 'ยอดวิว',
    likes: 'ไลก์',
    comments: 'คอมเมนต์',
    engagementRate: 'อัตรามีส่วนร่วม',
    viralScore: 'ศักยภาพไวรัล',
    retentionScore: 'การดูต่อ',
    publishedAt: 'วันที่',
    title: 'วิดีโอ',
    contentType: 'ประเภท',
  }

  return labels[key] ?? key
}

export function durationInsight(metrics: DurationBucketMetric[]) {
  const top = [...metrics].sort((a, b) => b.avgViews - a.avgViews)[0]
  return top ? `${top.bucket} / ${compactNumber(top.avgViews)} วิวเฉลี่ย` : '-'
}

export function retentionLabel(record: VideoRecord) {
  return `${record.retentionScore.toFixed(1)} / ${minutesLabel(record.retentionMinutes)}`
}
