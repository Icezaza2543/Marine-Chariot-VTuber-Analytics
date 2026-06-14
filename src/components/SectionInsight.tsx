import { Sparkles } from 'lucide-react'
import type { ReactNode } from 'react'

interface SectionInsightProps {
  children: ReactNode
}

export function SectionInsight({ children }: SectionInsightProps) {
  return (
    <div className="section-insight">
      <Sparkles className="h-4 w-4 shrink-0 text-[var(--mc-cyan)]" />
      <p>{children}</p>
    </div>
  )
}
