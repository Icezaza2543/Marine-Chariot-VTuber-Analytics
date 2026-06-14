import { motion } from 'framer-motion'
import { ArrowDownRight, ArrowUpRight, Eye, Heart, MessageCircle, Play, Radio, Timer } from 'lucide-react'
import { signedPercent } from '../lib/format'
import type { KpiValue } from '../types'

const icons = [Eye, Heart, Radio, Play, MessageCircle, Timer]

interface KpiDashboardProps {
  kpis: KpiValue[]
}

export function KpiDashboard({ kpis }: KpiDashboardProps) {
  return (
    <section className="kpi-grid">
      {kpis.map((kpi, index) => {
        const Icon = icons[index] ?? Eye
        const isPositive = kpi.delta >= 0
        const TrendIcon = isPositive ? ArrowUpRight : ArrowDownRight

        return (
          <motion.article
            className={`kpi-card tone-${kpi.tone}`}
            key={kpi.label}
            whileHover={{ y: -3 }}
            transition={{ type: 'spring', stiffness: 260, damping: 18 }}
          >
            <div className="flex items-center justify-between">
              <div className="kpi-icon">
                <Icon className="h-4 w-4" />
              </div>
              <span className={isPositive ? 'trend-positive' : 'trend-negative'}>
                <TrendIcon className="h-3.5 w-3.5" />
                {signedPercent(kpi.delta)}
              </span>
            </div>
            <p className="mt-4 text-xs font-medium uppercase text-[var(--mc-muted)]">{kpi.label}</p>
            <p className="mt-1 text-2xl font-bold text-white">{kpi.value}</p>
          </motion.article>
        )
      })}
    </section>
  )
}
