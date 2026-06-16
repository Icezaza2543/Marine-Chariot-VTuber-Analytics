import { getISOWeek, getMonth, getYear, parseISO } from 'date-fns'
import Papa from 'papaparse'
import type { RawMarineRow, VideoRecord } from '../types'

const DATA_PATH = '/data/marine-ch-data.csv'

const keywordTags: Array<[RegExp, string]> = [
  [/asmr/i, 'ASMR'],
  [/shorts?|shots?/i, 'Shorts'],
  [/free\s*talk|freetalk|ฟรีทอร์ก|content talk/i, 'FreeTalk'],
  [/ร้อง|เพลง|sing|karaoke/i, 'ร้องเพลง'],
  [/วาด|draw|illust/i, 'Drawing'],
  [/collab|คอลแลบ|ร่วม/i, 'Collab'],
  [/game|gaming|【.+】/i, 'Gaming'],
  [/ผี|ghost|horror/i, 'เล่าเรื่องผี'],
  [/ประกาศ|event|อีเวนต์/i, 'ประกาศ/อีเวนต์'],
]

const contentTypeAliases: Array<[RegExp, string]> = [
  [/^(shorts?|shots?)$/i, 'Shorts'],
  [/^(gaming|game|เล่นเกม)$/i, 'Gaming'],
  [/^(free\s*talk|freetalk|ฟรีทอร์ก|content talk)$/i, 'FreeTalk'],
  [/^(drawing|draw|วาดรูป)$/i, 'Drawing'],
]

export async function loadMarineData() {
  const response = await fetch(DATA_PATH)

  if (!response.ok) {
    throw new Error(`Cannot load Marine Chariot CSV from ${DATA_PATH}`)
  }

  const csvText = await response.text()
  const parsed = Papa.parse<RawMarineRow>(csvText, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
  })

  if (parsed.errors.length > 0) {
    throw new Error(parsed.errors.map((error) => error.message).join(', '))
  }

  const records = parsed.data
    .map(normalizeRow)
    .filter((record): record is VideoRecord => record !== null)
    .sort((a, b) => a.publishedAt.getTime() - b.publishedAt.getTime())

  return scoreVideos(records)
}

function normalizeRow(row: RawMarineRow): VideoRecord | null {
  const date = parseISO(row.published_date)

  if (Number.isNaN(date.getTime())) {
    return null
  }

  const minutes = parseNumeric(row.minute) || durationToMinutes(row.duration)
  const avgViewDurationRatio = parseNumeric(row['AVG View Duration'])
  const contentType = normalizeContentType(row.type, row['Video Name'])
  const tags = extractTags(row['Video Name'], contentType)
  const retentionMinutes = minutes * avgViewDurationRatio

  return {
    id: parseInteger(row.No),
    url: row.Urls.trim(),
    title: row['Video Name'].trim(),
    views: parseInteger(row.View),
    likes: parseInteger(row.Like),
    comments: parseInteger(row.Comm),
    publishedAt: date,
    publishedDate: row.published_date,
    duration: row.duration.trim(),
    minutes,
    contentType,
    engagementRate: parseNumeric(row['Engagement Rate']),
    avgViewDurationRatio,
    viewsToLikesRatio: parseNumeric(row['Views to Likes Ratio']),
    tags,
    retentionMinutes,
    retentionScore: clamp((avgViewDurationRatio / 0.12) * 100, 0, 100),
    viralScore: 0,
    uploadYear: getYear(date),
    uploadMonth: getMonth(date) + 1,
    uploadWeek: getISOWeek(date),
    weekday: date.getDay(),
  }
}

function scoreVideos(records: VideoRecord[]) {
  const maxViews = Math.max(...records.map((record) => record.views), 1)
  const maxComments = Math.max(...records.map((record) => record.comments), 1)
  const maxEngagement = Math.max(...records.map((record) => record.engagementRate), 0.01)
  const newestTime = Math.max(...records.map((record) => record.publishedAt.getTime()))

  return records.map((record) => {
    const daysSinceNewest = Math.max(
      0,
      (newestTime - record.publishedAt.getTime()) / 86_400_000,
    )
    const recencyBoost = 1 - Math.min(daysSinceNewest, 365) / 365
    const score =
      (record.views / maxViews) * 42 +
      (record.engagementRate / maxEngagement) * 24 +
      (record.comments / maxComments) * 12 +
      (record.retentionScore / 100) * 12 +
      recencyBoost * 10

    return {
      ...record,
      viralScore: clamp(score, 0, 100),
    }
  })
}

function normalizeContentType(type: string, title: string) {
  const cleanType = type.trim()

  if (/asmr/i.test(title)) {
    return 'ASMR'
  }

  for (const [pattern, label] of contentTypeAliases) {
    if (pattern.test(cleanType)) {
      return label
    }
  }

  return cleanType || 'ไม่ระบุ'
}

function extractTags(title: string, contentType: string) {
  const tags = new Set<string>([contentType])
  const bracketMatches = title.matchAll(/[【\[]([^】\]]+)[】\]]/g)

  for (const match of bracketMatches) {
    const value = match[1]?.trim()

    if (value) {
      tags.add(value.replace(/\s+/g, ' '))
    }
  }

  for (const [pattern, label] of keywordTags) {
    if (pattern.test(title) || pattern.test(contentType)) {
      tags.add(label)
    }
  }

  return Array.from(tags)
}

function durationToMinutes(duration: string) {
  const parts = duration
    .split(':')
    .map((part) => Number(part))
    .filter((part) => Number.isFinite(part))

  if (parts.length === 3) {
    return parts[0] * 60 + parts[1] + parts[2] / 60
  }

  if (parts.length === 2) {
    return parts[0] + parts[1] / 60
  }

  return parts[0] || 0
}

function parseNumeric(value: string) {
  const parsed = Number(String(value).replaceAll(',', '').trim())
  return Number.isFinite(parsed) ? parsed : 0
}

function parseInteger(value: string) {
  return Math.round(parseNumeric(value))
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}
