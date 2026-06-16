import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { MessageCircleHeart } from 'lucide-react'
import { decimal, percent } from '../lib/format'
import type { AnalyticsBundle } from '../types'
import { SectionInsight } from './SectionInsight'

interface EngagementMixPanelProps {
  analytics: AnalyticsBundle
}

export function EngagementMixPanel({ analytics }: EngagementMixPanelProps) {
  const chartData = analytics.engagementMix.slice(0, 8).map((metric) => ({
    contentType: metric.contentType,
    likesPerThousandViews: Number(metric.likesPerThousandViews.toFixed(1)),
    commentsPerThousandViews: Number(metric.commentsPerThousandViews.toFixed(1)),
    conversationShare: Number((metric.conversationShare * 100).toFixed(1)),
  }))
  const topConversation = [...analytics.engagementMix].sort((a, b) => b.conversationShare - a.conversationShare)[0]

  return (
    <article className="chart-panel">
      <div className="panel-heading">
        <div>
          <h2>Engagement Mix Comparison</h2>
          <p>Likes and comments normalized per 1,000 views</p>
        </div>
        <div className="panel-badge">
          <MessageCircleHeart className="h-3.5 w-3.5" />
          {topConversation?.contentType ?? '-'}
        </div>
      </div>

      <div className="panel-chart-fill">
        <ResponsiveContainer height="100%" initialDimension={{ width: 640, height: 280 }} minWidth={0} width="100%">
          <BarChart data={chartData}>
            <CartesianGrid stroke="rgba(148,163,184,0.1)" vertical={false} />
            <XAxis dataKey="contentType" stroke="#9aa4b2" tickLine={false} />
            <YAxis stroke="#9aa4b2" tickLine={false} />
            <Tooltip
              contentStyle={{
                background: 'rgba(12, 14, 24, 0.96)',
                border: '1px solid rgba(167, 139, 250, 0.35)',
                borderRadius: 8,
                color: '#fff',
              }}
            />
            <Legend />
            <Bar dataKey="likesPerThousandViews" fill="#ff6b9d" name="Likes / 1k views" radius={[6, 6, 0, 0]} />
            <Bar dataKey="commentsPerThousandViews" fill="#67e8f9" name="Comments / 1k views" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <SectionInsight>
        {topConversation
          ? `${topConversation.contentType} สร้าง conversation share สูงสุด ${percent(topConversation.conversationShare)} โดยมี ${decimal(topConversation.commentsPerThousandViews, 1)} comments ต่อ 1,000 views`
          : 'ยังไม่มี engagement mix หลัง filter นี้'}
      </SectionInsight>
    </article>
  )
}
