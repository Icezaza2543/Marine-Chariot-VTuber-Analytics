import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { th } from 'date-fns/locale'
import { CHANNEL_META } from '../data/channelMeta'
import { DisclaimerDialog } from './DisclaimerDialog'

interface SiteFooterProps {
  dataStartDate: string
  dataEndDate: string
  xFetchedAt: string | null
}

function formatThaiDate(value: string) {
  const date = parseISO(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return format(date, 'd MMM yyyy', { locale: th })
}

export function SiteFooter({ dataStartDate, dataEndDate, xFetchedAt }: SiteFooterProps) {
  const [disclaimerOpen, setDisclaimerOpen] = useState(false)
  const { project } = CHANNEL_META

  return (
    <>
      <footer className="mt-12 py-8 border-t border-[var(--mc-border)] bg-[var(--mc-surface)] relative overflow-hidden">
        {/* Decorative background accents */}
        <div className="absolute top-0 left-1/4 w-64 h-64 bg-[var(--mc-cyan)]/5 rounded-full blur-3xl -translate-y-1/2 pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-[var(--mc-magenta)]/5 rounded-full blur-3xl translate-y-1/2 pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 relative z-10 flex flex-col md:flex-row justify-between items-center md:items-start gap-8">
          
          <div className="text-center md:text-left flex-1 max-w-lg">
            <h2 className="text-lg font-bold text-white flex items-center justify-center md:justify-start gap-2 mb-2">
              <span className="text-[var(--mc-cyan)]">{CHANNEL_META.displayName}</span> Analytics 🦋
            </h2>
            <p className="text-sm text-[var(--mc-text-muted)] mb-1">
              ข้อมูล YouTube {formatThaiDate(dataStartDate)} – {formatThaiDate(dataEndDate)}
              {xFetchedAt ? ` · X cache ${formatThaiDate(xFetchedAt)}` : ' · X cache ยังไม่ถูก fetch'}
            </p>
            <p className="text-xs text-slate-500 opacity-80">
              โปรเจกต์ fan-made ไม่เกี่ยวข้องกับเจ้าของช่องอย่างเป็นทางการ · เจ้าของข้อมูลและคอนเทนต์: Marine Chariot
            </p>
            <p className="text-xs text-slate-500 opacity-80">
              โค้ดอยู่ภายใต้ MIT License; สิทธิ์นี้ไม่ครอบคลุมข้อมูลช่อง แบรนด์ วิดีโอ โพสต์ หรือสื่อของ Marine Chariot
            </p>
          </div>

          <div className="flex flex-col items-center md:items-end gap-3">
            <nav aria-label="ลิงก์โปรเจกต์" className="flex items-center gap-4 text-sm text-[var(--mc-text-muted)] font-medium">
              <a href={project.githubUrl} rel="noreferrer" target="_blank" className="hover:text-[var(--mc-cyan)] transition-colors">
                GitHub
              </a>
              <button onClick={() => setDisclaimerOpen(true)} type="button" className="hover:text-[var(--mc-cyan)] transition-colors">
                Disclaimer
              </button>
              <a href={project.licenseUrl} rel="noreferrer" target="_blank" className="hover:text-[var(--mc-cyan)] transition-colors">
                Code License
              </a>
              <a href={project.noticeUrl} rel="noreferrer" target="_blank" className="hover:text-[var(--mc-cyan)] transition-colors">
                Data Notice
              </a>
            </nav>
            <p className="text-xs px-3 py-1 rounded-full bg-[var(--mc-surface-hover)] border border-[var(--mc-border)] text-slate-400">
              Made by <span className="text-[var(--mc-magenta)] font-medium">{project.author}</span>
            </p>
          </div>
          
        </div>
      </footer>

      <DisclaimerDialog onClose={() => setDisclaimerOpen(false)} open={disclaimerOpen} />
    </>
  )
}
