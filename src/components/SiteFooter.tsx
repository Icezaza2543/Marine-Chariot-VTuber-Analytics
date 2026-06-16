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
      <footer className="site-footer">
        <div className="site-footer__copy">
          <p className="site-footer__title">Marine Chariot Analytics</p>
          <p className="site-footer__meta">
            ข้อมูล YouTube {formatThaiDate(dataStartDate)} – {formatThaiDate(dataEndDate)}
            {xFetchedAt ? ` · X cache ${formatThaiDate(xFetchedAt)}` : ' · X cache ยังไม่ถูก fetch'}
          </p>
          <p className="site-footer__note">
            โปรเจกต์ fan-made ไม่เกี่ยวข้องกับเจ้าของช่องอย่างเป็นทางการ · แหล่งข้อมูล: YouTube export + X API
          </p>
        </div>

        <nav aria-label="ลิงก์โปรเจกต์" className="site-footer__nav">
          <a href={project.githubUrl} rel="noreferrer" target="_blank">
            GitHub
          </a>
          <button onClick={() => setDisclaimerOpen(true)} type="button">
            Disclaimer
          </button>
          <a href={project.licenseUrl} rel="noreferrer" target="_blank">
            MIT License
          </a>
        </nav>

        <p className="site-footer__credit">
          Made by {project.author}
        </p>
      </footer>

      <DisclaimerDialog onClose={() => setDisclaimerOpen(false)} open={disclaimerOpen} />
    </>
  )
}