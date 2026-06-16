export interface ChannelLink {
  id: string
  label: string
  href: string
  kind: 'youtube' | 'x' | 'website' | 'github'
}

export interface ChannelMeta {
  displayName: string
  tagline: string
  debutDate: string
  genres: string[]
  youtubeSubscribers: number
  youtubeSubscribersAsOf: string
  links: ChannelLink[]
  project: {
    author: string
    githubUrl: string
    licenseUrl: string
    kind: 'fan-made'
  }
}

export const CHANNEL_META: ChannelMeta = {
  displayName: 'Marine Chariot',
  tagline: 'Necromancer Lady · แฟนคลับ Yhoi',
  debutDate: '2023-04-15',
  genres: ['เกม', 'ฟรีทอร์ก', 'ร้องเพลง', 'วาดรูป', 'เล่าเรื่อง'],
  youtubeSubscribers: 5690,
  youtubeSubscribersAsOf: '2026-06-01',
  links: [
    {
      id: 'youtube',
      label: 'YouTube',
      href: 'https://www.youtube.com/@MarineOjou-sama',
      kind: 'youtube',
    },
    {
      id: 'x',
      label: 'X',
      href: 'https://x.com/MarineChariot',
      kind: 'x',
    },
    {
      id: 'website',
      label: 'เว็บไซต์',
      href: 'https://secretgarden-artist.carrd.co',
      kind: 'website',
    },
    {
      id: 'github',
      label: 'GitHub',
      href: 'https://github.com/Icezaza2543/Marine-Chariot-VTuber-Analytics',
      kind: 'github',
    },
  ],
  project: {
    author: 'Icezaza2543',
    githubUrl: 'https://github.com/Icezaza2543/Marine-Chariot-VTuber-Analytics',
    licenseUrl: 'https://github.com/Icezaza2543/Marine-Chariot-VTuber-Analytics/blob/master/LICENSE',
    kind: 'fan-made',
  },
}