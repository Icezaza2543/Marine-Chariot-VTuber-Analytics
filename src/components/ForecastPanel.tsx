import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { BrainCircuit, TrendingUp } from 'lucide-react'
import { compactNumber, percent } from '../lib/format'
import type { AnalyticsBundle } from '../types'

interface ForecastPanelProps {
  analytics: AnalyticsBundle
}

export function ForecastPanel({ analytics }: ForecastPanelProps) {
  const chartData = analytics.forecast.map((point) => ({
    label: point.label,
    views: point.views,
    linear: point.linearViews,
    smoothing: point.smoothedViews,
    engagement: point.engagementRate * 100,
  }))

  return (
    <article className="chart-panel min-h-[390px]">
      <div className="panel-heading">
        <div>
          <h2>Growth Forecast</h2>
          <p>Linear regression + exponential smoothing</p>
        </div>
        <div className="panel-badge">
          <TrendingUp className="h-3.5 w-3.5" />
          {analytics.projectedGrowthRate.toFixed(1)}%
        </div>
      </div>

      <div className="h-[205px]">
        <ResponsiveContainer height="100%" initialDimension={{ width: 640, height: 205 }} minWidth={0} width="100%">
          <ComposedChart data={chartData}>
            <CartesianGrid stroke="rgba(148,163,184,0.1)" vertical={false} />
            <XAxis dataKey="label" stroke="#9aa4b2" tickLine={false} />
            <YAxis stroke="#9aa4b2" tickFormatter={(value) => compactNumber(Number(value))} tickLine={false} />
            <Tooltip
              contentStyle={{
                background: 'rgba(12, 14, 24, 0.96)',
                border: '1px solid rgba(167, 139, 250, 0.35)',
                borderRadius: 8,
                color: '#fff',
              }}
            />
            <Legend />
            <Area dataKey="views" fill="rgba(103,232,249,0.16)" name="Forecast" stroke="#67e8f9" />
            <Line dataKey="linear" dot={false} name="Linear" stroke="#ff6b9d" strokeDasharray="6 5" />
            <Line dataKey="smoothing" dot={false} name="Smoothing" stroke="#a78bfa" strokeDasharray="2 4" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="forecast-list">
        {analytics.forecast.slice(0, 3).map((point) => (
          <div className="forecast-row" key={point.key}>
            <span>{point.label}</span>
            <strong>{compactNumber(point.views)}</strong>
            <em>{percent(point.engagementRate)}</em>
          </div>
        ))}
      </div>

      <div className="section-insight">
        <BrainCircuit className="h-4 w-4 shrink-0 text-[var(--mc-pink)]" />
        <p>
          คำแนะนำเดือนหน้า:{' '}
          <strong>{analytics.nextContentRecommendation?.contentType ?? 'เลือกช่วงข้อมูลเพิ่ม'}</strong> · cadence{' '}
          <strong>{analytics.optimalFrequency}</strong>
        </p>
      </div>
    </article>
  )
}
