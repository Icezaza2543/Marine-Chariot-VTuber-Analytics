import { AtSign, ExternalLink, GitBranch, Globe, Play } from 'lucide-react'
import type { ChannelLink } from '../data/channelMeta'

const iconMap = {
  youtube: Play,
  x: AtSign,
  website: Globe,
  github: GitBranch,
} as const

interface OfficialLinksProps {
  links: ChannelLink[]
  compact?: boolean
}

export function OfficialLinks({ links, compact = false }: OfficialLinksProps) {
  return (
    <nav aria-label="ลิงก์ช่องทางอย่างเป็นทางการ" className={`official-links${compact ? ' official-links--compact' : ''}`}>
      {links.map((link) => {
        const Icon = iconMap[link.kind]

        return (
          <a
            className="official-link"
            href={link.href}
            key={link.id}
            rel="noreferrer"
            target="_blank"
          >
            <Icon aria-hidden="true" className="h-3.5 w-3.5" />
            <span>{link.label}</span>
            {!compact ? <ExternalLink aria-hidden="true" className="h-3 w-3 official-link__external" /> : null}
          </a>
        )
      })}
    </nav>
  )
}