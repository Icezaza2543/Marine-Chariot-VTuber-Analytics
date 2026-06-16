import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { CalendarRange } from 'lucide-react'
import { compactNumber, percent } from '../lib/format'
import type { AnalyticsBundle } from '../types'
import { SectionInsight } from './SectionInsight'

interface YearlyComparisonPanelProps {
  analytics: AnalyticsBundle
}

export function YearlyComparisonPanel({ analytics }: YearlyComparisonPanelProps) {
  const chartData = analytics.yearlyMetrics.map((metric) => ({
    year: String(metric.year),
    views: metric.views,
    avgViews: Math.round(metric.avgViews),
    engagement: Number((metric.engagementRate * 100).toFixed(1)),
    retention: Number(metric.retentionScore.toFixed(1)),
  }))
  const bestYear = [...analytics.yearlyMetrics].sort((a, b) => b.views - a.views)[0]

  return (
    <article className="chart-panel">
      <div className="panel-heading">
        <div>
          <h2>Yearly Performance Comparison</h2>
          <p>Views, avg views/video, engagement, and retention by year</p>
        </div>
        <div className="panel-badge">
          <CalendarRange className="h-3.5 w-3.5" />
          {bestYear?.year ?? '-'}
        </div>
      </div>

      <div className="panel-chart-fill">
        <ResponsiveContainer height="100%" initialDimension={{ width: 960, height: 280 }} minWidth={0} width="100%">
          <ComposedChart data={chartData}>
            <CartesianGrid stroke="rgba(148,163,184,0.1)" vertical={false} />
            <XAxis dataKey="year" stroke="#9aa4b2" tickLine={false} />
            <YAxis
              stroke="#9aa4b2"
              tickFormatter={(value) => compactNumber(Number(value))}
              tickLine={false}
              yAxisId="views"
            />
            <YAxis
              orientation="right"
              stroke="#67e8f9"
              tickFormatter={(value) => `${value}%`}
              tickLine={false}
              yAxisId="rate"
            />
            <Tooltip
              contentStyle={{
                background: 'rgba(12, 14, 24, 0.96)',
                border: '1px solid rgba(167, 139, 250, 0.35)',
                borderRadius: 8,
                color: '#fff',
              }}
            />
            <Legend />
            <Bar dataKey="views" fill="#ff6b9d" name="Views" radius={[6, 6, 0, 0]} yAxisId="views" />
            <Line dataKey="avgViews" dot name="Avg Views" stroke="#a78bfa" strokeWidth={2} yAxisId="views" />
            <Line dataKey="engagement" dot name="Engagement %" stroke="#67e8f9" strokeWidth={2} yAxisId="rate" />
            <Line dataKey="retention" dot={false} name="Retention" stroke="#34d399" strokeDasharray="5 5" yAxisId="rate" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <SectionInsight>
        {bestYear
          ? `ปี ${bestYear.year} เป็นปีที่ยอดวิวรวมเด่นสุด (${compactNumber(bestYear.views)}) โดย engagement เฉลี่ย ${percent(bestYear.engagementRate)} และ retention proxy ${bestYear.retentionScore.toFixed(1)}`
          : 'ยังไม่มีข้อมูลรายปีหลัง filter นี้'}
      </SectionInsight>
    </article>
  )
}
