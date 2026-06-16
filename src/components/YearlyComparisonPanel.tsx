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
          <h2>เปรียบเทียบผลงานรายปี</h2>
          <p>ยอดวิว วิวเฉลี่ย/วิดีโอ engagement และ retention แยกตามปี</p>
        </div>
        <div className="panel-badge">
          <CalendarRange className="h-3.5 w-3.5" />
          {bestYear?.year ?? '-'}
        </div>
      </div>

      <div className="panel-chart-fill">
        <ResponsiveContainer height="100%" initialDimension={{ width: 960, height: 280 }} minWidth={0} width="100%">
          <ComposedChart data={chartData}>
            <CartesianGrid stroke="rgba(71,85,105,0.16)" vertical={false} />
            <XAxis dataKey="year" stroke="#475569" tickLine={false} />
            <YAxis
              stroke="#475569"
              tickFormatter={(value) => compactNumber(Number(value))}
              tickLine={false}
              yAxisId="views"
            />
            <YAxis
              orientation="right"
              stroke="#0891b2"
              tickFormatter={(value) => `${value}%`}
              tickLine={false}
              yAxisId="rate"
            />
            <Tooltip
              contentStyle={{
                background: 'rgba(255, 255, 255, 0.98)',
                border: '1px solid rgba(124, 58, 237, 0.22)',
                borderRadius: 8,
                color: '#20283a',
              }}
            />
            <Legend />
            <Bar dataKey="views" fill="#e44878" name="ยอดวิว" radius={[6, 6, 0, 0]} yAxisId="views" />
            <Line dataKey="avgViews" dot name="วิวเฉลี่ย" stroke="#7c3aed" strokeWidth={2} yAxisId="views" />
            <Line dataKey="engagement" dot name="Engagement %" stroke="#0891b2" strokeWidth={2} yAxisId="rate" />
            <Line dataKey="retention" dot={false} name="Retention" stroke="#047857" strokeDasharray="5 5" yAxisId="rate" />
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
