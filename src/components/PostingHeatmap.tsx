import { Clock3 } from 'lucide-react'
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
  const slots = Array.from(new Set(analytics.heatmap.map((cell) => cell.slot)))

  return (
    <article className="chart-panel">
      <div className="panel-heading">
        <div>
          <h2>Heatmap ความถี่การลงคลิป</h2>
          <p>วันในสัปดาห์ × ช่วงเวลาที่คาดว่าอัปโหลด</p>
        </div>
        <div className="panel-badge">
          <Clock3 className="h-3.5 w-3.5" />
          {analytics.bestPostingSlot?.weekdayLabel ?? '-'}
        </div>
      </div>

      <div className="heatmap-grid" style={{ gridTemplateColumns: `112px repeat(${weekdays.length}, var(--heatmap-cell-size))` }}>
        <span />
        {weekdays.map((weekday) => (
          <span className="heatmap-axis" key={weekday}>{weekday}</span>
        ))}
        {slots.map((slot) => (
          <HeatmapRow
            key={slot}
            maxScore={maxScore}
            slot={slot}
            cells={weekdays.map((weekday) =>
              analytics.heatmap.find((cell) => cell.weekdayLabel === weekday && cell.slot === slot),
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
  slot: string
  maxScore: number
  cells: Array<AnalyticsBundle['heatmap'][number] | undefined>
}

function HeatmapRow({ slot, maxScore, cells }: HeatmapRowProps) {
  return (
    <>
      <span className="heatmap-slot">{slot}</span>
      {cells.map((cell, index) => {
        const level = getHeatLevel(cell, maxScore)

        return (
          <div
            className={`heatmap-cell heat-level-${level}`}
            key={`${slot}-${index}`}
            style={{ backgroundColor: GITHUB_HEAT_LEVELS[level] }}
            title={
              cell
                ? `${cell.weekdayLabel} ${cell.slot}: ${cell.count} ครั้ง, ${compactNumber(cell.viewsPerUpload)} วิวเฉลี่ย, มีส่วนร่วม ${percent(cell.engagementRate)}`
                : slot
            }
          >
            <strong>{cell?.count ?? 0}</strong>
            <span>{cell ? compactNumber(cell.viewsPerUpload) : '-'}</span>
          </div>
        )
      })}
    </>
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
