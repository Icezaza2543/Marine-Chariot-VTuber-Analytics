import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Scissors } from 'lucide-react'
import { compactNumber } from '../../lib/format'
import { SectionInsight } from '../SectionInsight'
import type { AnalyticsPanelProps } from './shared'
import { buildShortsMonthlyData, isShortVideo, tooltipStyle } from './shared'

export function ShortsDeepDivePanel({ analytics }: AnalyticsPanelProps) {
  const data = buildShortsMonthlyData(analytics)
  const totalShorts = analytics.filteredRecords.filter(isShortVideo)
  const peak = [...data].sort((a, b) => b.views - a.views)[0]

  return (
    <article className="chart-panel">
      <div className="panel-heading">
        <div>
          <h2>วิเคราะห์ Shorts เชิงลึก</h2>
          <p>วิเคราะห์ Shorts แยกเป็น growth engine ของช่อง</p>
        </div>
        <div className="panel-badge">
          <Scissors className="h-3.5 w-3.5" />
          {totalShorts.length} Shorts
        </div>
      </div>

      <div className="chart-box-md">
        <ResponsiveContainer height="100%" initialDimension={{ width: 960, height: 280 }} minWidth={0} width="100%">
          <ComposedChart data={data}>
            <CartesianGrid stroke="rgba(71,85,105,0.16)" vertical={false} />
            <XAxis dataKey="label" stroke="#475569" tickLine={false} />
            <YAxis
              stroke="#475569"
              tickFormatter={(value) => compactNumber(Number(value))}
              tickLine={false}
              yAxisId="views"
            />
            <YAxis orientation="right" stroke="#7c3aed" tickLine={false} yAxisId="count" />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend />
            <Bar dataKey="views" fill="#e44878" name="วิวจาก Shorts" radius={[5, 5, 0, 0]} yAxisId="views" />
            <Line dataKey="count" dot={false} name="จำนวน Shorts" stroke="#7c3aed" strokeWidth={2.4} yAxisId="count" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <SectionInsight>
        {peak && totalShorts.length > 0
          ? `${peak.label} คือ Shorts wave ที่แรงสุด (${compactNumber(peak.views)} วิว / ${peak.count} คลิป); ควรตัด long-form เป็นคลิปสั้นหลังไลฟ์หรือเพลงทุกครั้ง`
          : 'ยังไม่มี Shorts หลัง filter นี้'}
      </SectionInsight>
    </article>
  )
}
