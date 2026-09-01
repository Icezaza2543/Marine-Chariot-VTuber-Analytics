import { CalendarDays } from 'lucide-react'
import { compactNumber, percent } from '../lib/format'
import type { AnalyticsBundle } from '../types'
import { SectionInsight } from './SectionInsight'

interface PostingHeatmapProps {
  analytics: AnalyticsBundle
}

const GITHUB_HEAT_LEVELS = ['#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39']

export function PostingHeatmap({ analytics }: PostingHeatmapProps) {
  const maxScore = Math.max(...analytics.heatmap.map((cell) => cell.score), 1)
  const weekdays = Array.from(new Set(analytics.heatmap.map((cell) => cell.weekdayLabel)))
  const durationSegments = Array.from(
    new Set(analytics.heatmap.map((cell) => cell.durationSegment)),
  )

  return (
    <article className="chart-panel">
      <div className="panel-heading">
        <div>
          <h2>Heatmap รูปแบบการลงคลิป</h2>
          <p>วันในสัปดาห์ × ความยาววิดีโอ โดยไม่อนุมานเวลาอัปโหลด</p>
        </div>
        <div className="panel-badge">
          <CalendarDays className="h-3.5 w-3.5" />
          {analytics.bestPublishingPattern?.weekdayLabel ?? '-'}
        </div>
      </div>

      <div
        aria-colcount={weekdays.length + 1}
        aria-label="ประสิทธิภาพวิดีโอตามวันและความยาว"
        aria-rowcount={durationSegments.length + 1}
        className="heatmap-grid"
        role="grid"
        style={{
          gridTemplateColumns: `112px repeat(${weekdays.length}, var(--heatmap-cell-size))`,
        }}
      >
        <div role="row" style={{ display: 'contents' }}>
          <span aria-hidden="true" />
          {weekdays.map((weekday) => (
            <span className="heatmap-axis" key={weekday} role="columnheader">
              {weekday}
            </span>
          ))}
        </div>
        {durationSegments.map((durationSegment) => (
          <HeatmapRow
            key={durationSegment}
            maxScore={maxScore}
            durationSegment={durationSegment}
            cells={weekdays.map((weekday) =>
              analytics.heatmap.find(
                (cell) => cell.weekdayLabel === weekday && cell.durationSegment === durationSegment,
              ),
            )}
          />
        ))}
      </div>
      <div className="heatmap-legend" aria-label="Heatmap intensity">
        <span>ต่ำ</span>
        {GITHUB_HEAT_LEVELS.map((color, index) => (
          <i
            aria-hidden="true"
            className="heatmap-legend-card"
            key={color}
            style={{ backgroundColor: color }}
            title={`ระดับ ${index}`}
          />
        ))}
        <span>สูง</span>
      </div>

      <SectionInsight>{analytics.sectionInsights.timing}</SectionInsight>
    </article>
  )
}

interface HeatmapRowProps {
  durationSegment: string
  maxScore: number
  cells: Array<AnalyticsBundle['heatmap'][number] | undefined>
}

function HeatmapRow({ durationSegment, maxScore, cells }: HeatmapRowProps) {
  return (
    <div role="row" style={{ display: 'contents' }}>
      <span className="heatmap-slot" role="rowheader">
        {durationSegment}
      </span>
      {cells.map((cell, index) => {
        const level = getHeatLevel(cell, maxScore)
        const accessibleLabel = cell
          ? `${cell.weekdayLabel} ${cell.durationSegment}: ${cell.count} ครั้ง, ${compactNumber(cell.viewsPerUpload)} วิวเฉลี่ย, มีส่วนร่วม ${percent(cell.engagementRate)}`
          : durationSegment

        return (
          <div
            aria-label={accessibleLabel}
            className={`heatmap-cell heat-level-${level}`}
            key={`${durationSegment}-${index}`}
            role="gridcell"
            style={{ backgroundColor: GITHUB_HEAT_LEVELS[level] }}
            tabIndex={0}
            title={accessibleLabel}
          >
            <strong>{cell?.count ?? 0}</strong>
            <span>{cell ? compactNumber(cell.viewsPerUpload) : '-'}</span>
          </div>
        )
      })}
    </div>
  )
}

function getHeatLevel(cell: AnalyticsBundle['heatmap'][number] | undefined, maxScore: number) {
  if (!cell || cell.count === 0) {
    return 0
  }

  const intensity = maxScore > 0 ? cell.score / maxScore : 0

  if (intensity >= 0.75) {
    return 4
  }

  if (intensity >= 0.5) {
    return 3
  }

  if (intensity >= 0.25) {
    return 2
  }

  return 1
}
