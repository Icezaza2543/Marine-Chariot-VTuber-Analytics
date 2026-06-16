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
import { compactNumber, percent } from '../lib/format'
import type { AnalyticsBundle } from '../types'
import { SectionInsight } from './SectionInsight'

const barColors = ['#e44878', '#0891b2', '#7c3aed', '#047857', '#b45309', '#db2777']

interface ContentTypeDeepDiveProps {
  analytics: AnalyticsBundle
}

export function ContentTypeDeepDive({ analytics }: ContentTypeDeepDiveProps) {
  const chartData = analytics.contentMetrics.slice(0, 8).map((metric) => ({
    name: metric.contentType,
    avgViews: Math.round(metric.avgViews),
    engagement: Number((metric.avgEngagementRate * 100).toFixed(1)),
  }))

  return (
    <article className="chart-panel">
      <div className="panel-heading">
        <div>
          <h2>วิเคราะห์ประเภทคอนเทนต์เชิงลึก</h2>
          <p>ประสิทธิภาพ และจังหวะตามฤดูกาล</p>
        </div>
        <div className="panel-badge">
          <Layers3 className="h-3.5 w-3.5" />
          {analytics.contentMetrics.length} ประเภท
        </div>
      </div>

      <div className="h-[240px]">
        <ResponsiveContainer height="100%" initialDimension={{ width: 640, height: 240 }} minWidth={0} width="100%">
          <BarChart data={chartData}>
            <CartesianGrid stroke="rgba(71,85,105,0.16)" vertical={false} />
            <XAxis dataKey="name" stroke="#475569" tickLine={false} />
            <YAxis stroke="#475569" tickFormatter={(value) => compactNumber(Number(value))} tickLine={false} />
            <Tooltip
              contentStyle={{
                background: 'rgba(255, 255, 255, 0.98)',
                border: '1px solid rgba(124, 58, 237, 0.22)',
                borderRadius: 8,
                color: '#20283a',
              }}
            />
            <Bar dataKey="avgViews" name="วิวเฉลี่ย" radius={[6, 6, 0, 0]}>
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
                {metric.videos} วิดีโอ · เดือนเด่น {metric.bestMonth}
              </span>
            </div>
            <div className="text-right">
              <strong>{compactNumber(metric.avgViews)}</strong>
              <span>{percent(metric.avgEngagementRate)}</span>
            </div>
          </div>
        ))}
      </div>

      <SectionInsight>{analytics.sectionInsights.content}</SectionInsight>
    </article>
  )
}
