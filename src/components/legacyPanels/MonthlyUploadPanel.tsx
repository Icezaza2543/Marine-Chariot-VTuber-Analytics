import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Gauge } from 'lucide-react'
import { compactNumber } from '../../lib/format'
import { SectionInsight } from '../SectionInsight'
import type { AnalyticsPanelProps } from './shared'
import { tooltipStyle } from './shared'

export function MonthlyUploadPanel({ analytics }: AnalyticsPanelProps) {
  const data = analytics.monthlyMetrics.map((metric) => ({
    label: metric.label,
    views: metric.views,
    videos: metric.videos,
  }))
  const peak = [...analytics.monthlyMetrics].sort((a, b) => b.views - a.views)[0]

  return (
    <article className="chart-panel">
      <div className="panel-heading">
        <div>
          <h2>ยอดวิวรายเดือนและความถี่อัปโหลด</h2>
          <p>ยอดวิวรายเดือนเทียบกับจำนวนวิดีโอที่อัปโหลด</p>
        </div>
        <div className="panel-badge">
          <Gauge className="h-3.5 w-3.5" />
          {peak?.label ?? '-'}
        </div>
      </div>

      <div className="chart-box-lg">
        <ResponsiveContainer height="100%" initialDimension={{ width: 960, height: 320 }} minWidth={0} width="100%">
          <ComposedChart data={data}>
            <CartesianGrid stroke="rgba(71,85,105,0.16)" vertical={false} />
            <XAxis dataKey="label" stroke="#475569" tickLine={false} />
            <YAxis
              stroke="#475569"
              tickFormatter={(value) => compactNumber(Number(value))}
              tickLine={false}
              yAxisId="views"
            />
            <YAxis orientation="right" stroke="#e44878" tickLine={false} yAxisId="videos" />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend />
            <Bar dataKey="views" fill="#2563eb" name="ยอดวิว" radius={[5, 5, 0, 0]} yAxisId="views" />
            <Line dataKey="videos" dot={false} name="จำนวนอัปโหลด" stroke="#e44878" strokeWidth={2.4} yAxisId="videos" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <SectionInsight>
        {peak
          ? `${peak.label} เป็นเดือนที่ยอดวิวสูงสุด (${compactNumber(peak.views)}) จาก ${peak.videos} อัปโหลด; ใช้เทียบความถี่กับเดือนที่ลงบ่อยแต่ยอดเฉลี่ยต่ำได้ทันที`
          : 'ยังไม่มีข้อมูลรายเดือนหลัง filter นี้'}
      </SectionInsight>
    </article>
  )
}
