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
          <h2>เปรียบเทียบส่วนผสม Engagement</h2>
          <p>ไลก์และคอมเมนต์เทียบต่อ 1,000 วิว</p>
        </div>
        <div className="panel-badge">
          <MessageCircleHeart className="h-3.5 w-3.5" />
          {topConversation?.contentType ?? '-'}
        </div>
      </div>

      <div className="panel-chart-fill">
        <ResponsiveContainer height="100%" initialDimension={{ width: 640, height: 280 }} minWidth={0} width="100%">
          <BarChart data={chartData}>
            <CartesianGrid stroke="rgba(71,85,105,0.16)" vertical={false} />
            <XAxis dataKey="contentType" stroke="#475569" tickLine={false} />
            <YAxis stroke="#475569" tickLine={false} />
            <Tooltip
              contentStyle={{
                background: 'rgba(255, 255, 255, 0.98)',
                border: '1px solid rgba(124, 58, 237, 0.22)',
                borderRadius: 8,
                color: '#20283a',
              }}
            />
            <Legend />
            <Bar dataKey="likesPerThousandViews" fill="#e44878" name="ไลก์ / 1k วิว" radius={[6, 6, 0, 0]} />
            <Bar dataKey="commentsPerThousandViews" fill="#0891b2" name="คอมเมนต์ / 1k วิว" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <SectionInsight>
        {topConversation
          ? `${topConversation.contentType} สร้างสัดส่วนบทสนทนาสูงสุด ${percent(topConversation.conversationShare)} โดยมี ${decimal(topConversation.commentsPerThousandViews, 1)} คอมเมนต์ต่อ 1,000 วิว`
          : 'ยังไม่มี engagement mix หลัง filter นี้'}
      </SectionInsight>
    </article>
  )
}
