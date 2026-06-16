import { motion } from 'framer-motion'
import { BrainCircuit, Crosshair, Flame, Lightbulb, Megaphone, RadioTower } from 'lucide-react'
import { compactNumber, percent } from '../lib/format'
import type { AnalyticsBundle, StrategyInsight } from '../types'

const insightIcons = [BrainCircuit, Lightbulb, RadioTower, Crosshair, Flame]

interface InsightPanelProps {
  analytics: AnalyticsBundle
  compact?: boolean
}

export function InsightPanel({ analytics, compact = false }: InsightPanelProps) {
  const recommendation = analytics.nextContentRecommendation
  const bestSlot = analytics.bestPostingSlot
  const insights = compact ? analytics.insights.slice(0, 3) : analytics.insights

  return (
    <div className="insight-panel">
      <div className="panel-heading">
        <div>
          <h2>AI Insight ภาษาไทย</h2>
          <p>คำแนะนำกลยุทธ์จากข้อมูลล่าสุด</p>
        </div>
        <div className="panel-badge">
          <BrainCircuit className="h-3.5 w-3.5" />
          สด
        </div>
      </div>

      <div className="recommend-card">
        <Megaphone className="h-5 w-5 text-[var(--mc-cyan)]" />
        <div>
          <span>คอนเทนต์ที่ควรดันต่อ</span>
          <strong>{recommendation?.contentType ?? '-'}</strong>
          <p>
            {recommendation
              ? `${compactNumber(recommendation.avgViews)} วิวเฉลี่ย · มีส่วนร่วม ${percent(recommendation.avgEngagementRate)}`
              : 'ไม่มีข้อมูลหลัง filter ปัจจุบัน'}
          </p>
        </div>
      </div>

      <div className="insight-stack">
        {insights.map((insight, index) => (
          <InsightCard insight={insight} index={index} key={insight.title} />
        ))}
      </div>

      <div className="strategy-grid">
        <div>
          <span>ความถี่ที่เหมาะ</span>
          <strong>{analytics.optimalFrequency}</strong>
        </div>
        <div>
          <span>ช่วงเวลาลงคลิป</span>
          <strong>{bestSlot ? `${bestSlot.weekdayLabel} ${bestSlot.slot}` : '-'}</strong>
        </div>
        <div>
          <span>โปรโมตข้ามแพลตฟอร์ม</span>
          <strong>{analytics.social.crossPromoPostCount > 0 ? 'X → YouTube' : 'Shorts → Long-form'}</strong>
        </div>
        <div>
          <span>เติบโตคาดการณ์</span>
          <strong>{analytics.projectedGrowthRate.toFixed(1)}%</strong>
        </div>
      </div>
    </div>
  )
}

interface InsightCardProps {
  insight: StrategyInsight
  index: number
}

function InsightCard({ insight, index }: InsightCardProps) {
  const Icon = insightIcons[index % insightIcons.length]

  return (
    <motion.article
      className={`insight-card tone-${insight.tone}`}
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04, duration: 0.32 }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4" />
          <h3>{insight.title}</h3>
        </div>
        <span>{insight.confidence}%</span>
      </div>
      <p>{insight.body}</p>
    </motion.article>
  )
}
