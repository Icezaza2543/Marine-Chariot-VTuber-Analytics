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
          <h2>คาดการณ์การเติบโต</h2>
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
            <CartesianGrid stroke="rgba(71,85,105,0.16)" vertical={false} />
            <XAxis dataKey="label" stroke="#475569" tickLine={false} />
            <YAxis stroke="#475569" tickFormatter={(value) => compactNumber(Number(value))} tickLine={false} />
            <Tooltip
              contentStyle={{
                background: 'rgba(255, 255, 255, 0.98)',
                border: '1px solid rgba(124, 58, 237, 0.22)',
                borderRadius: 8,
                color: '#20283a',
              }}
            />
            <Legend />
            <Area dataKey="views" fill="rgba(8,145,178,0.14)" name="คาดการณ์" stroke="#0891b2" />
            <Line dataKey="linear" dot={false} name="Linear" stroke="#e44878" strokeDasharray="6 5" />
            <Line dataKey="smoothing" dot={false} name="Smoothing" stroke="#7c3aed" strokeDasharray="2 4" />
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
          <strong>{analytics.nextContentRecommendation?.contentType ?? 'เลือกช่วงข้อมูลเพิ่ม'}</strong> · ความถี่{' '}
          <strong>{analytics.optimalFrequency}</strong>
        </p>
      </div>
    </article>
  )
}
