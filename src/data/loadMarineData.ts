import { getISOWeek, getMonth, getYear, parseISO } from 'date-fns'
import Papa from 'papaparse'
import { z } from 'zod'
import type { RawMarineRow, VideoRecord } from '../types'

const LOCAL_DATA_PATH = '/data/marine-ch-data.csv'
const DEFAULT_GOOGLE_SHEET_CSV_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vTyNpRUR1B4SDX_VKOIDndOfodMaEMuojtK7SYocFy6oz6bHtJ_uxmMDTvmipvu8H_7o7yNb5rgq0fq/pub?gid=0&single=true&output=csv'

const DATA_PATH =
  import.meta.env.VITE_MARINE_CSV_URL?.trim() || DEFAULT_GOOGLE_SHEET_CSV_URL

const marineCsvRowSchema = z.object({
  No: z.string(),
  Urls: z.string(),
  'Video Name': z.string(),
  View: z.string(),
  Like: z.string(),
  Comm: z.string(),
  published_date: z.string(),
  duration: z.string(),
  minute: z.string(),
  type: z.string(),
  'Engagement Rate': z.string(),
  'AVG View Duration': z.string(),
  'Views to Likes Ratio': z.string(),
}).passthrough()

const REQUIRED_CSV_FIELDS = Object.keys(marineCsvRowSchema.shape) as Array<keyof RawMarineRow>

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
  const { csvText, sourcePath } = await loadCsvPayload(DATA_PATH)
  const parsed = Papa.parse<RawMarineRow>(csvText, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
  })

  if (parsed.errors.length > 0) {
    throw new Error(
      `Cannot parse Marine Chariot CSV from ${sourcePath}: ${parsed.errors
        .map((error) => error.message)
        .join(', ')}`,
    )
  }

  const rows = validateCsvRows(parsed.data, parsed.meta.fields ?? [], sourcePath)
  const records = rows
    .map(normalizeRow)
    .filter((record): record is VideoRecord => record !== null)
    .sort((a, b) => a.publishedAt.getTime() - b.publishedAt.getTime())

  return scoreVideos(records)
}

function validateCsvRows(rows: RawMarineRow[], fields: string[], sourcePath: string): RawMarineRow[] {
  const missingFields = REQUIRED_CSV_FIELDS.filter((field) => !fields.includes(field))

  if (missingFields.length > 0) {
    throw new Error(
      `Marine Chariot CSV from ${sourcePath} is missing required CSV fields: ${missingFields.join(', ')}`,
    )
  }

  return rows.map((row, index) => {
    const result = marineCsvRowSchema.safeParse(row)

    if (!result.success) {
      throw new Error(
        `Marine Chariot CSV from ${sourcePath} has invalid row ${index + 2}: ${formatZodIssues(result.error.issues)}`,
      )
    }

    return result.data
  })
}

function formatZodIssues(issues: z.core.$ZodIssue[]) {
  return issues
    .map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join('.') : 'row'
      return `${path} ${issue.message}`
    })
    .join('; ')
}

async function loadCsvPayload(primaryPath: string) {
  try {
    return await fetchCsvPayload(primaryPath)
  } catch (primaryError) {
    if (primaryPath === LOCAL_DATA_PATH) {
      throw primaryError
    }

    try {
      return await fetchCsvPayload(LOCAL_DATA_PATH)
    } catch (fallbackError) {
      throw new Error(
        `Cannot load Marine Chariot CSV. Primary source failed: ${describeError(
          primaryError,
        )}. Local fallback failed: ${describeError(fallbackError)}`,
      )
    }
  }
}

async function fetchCsvPayload(sourcePath: string) {
  const response = await fetch(addCacheBuster(sourcePath), { cache: 'no-store' })

  if (!response.ok) {
    throw new Error(`${sourcePath} returned HTTP ${response.status}`)
  }

  return {
    csvText: await response.text(),
    sourcePath,
  }
}

function addCacheBuster(sourcePath: string) {
  const separator = sourcePath.includes('?') ? '&' : '?'
  return `${sourcePath}${separator}refresh=${Date.now()}`
}

function describeError(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

function normalizeRow(row: RawMarineRow): VideoRecord | null {
  const date = parseISO(row.published_date)

  if (Number.isNaN(date.getTime())) {
    return null
  }

  const minutes = parseNumeric(row.minute) || durationToMinutes(row.duration)
  const avgViewDurationRatio = parseNumeric(row['AVG View Duration'])
  const contentType = normalizeContentType(row.type, row['Video Name'])

  if (contentType === 'ไม่ระบุ') {
    return null
  }

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
