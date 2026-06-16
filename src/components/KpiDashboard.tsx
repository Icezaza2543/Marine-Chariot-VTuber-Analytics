import { motion } from 'framer-motion'
import { Eye, Heart, MessageCircle, Play, Radio, Timer } from 'lucide-react'

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

        return (
          <motion.article
            className={`kpi-card tone-${kpi.tone}`}
            key={kpi.label}
            whileHover={{ y: -3 }}
            transition={{ type: 'spring', stiffness: 260, damping: 18 }}
          >
            <div className="kpi-icon mb-2">
              <Icon className="h-4 w-4" />
            </div>
            <p className="mt-4 text-xs font-medium uppercase text-[var(--mc-muted)]">{kpi.label}</p>
            <p className="mt-1 text-2xl font-bold text-white">{kpi.value}</p>
          </motion.article>
        )
      })}
    </section>
  )
}
