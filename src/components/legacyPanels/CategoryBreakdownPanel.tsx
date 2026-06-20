import { CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis } from 'recharts'
import { Layers3 } from 'lucide-react'
import { compactNumber } from '../../lib/format'
import { SectionInsight } from '../SectionInsight'
import type { AnalyticsPanelProps } from './shared'
import { CategoryTooltip, compactCategories, palette, tooltipStyle } from './shared'

export function CategoryBreakdownPanel({ analytics }: AnalyticsPanelProps) {
  const categories = compactCategories(analytics.contentMetrics)
  const topCategory = categories[0]

  return (
    <article className="chart-panel">
      <div className="panel-heading">
        <div>
          <h2>สัดส่วนหมวดคอนเทนต์</h2>
          <p>สัดส่วนยอดวิวและประสิทธิภาพของแต่ละหมวด</p>
        </div>
        <div className="panel-badge">
          <Layers3 className="h-3.5 w-3.5" />
          {categories.length} กลุ่ม
        </div>
      </div>

      <div className="category-grid">
        {categories.map((category) => (
          <div className="category-card" key={category.contentType}>
            <span>{category.contentType}</span>
            <strong>{compactNumber(category.videos)}</strong>
            <em>{compactNumber(category.avgViews)} วิวเฉลี่ย</em>
          </div>
        ))}
      </div>

      <div className="split-chart-grid">
        <div className="chart-box-md">
          <ResponsiveContainer height="100%" initialDimension={{ width: 540, height: 280 }} minWidth={0} width="100%">
            <PieChart>
              <Pie
                data={categories}
                dataKey="views"
                innerRadius={62}
                nameKey="contentType"
                outerRadius={98}
                paddingAngle={2}
              >
                {categories.map((item, index) => (
                  <Cell fill={palette[index % palette.length]} key={item.contentType} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} formatter={(value) => compactNumber(Number(value))} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-box-md">
          <ResponsiveContainer height="100%" initialDimension={{ width: 540, height: 280 }} minWidth={0} width="100%">
            <ScatterChart>
              <CartesianGrid stroke="rgba(71,85,105,0.16)" />
              <XAxis dataKey="videos" name="จำนวนวิดีโอ" stroke="#475569" tickLine={false} type="number" />
              <YAxis
                dataKey="avgViews"
                name="วิวเฉลี่ย"
                stroke="#475569"
                tickFormatter={(value) => compactNumber(Number(value))}
                tickLine={false}
                type="number"
              />
              <ZAxis dataKey="views" range={[80, 580]} />
              <Tooltip content={<CategoryTooltip />} cursor={{ strokeDasharray: '3 3' }} />
              <Scatter data={categories} fill="#e44878" name="หมวดคอนเทนต์">
                {categories.map((item, index) => (
                  <Cell fill={palette[index % palette.length]} key={item.contentType} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>

      <SectionInsight>
        {topCategory
          ? `${topCategory.contentType} สร้างยอดวิวรวมสูงสุด ${compactNumber(topCategory.views)} จาก ${topCategory.videos} วิดีโอ; bubble ช่วยดูพร้อมกันว่าอะไร “ใหญ่เพราะลงเยอะ” หรือ “แรงเพราะเฉลี่ยสูง”`
          : 'ยังไม่มี category หลัง filter นี้'}
      </SectionInsight>
    </article>
  )
}
