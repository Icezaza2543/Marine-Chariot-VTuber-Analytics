import { Flame } from 'lucide-react'
import { compactNumber, percent } from '../../lib/format'
import type { AnalyticsPanelProps } from './shared'
import { average } from './shared'

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
