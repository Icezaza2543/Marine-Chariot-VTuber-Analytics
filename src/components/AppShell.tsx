import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import { STACK_ARCHITECTURE } from '../architecture'
import type { AnalyticsBundle } from '../types'

interface AppShellProps {
  analytics: AnalyticsBundle
  children: React.ReactNode
}

export function AppShell({ analytics, children }: AppShellProps) {
  const firstDate = analytics.records[0]?.publishedDate ?? '-'
  const lastDate = analytics.records.at(-1)?.publishedDate ?? '-'

  return (
    <div className="app-shell" data-stack={STACK_ARCHITECTURE.framework}>
      <header className="app-header">
        <div className="flex min-w-0 items-center gap-3">
          <div className="brand-mark" aria-hidden="true">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold text-white sm:text-xl">Marine Chariot Analytics</h1>
            <p className="truncate text-xs text-[var(--mc-muted)]">
              VTuber Growth Command Center · {firstDate} to {lastDate}
            </p>
          </div>
        </div>

        <div className="header-metrics">
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
    </div>
  )
}
