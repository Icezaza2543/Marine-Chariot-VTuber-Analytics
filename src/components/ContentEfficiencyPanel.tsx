import {
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts'
import { Crosshair } from 'lucide-react'
import { compactNumber, percent } from '../lib/format'
import type { AnalyticsBundle } from '../types'
import { SectionInsight } from './SectionInsight'

interface ContentEfficiencyPanelProps {
  analytics: AnalyticsBundle
}

export function ContentEfficiencyPanel({ analytics }: ContentEfficiencyPanelProps) {
  const chartData = analytics.contentMetrics.map((metric) => ({
    contentType: metric.contentType,
    avgViews: Math.round(metric.avgViews),
    engagement: Number((metric.avgEngagementRate * 100).toFixed(1)),
    videos: metric.videos,
    retention: metric.avgRetentionScore,
    viral: metric.avgViralScore,
  }))
  const highPotential = [...analytics.contentMetrics].sort(
    (a, b) => b.avgViews * b.avgEngagementRate - a.avgViews * a.avgEngagementRate,
  )[0]

  return (
    <article className="chart-panel">
      <div className="panel-heading">
        <div>
          <h2>Quadrant ประสิทธิภาพคอนเทนต์</h2>
          <p>วิวเฉลี่ย × การมีส่วนร่วม; ขนาด bubble = จำนวนคลิป</p>
        </div>
        <div className="panel-badge">
          <Crosshair className="h-3.5 w-3.5" />
          {highPotential?.contentType ?? '-'}
        </div>
      </div>

      <div className="panel-chart-fill">
        <ResponsiveContainer height="100%" initialDimension={{ width: 640, height: 300 }} minWidth={0} width="100%">
          <ScatterChart>
            <CartesianGrid stroke="rgba(71,85,105,0.16)" />
            <XAxis
              dataKey="avgViews"
              name="วิวเฉลี่ย"
              stroke="#475569"
              tickFormatter={(value) => compactNumber(Number(value))}
              type="number"
            />
            <YAxis dataKey="engagement" name="การมีส่วนร่วม" stroke="#475569" tickFormatter={(value) => `${value}%`} type="number" />
            <ZAxis dataKey="videos" range={[90, 620]} />
            <Tooltip content={<EfficiencyTooltip />} cursor={{ strokeDasharray: '3 3' }} />
            <Scatter data={chartData} fill="#0891b2" name="ประเภทคอนเทนต์" />
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      <SectionInsight>
        {highPotential
          ? `${highPotential.contentType} อยู่ในกลุ่มศักยภาพสูง เพราะมีวิวเฉลี่ย ${compactNumber(highPotential.avgViews)} และอัตรามีส่วนร่วม ${percent(highPotential.avgEngagementRate)}`
          : 'ยังไม่มีข้อมูล content type หลัง filter นี้'}
      </SectionInsight>
    </article>
  )
}

function EfficiencyTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: Record<string, number | string> }> }) {
  if (!active || !payload?.[0]) {
    return null
  }

  const data = payload[0].payload

  return (
    <div className="custom-tooltip">
      <strong>{data.contentType}</strong>
      <span>{compactNumber(Number(data.avgViews))} วิวเฉลี่ย</span>
      <span>มีส่วนร่วม {data.engagement}%</span>
      <span>{data.videos} วิดีโอ · ไวรัล {Number(data.viral).toFixed(1)}</span>
    </div>
  )
}
