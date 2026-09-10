import { getISOWeek, getMonth, getYear, parseISO } from 'date-fns'
import Papa from 'papaparse'
import { z } from 'zod'
import type { RawMarineRow, VideoRecord } from '../types.ts'

const marineCsvRowSchema = z
  .object({
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
  })
  .passthrough()

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

export function parseMarineCsv(csvText: string, sourcePath: string) {
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
  const completeRows: RawMarineRow[] = []
  let skippedRows = 0
  const records = rows
    .flatMap((row, index) => {
      // Published-sheet draft rows must not become zero-valued analytics.
      if (
        REQUIRED_CSV_FIELDS.some(
          (field) => field !== 'minute' && field !== 'duration' && !row[field].trim(),
        ) ||
        (!row.minute.trim() && !row.duration.trim())
      ) {
        skippedRows++
        return []
      }
      const record = normalizeRow(row, index + 2, sourcePath)
      completeRows.push(row)
      return [record]
    })
    .sort((a, b) => a.publishedAt.getTime() - b.publishedAt.getTime())

  if (!records.length)
    throw new Error(`Marine Chariot CSV from ${sourcePath} has no complete data rows`)
  const scoredRecords = scoreVideos(records)

  return { records: scoredRecords, rows: completeRows, skippedRows }
}

function validateCsvRows(
  rows: RawMarineRow[],
  fields: string[],
  sourcePath: string,
): RawMarineRow[] {
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

function normalizeRow(row: RawMarineRow, rowNumber: number, sourcePath: string): VideoRecord {
  const date = parseISO(row.published_date)

  if (Number.isNaN(date.getTime())) {
    throw dataError(sourcePath, rowNumber, 'published_date', row.published_date)
  }

  const parsedMinutes = row.minute.trim()
    ? parseRequiredNumeric(row.minute, 'minute', rowNumber, sourcePath)
    : 0
  const minutes = parsedMinutes || durationToMinutes(row.duration, rowNumber, sourcePath)
  const avgViewDurationRatio = parseRequiredNumeric(
    row['AVG View Duration'],
    'AVG View Duration',
    rowNumber,
    sourcePath,
  )
  const contentType = normalizeContentType(row.type, row['Video Name'])

  if (contentType === 'ไม่ระบุ') {
    throw dataError(sourcePath, rowNumber, 'type', row.type)
  }

  const id = parseRequiredInteger(row.No, 'No', rowNumber, sourcePath)
  const url = validateYouTubeUrl(row.Urls, rowNumber, sourcePath)
  const title = row['Video Name'].trim()

  if (!title) {
    throw dataError(sourcePath, rowNumber, 'Video Name', row['Video Name'])
  }

  const tags = extractTags(row['Video Name'], contentType)
  const retentionMinutes = minutes * avgViewDurationRatio

  return {
    id,
    url,
    title,
    views: parseRequiredInteger(row.View, 'View', rowNumber, sourcePath),
    likes: parseRequiredInteger(row.Like, 'Like', rowNumber, sourcePath),
    comments: parseRequiredInteger(row.Comm, 'Comm', rowNumber, sourcePath),
    publishedAt: date,
    publishedDate: row.published_date,
    duration: row.duration.trim(),
    minutes,
    contentType,
    engagementRate: parseRequiredNumeric(
      row['Engagement Rate'],
      'Engagement Rate',
      rowNumber,
      sourcePath,
    ),
    avgViewDurationRatio,
    viewsToLikesRatio: parseRequiredNumeric(
      row['Views to Likes Ratio'],
      'Views to Likes Ratio',
      rowNumber,
      sourcePath,
    ),
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
    const daysSinceNewest = Math.max(0, (newestTime - record.publishedAt.getTime()) / 86_400_000)
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
  const bracketMatches = title.matchAll(/(?:【|\[)([^】\]]+)(?:】|\])/g)

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

function durationToMinutes(duration: string, rowNumber: number, sourcePath: string) {
  const parts = duration.split(':').map((part) => Number(part))

  if (
    parts.length < 1 ||
    parts.length > 3 ||
    parts.some((part) => !Number.isFinite(part) || part < 0)
  ) {
    throw dataError(sourcePath, rowNumber, 'duration', duration)
  }

  if (parts.length === 3) {
    return parts[0] * 60 + parts[1] + parts[2] / 60
  }

  if (parts.length === 2) {
    return parts[0] + parts[1] / 60
  }

  if (parts.length === 1) {
    return parts[0]
  }

  throw dataError(sourcePath, rowNumber, 'duration', duration)
}

function parseRequiredNumeric(value: string, field: string, rowNumber: number, sourcePath: string) {
  const normalized = String(value).replaceAll(',', '').trim()
  const parsed = Number(normalized)

  if (!normalized || !Number.isFinite(parsed) || parsed < 0) {
    throw dataError(sourcePath, rowNumber, field, value)
  }

  return parsed
}

function parseRequiredInteger(value: string, field: string, rowNumber: number, sourcePath: string) {
  return Math.round(parseRequiredNumeric(value, field, rowNumber, sourcePath))
}

function validateYouTubeUrl(value: string, rowNumber: number, sourcePath: string) {
  const normalized = value.trim()

  try {
    const url = new URL(normalized)

    if (!['youtube.com', 'www.youtube.com', 'youtu.be'].includes(url.hostname.toLowerCase())) {
      throw new Error('Unsupported host')
    }

    return normalized
  } catch {
    throw dataError(sourcePath, rowNumber, 'Urls', value)
  }
}

function dataError(sourcePath: string, rowNumber: number, field: string, value: string) {
  return new Error(
    `Marine Chariot CSV from ${sourcePath} has invalid ${field} at row ${rowNumber}: ${JSON.stringify(value)}`,
  )
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}
