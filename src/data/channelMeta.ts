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
  tagline: 'I am a necromancer 🦋 independent Vtuber',
  debutDate: '2022-09-22',
  genres: ['เล่าเรื่อง', 'เล่นเกม', 'พูดคุย', 'วาดรูป'],
  youtubeSubscribers: 5690,
  youtubeSubscribersAsOf: '2026-06-16',
  links: [
    {
      id: 'youtube',
      label: 'YouTube',
      href: 'https://www.youtube.com/@MarineOjou-sama',
      kind: 'youtube',
    },
    {
      id: 'x',
      label: 'X (Twitter)',
      href: 'https://twitter.com/MarineChariot',
      kind: 'x',
    },
    {
      id: 'website',
      label: 'Website',
      href: 'https://secretgarden-artist.carrd.co',
      kind: 'website',
    },
    {
      id: 'pixiv',
      label: 'Pixiv',
      href: 'https://www.pixiv.net/en/users/49549782',
      kind: 'website',
    },
    {
      id: 'easydonate',
      label: 'EasyDonate',
      href: 'https://ezdn.app/marinechariot',
      kind: 'website',
    },
    {
      id: 'kofi',
      label: 'Ko-fi',
      href: 'https://ko-fi.com/K3K6T85JO',
      kind: 'website',
    },
    {
      id: 'vgen',
      label: 'V-Gen',
      href: 'https://vgen.co/Saraorigami',
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