import { format } from 'date-fns'
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts'
import { Flame, Gauge, Layers3, Scissors, Sparkles } from 'lucide-react'
import { compactNumber, percent } from '../lib/format'
import type { AnalyticsBundle, ContentTypeMetric, VideoRecord } from '../types'
import { SectionInsight } from './SectionInsight'

interface AnalyticsPanelProps {
  analytics: AnalyticsBundle
}

const palette = ['#e44878', '#0891b2', '#2563eb', '#7c3aed', '#db2777', '#b45309', '#047857', '#64748b']
const tooltipStyle = {
  background: 'rgba(255, 255, 255, 0.98)',
  border: '1px solid rgba(124, 58, 237, 0.22)',
  borderRadius: 10,
  color: '#20283a',
}

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

export function ChannelSummaryPanel({ analytics }: AnalyticsPanelProps) {
  const topContent = analytics.contentMetrics[0]
  const shorts = analytics.contentMetrics.find((metric) => /short/i.test(metric.contentType))
  const topDuration = [...analytics.durationMetrics].sort((a, b) => b.avgViews - a.avgViews)[0]
  const longForm = analytics.durationMetrics.find((metric) => metric.bucket === '2h+')

  return (
    <article className="summary-panel">
      <div className="panel-heading">
        <div>
          <h2>สรุปภาพรวมและแนวโน้ม</h2>
          <p>สรุปเชิงกลยุทธ์จากข้อมูลที่ filter อยู่ตอนนี้</p>
        </div>
        <div className="panel-badge">
          <Flame className="h-3.5 w-3.5" />
          กลยุทธ์
        </div>
      </div>

      <div className="summary-row">
        <div className="summary-box good">
          <h3>จุดแข็ง</h3>
          <p>
            {shorts
              ? `Shorts ยังเป็น growth engine ชัดเจน: ${shorts.videos} วิดีโอ, วิวเฉลี่ย ${compactNumber(shorts.avgViews)}. `
              : ''}
            {topContent ? `${topContent.contentType} เป็นหมวดที่ควรใช้เป็นหัวหอกของเดือนถัดไป. ` : ''}
            Engagement เฉลี่ยของชุดข้อมูลนี้อยู่ที่ {percent(average(analytics.filteredRecords.map((record) => record.engagementRate)))} ซึ่งสะท้อนฐานแฟนที่ตอบสนองต่อคอนเทนต์ได้ดี
          </p>
        </div>
        <div className="summary-box improve">
          <h3>จุดที่ควรพัฒนา</h3>
          <p>
            {topDuration
              ? `กลุ่มความยาวที่ทำยอดเฉลี่ยดีที่สุดคือ ${topDuration.bucket}; ใช้เป็น benchmark การตัด hook. `
              : ''}
            {longForm
              ? `คอนเทนต์ยาว ${longForm.bucket} ควรตัดเป็น highlights/Shorts เพื่อเพิ่ม reach ก่อนพากลับไปดู long-form. `
              : ''}
            รักษาความถี่อัปโหลดที่ {analytics.optimalFrequency} และใช้ X/Shorts เป็น cross-promotion ก่อนปล่อยคอนเทนต์หลัก
          </p>
        </div>
      </div>
    </article>
  )
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="format-mini-stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function CategoryTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: CategoryMetric }> }) {
  if (!active || !payload?.[0]) {
    return null
  }

  const data = payload[0].payload

  return (
    <div className="custom-tooltip">
      <strong>{data.contentType}</strong>
      <span>{data.videos} วิดีโอ</span>
      <span>{compactNumber(data.avgViews)} วิวเฉลี่ย</span>
      <span>{compactNumber(data.views)} วิวรวม</span>
    </div>
  )
}

interface CategoryMetric {
  contentType: string
  videos: number
  views: number
  likes: number
  comments: number
  avgViews: number
  avgEngagementRate: number
}

function buildFormatMonthlyData(analytics: AnalyticsBundle) {
  return analytics.monthlyMetrics.map((metric) => {
    const records = analytics.filteredRecords.filter((record) => format(record.publishedAt, 'yyyy-MM') === metric.key)
    const videoRecords = records.filter(isVideoFormat)
    const talkRecords = records.filter((record) => !isVideoFormat(record))

    return {
      label: metric.label,
      videoViews: sum(videoRecords.map((record) => record.views)),
      talkViews: sum(talkRecords.map((record) => record.views)),
    }
  })
}

function buildFormatTotals(records: VideoRecord[]) {
  const videoRecords = records.filter(isVideoFormat)
  const talkRecords = records.filter((record) => !isVideoFormat(record))

  return [
    formatTotal('Video', videoRecords),
    formatTotal('Content Talk', talkRecords),
  ]
}

function buildShortsMonthlyData(analytics: AnalyticsBundle) {
  return analytics.monthlyMetrics.map((metric) => {
    const records = analytics.filteredRecords.filter(
      (record) => format(record.publishedAt, 'yyyy-MM') === metric.key && isShortVideo(record),
    )

    return {
      label: metric.label,
      views: sum(records.map((record) => record.views)),
      count: records.length,
    }
  })
}

function compactCategories(metrics: ContentTypeMetric[]): CategoryMetric[] {
  const top = metrics.slice(0, 6).map(toCategoryMetric)
  const rest = metrics.slice(6)

  if (rest.length === 0) {
    return top
  }

  const otherViews = sum(rest.map((metric) => metric.views))
  const otherVideos = sum(rest.map((metric) => metric.videos))

  return [
    ...top,
    {
      contentType: 'Other',
      videos: otherVideos,
      views: otherViews,
      likes: sum(rest.map((metric) => metric.likes)),
      comments: sum(rest.map((metric) => metric.comments)),
      avgViews: safeDivide(otherViews, otherVideos),
      avgEngagementRate: averageWeighted(rest.map((metric) => [metric.avgEngagementRate, metric.videos])),
    },
  ]
}

function toCategoryMetric(metric: ContentTypeMetric): CategoryMetric {
  return {
    contentType: metric.contentType,
    videos: metric.videos,
    views: metric.views,
    likes: metric.likes,
    comments: metric.comments,
    avgViews: metric.avgViews,
    avgEngagementRate: metric.avgEngagementRate,
  }
}

function formatTotal(name: 'Video' | 'Content Talk', records: VideoRecord[]) {
  const views = sum(records.map((record) => record.views))

  return {
    name,
    views,
    videos: records.length,
    avgViews: safeDivide(views, records.length),
  }
}

function isVideoFormat(record: VideoRecord) {
  const searchable = `${record.title} ${record.contentType} ${record.tags.join(' ')}`.toLowerCase()
  return isShortVideo(record) || /cover|mv|music|song|sing|karaoke|เพลง|ร้อง|short/.test(searchable)
}

function isShortVideo(record: VideoRecord) {
  return /short/i.test(record.contentType) || record.minutes <= 1.2 || record.tags.some((tag) => /short/i.test(tag))
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0)
}

function safeDivide(value: number, divisor: number) {
  return divisor === 0 ? 0 : value / divisor
}

function average(values: number[]) {
  return safeDivide(sum(values), values.length)
}

function averageWeighted(values: Array<[number, number]>) {
  const totalWeight = sum(values.map(([, weight]) => weight))
  return safeDivide(sum(values.map(([value, weight]) => value * weight)), totalWeight)
}
