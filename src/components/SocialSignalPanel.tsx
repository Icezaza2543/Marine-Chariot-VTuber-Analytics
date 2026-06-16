import { AtSign, ExternalLink, Hash, RadioTower, Sparkles } from 'lucide-react'
import { compactNumber, percent } from '../lib/format'
import type { AnalyticsBundle } from '../types'
import { SectionInsight } from './SectionInsight'

interface SocialSignalPanelProps {
  analytics: AnalyticsBundle
}

export function SocialSignalPanel({ analytics }: SocialSignalPanelProps) {
  const social = analytics.social
  const topPostPreview = social.topPost?.text.slice(0, 170) ?? 'ยังไม่มีโพสต์ X ใน cache'

  return (
    <article className="chart-panel social-panel">
      <div className="panel-heading">
        <div>
          <h2>สัญญาณจาก X</h2>
          <p>{social.status === 'ready' ? `อัปเดตล่าสุด ${social.fetchedAt ?? '-'}` : social.statusMessage}</p>
        </div>
        <a className="panel-badge" href={social.sourceUrl} rel="noreferrer" target="_blank">
          <AtSign className="h-3.5 w-3.5" />
          @{social.profile?.username ?? 'MarineChariot'}
        </a>
      </div>

      <div className="social-stat-grid">
        <SocialStat label="โพสต์ X" value={compactNumber(social.postCount)} icon="posts" />
        <SocialStat label="Engagement" value={compactNumber(social.totalEngagement)} icon="engagement" />
        <SocialStat label="Reach โดยประมาณ" value={compactNumber(social.estimatedReach)} icon="reach" />
        <SocialStat label="โปรโมตข้ามช่อง" value={percent(social.crossPromoRate)} icon="promo" />
      </div>

      <div className="social-top-post">
        <div className="flex items-center justify-between gap-3">
          <strong>โพสต์ X เด่นสุด</strong>
          {social.topPost ? (
            <a href={social.topPost.url} rel="noreferrer" target="_blank">
              เปิดดู
              <ExternalLink className="h-3 w-3" />
            </a>
          ) : null}
        </div>
        <p>{topPostPreview}</p>
      </div>

      {social.topHashtags.length > 0 ? (
        <div className="hashtag-row">
          {social.topHashtags.map((tag) => (
            <span key={tag.tag}>
              <Hash className="h-3 w-3" />
              {tag.tag.replace(/^#/, '')}
              <em>{tag.count}</em>
            </span>
          ))}
        </div>
      ) : null}

      <div className="social-match-list">
        {social.videoMatches.slice(0, 3).map((match) => (
          <div className="social-match-row" key={match.videoId}>
            <div className="min-w-0">
              <strong>{match.title}</strong>
              <span>
                {match.matchedPostCount} โพสต์ · social engagement {compactNumber(match.socialEngagement)}
              </span>
            </div>
            <em>{match.liftScore.toFixed(1)}</em>
          </div>
        ))}
        {social.videoMatches.length === 0 ? (
          <div className="social-empty">
            ใส่ YouTube URL หรือ keyword ชื่อคลิปในโพสต์ X แล้วรัน fetch ใหม่เพื่อจับคู่ social lift
          </div>
        ) : null}
      </div>

      <SectionInsight>{analytics.sectionInsights.social}</SectionInsight>
    </article>
  )
}

interface SocialStatProps {
  label: string
  value: string
  icon: 'posts' | 'engagement' | 'reach' | 'promo'
}

function SocialStat({ label, value, icon }: SocialStatProps) {
  const Icon = icon === 'posts' ? AtSign : icon === 'reach' ? RadioTower : icon === 'promo' ? Sparkles : Hash

  return (
    <div className="social-stat">
      <Icon className="h-4 w-4" />
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}
