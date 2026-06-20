import { Bar, CartesianGrid, Cell, ComposedChart, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Sparkles } from 'lucide-react'
import { compactNumber, percent } from '../../lib/format'
import { SectionInsight } from '../SectionInsight'
import type { AnalyticsPanelProps } from './shared'
import { buildFormatMonthlyData, buildFormatTotals, MiniStat, tooltipStyle } from './shared'

export function ContentFormatPanel({ analytics }: AnalyticsPanelProps) {
  const data = buildFormatMonthlyData(analytics)
  const formatTotals = buildFormatTotals(analytics.filteredRecords)
  const video = formatTotals.find((item) => item.name === 'Video') ?? null
  const talk = formatTotals.find((item) => item.name === 'Content Talk') ?? null

  return (
    <article className="chart-panel">
      <div className="panel-heading">
        <div>
          <h2>วิดีโอสั้น/เพลง vs คอนเทนต์พูดคุย</h2>
          <p>แยก Shorts / cover / เพลง ออกจากคอนเทนต์พูดคุยและไลฟ์</p>
        </div>
        <div className="panel-badge">
          <Sparkles className="h-3.5 w-3.5" />
          สัดส่วนรูปแบบ
        </div>
      </div>

      <div className="split-chart-grid">
        <div className="chart-box-md">
          <ResponsiveContainer height="100%" initialDimension={{ width: 640, height: 280 }} minWidth={0} width="100%">
            <ComposedChart data={data}>
              <CartesianGrid stroke="rgba(71,85,105,0.16)" vertical={false} />
              <XAxis dataKey="label" stroke="#475569" tickLine={false} />
              <YAxis stroke="#475569" tickFormatter={(value) => compactNumber(Number(value))} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend />
              <Bar dataKey="videoViews" fill="#2563eb" name="วิวจากวิดีโอ" radius={[4, 4, 0, 0]} stackId="views" />
              <Bar dataKey="talkViews" fill="#0891b2" name="วิวจากพูดคุย" radius={[4, 4, 0, 0]} stackId="views" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-box-md">
          <ResponsiveContainer height="100%" initialDimension={{ width: 360, height: 280 }} minWidth={0} width="100%">
            <PieChart>
              <Pie
                data={formatTotals}
                dataKey="views"
                innerRadius={64}
                nameKey="name"
                outerRadius={98}
                paddingAngle={2}
              >
                {formatTotals.map((item) => (
                  <Cell fill={item.name === 'Video' ? '#2563eb' : '#0891b2'} key={item.name} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} formatter={(value) => compactNumber(Number(value))} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="format-stat-row">
        <MiniStat label="วิวเฉลี่ยวิดีโอ" value={video ? compactNumber(video.avgViews) : '-'} />
        <MiniStat label="วิวเฉลี่ยพูดคุย" value={talk ? compactNumber(talk.avgViews) : '-'} />
        <MiniStat label="สัดส่วนวิดีโอ" value={video ? percent(video.views / Math.max(video.views + (talk?.views ?? 0), 1), 0) : '-'} />
      </div>

      <SectionInsight>
        {video && talk
          ? `รูปแบบวิดีโอมีวิวเฉลี่ย ${compactNumber(video.avgViews)} ต่อชิ้น เทียบกับคอนเทนต์พูดคุย ${compactNumber(talk.avgViews)}; ใช้ Shorts/cover เป็นตัวเปิด reach แล้วพาคนกลับไป long-form`
          : 'ยังไม่มีข้อมูล format เพียงพอหลัง filter นี้'}
      </SectionInsight>
    </article>
  )
}
