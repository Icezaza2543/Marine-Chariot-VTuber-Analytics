import { format, parseISO } from 'date-fns'
import { th } from 'date-fns/locale'
import { motion } from 'framer-motion'
import { Play, Sparkles, Users } from 'lucide-react'
import { STACK_ARCHITECTURE } from '../architecture'
import { CHANNEL_META } from '../data/channelMeta'
import { compactNumber } from '../lib/format'
import type { AnalyticsBundle } from '../types'
import { OfficialLinks } from './OfficialLinks'
import { SiteFooter } from './SiteFooter'

interface AppShellProps {
  analytics: AnalyticsBundle
  children: React.ReactNode
}

function formatDebutDate(value: string) {
  const date = parseISO(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return format(date, 'd MMM yyyy', { locale: th })
}

function formatSnapshotDate(value: string) {
  const date = parseISO(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return format(date, 'MMM yyyy', { locale: th })
}

export function AppShell({ analytics, children }: AppShellProps) {
  const firstRecord = analytics.records[0]
  const lastRecord = analytics.records.at(-1)
  const firstDate = firstRecord?.publishedDate ?? '-'
  const lastDate = lastRecord?.publishedDate ?? '-'
  const profile = analytics.social.profile
  const avatarUrl = profile?.profileImageUrl
  const xFollowers = profile?.followersCount
  const headerLinks = CHANNEL_META.links.filter((link) => link.kind !== 'github')

  return (
    <div className="app-shell" data-stack={STACK_ARCHITECTURE.framework}>
      <header className="app-header">
        <div className="header-brand-block">
          {avatarUrl ? (
            <img alt="" className="channel-avatar" src={avatarUrl} />
          ) : (
            <div className="brand-mark" aria-hidden="true">
              <Sparkles className="h-5 w-5" />
            </div>
          )}

          <div className="header-copy min-w-0">
            <h1 className="truncate text-lg font-bold text-white sm:text-xl">
              {CHANNEL_META.displayName} Analytics
            </h1>
            <p className="channel-bio">
              VTuber TH · เดบิวต์ {formatDebutDate(CHANNEL_META.debutDate)} · {CHANNEL_META.genres.join(' / ')}
            </p>
            <p className="channel-tagline">{CHANNEL_META.tagline}</p>
            <p className="channel-range">
              ช่วงข้อมูลวิเคราะห์ {firstDate} ถึง {lastDate}
            </p>
          </div>
        </div>

        <div className="header-side">
          <div aria-label="ข้อมูลช่องทาง" className="channel-snapshot" role="group">
            <div className="snapshot-stat">
              <span className="snapshot-stat__label">
                <Play aria-hidden="true" className="h-3.5 w-3.5" />
                ยอดซับ
              </span>
              <strong>{compactNumber(CHANNEL_META.youtubeSubscribers)}</strong>
              <span className="snapshot-stat__note">
                ณ {formatSnapshotDate(CHANNEL_META.youtubeSubscribersAsOf)}
              </span>
            </div>

            {xFollowers != null && xFollowers > 0 ? (
              <div className="snapshot-stat">
                <span className="snapshot-stat__label">
                  <Users aria-hidden="true" className="h-3.5 w-3.5" />
                  ผู้ติดตาม X
                </span>
                <strong>{compactNumber(xFollowers)}</strong>
                <span className="snapshot-stat__note">จาก X API cache</span>
              </div>
            ) : null}
          </div>

          <OfficialLinks compact links={headerLinks} />
          <span className="report-badge">VTUBER TH</span>
        </div>
      </header>

      <motion.div
        className="dashboard-layout"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        {children}
      </motion.div>

      <SiteFooter
        dataEndDate={lastDate}
        dataStartDate={firstDate}
        xFetchedAt={analytics.social.fetchedAt}
      />
    </div>
  )
}