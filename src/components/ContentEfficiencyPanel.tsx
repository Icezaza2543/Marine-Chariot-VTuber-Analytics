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
          <h2>Content Efficiency Quadrant</h2>
          <p>Avg views × engagement; bubble size = upload count</p>
        </div>
        <div className="panel-badge">
          <Crosshair className="h-3.5 w-3.5" />
          {highPotential?.contentType ?? '-'}
        </div>
      </div>

      <div className="h-[300px]">
        <ResponsiveContainer height="100%" initialDimension={{ width: 640, height: 300 }} minWidth={0} width="100%">
          <ScatterChart>
            <CartesianGrid stroke="rgba(148,163,184,0.1)" />
            <XAxis
              dataKey="avgViews"
              name="Avg Views"
              stroke="#9aa4b2"
              tickFormatter={(value) => compactNumber(Number(value))}
              type="number"
            />
            <YAxis dataKey="engagement" name="Engagement" stroke="#9aa4b2" tickFormatter={(value) => `${value}%`} type="number" />
            <ZAxis dataKey="videos" range={[90, 620]} />
            <Tooltip content={<EfficiencyTooltip />} cursor={{ strokeDasharray: '3 3' }} />
            <Scatter data={chartData} fill="#67e8f9" name="Content Types" />
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      <SectionInsight>
        {highPotential
          ? `${highPotential.contentType} อยู่ในกลุ่ม high potential เพราะมี avg views ${compactNumber(highPotential.avgViews)} และ engagement ${percent(highPotential.avgEngagementRate)}`
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
      <span>{compactNumber(Number(data.avgViews))} avg views</span>
      <span>{data.engagement}% engagement</span>
      <span>{data.videos} videos · viral {Number(data.viral).toFixed(1)}</span>
    </div>
  )
}
