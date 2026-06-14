import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Layers3 } from 'lucide-react'
import { compactNumber, percent, signedPercent } from '../lib/format'
import type { AnalyticsBundle } from '../types'
import { SectionInsight } from './SectionInsight'

const barColors = ['#ff6b9d', '#67e8f9', '#a78bfa', '#34d399', '#f59e0b', '#f472b6']

interface ContentTypeDeepDiveProps {
  analytics: AnalyticsBundle
}

export function ContentTypeDeepDive({ analytics }: ContentTypeDeepDiveProps) {
  const chartData = analytics.contentMetrics.slice(0, 8).map((metric) => ({
    name: metric.contentType,
    avgViews: Math.round(metric.avgViews),
    engagement: Number((metric.avgEngagementRate * 100).toFixed(1)),
    growth: Number(metric.growthRate.toFixed(1)),
  }))

  return (
    <article className="chart-panel">
      <div className="panel-heading">
        <div>
          <h2>Content Type Deep Dive</h2>
          <p>Performance, growth rate, and seasonality</p>
        </div>
        <div className="panel-badge">
          <Layers3 className="h-3.5 w-3.5" />
          {analytics.contentMetrics.length} types
        </div>
      </div>

      <div className="h-[240px]">
        <ResponsiveContainer height="100%" initialDimension={{ width: 640, height: 240 }} minWidth={0} width="100%">
          <BarChart data={chartData}>
            <CartesianGrid stroke="rgba(148,163,184,0.09)" vertical={false} />
            <XAxis dataKey="name" stroke="#9aa4b2" tickLine={false} />
            <YAxis stroke="#9aa4b2" tickFormatter={(value) => compactNumber(Number(value))} tickLine={false} />
            <Tooltip
              contentStyle={{
                background: 'rgba(12, 14, 24, 0.96)',
                border: '1px solid rgba(167, 139, 250, 0.35)',
                borderRadius: 8,
                color: '#fff',
              }}
            />
            <Bar dataKey="avgViews" name="Avg Views" radius={[6, 6, 0, 0]}>
              {chartData.map((item, index) => (
                <Cell fill={barColors[index % barColors.length]} key={item.name} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="content-rank-list">
        {analytics.contentMetrics.slice(0, 4).map((metric, index) => (
          <div className="content-rank-row" key={metric.contentType}>
            <span className="rank-number">{index + 1}</span>
            <div className="min-w-0 flex-1">
              <strong>{metric.contentType}</strong>
              <span>
                {metric.videos} videos · best {metric.bestMonth}
              </span>
            </div>
            <div className="text-right">
              <strong>{compactNumber(metric.avgViews)}</strong>
              <span>{percent(metric.avgEngagementRate)} · {signedPercent(metric.growthRate)}</span>
            </div>
          </div>
        ))}
      </div>

      <SectionInsight>{analytics.sectionInsights.content}</SectionInsight>
    </article>
  )
}
