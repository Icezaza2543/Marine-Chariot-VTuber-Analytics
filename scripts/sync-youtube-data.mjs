import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import Papa from 'papaparse'

const DEFAULT_SOURCE =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vTyNpRUR1B4SDX_VKOIDndOfodMaEMuojtK7SYocFy6oz6bHtJ_uxmMDTvmipvu8H_7o7yNb5rgq0fq/pub?gid=0&single=true&output=csv'
const REQUIRED_FIELDS = [
  'No',
  'Urls',
  'Video Name',
  'View',
  'Like',
  'Comm',
  'published_date',
  'duration',
  'minute',
  'type',
  'Engagement Rate',
  'AVG View Duration',
  'Views to Likes Ratio',
]

const args = parseArgs(process.argv.slice(2))
const sourceUrl = String(
  args.source ?? process.env.MARINE_CSV_URL ?? process.env.VITE_MARINE_CSV_URL ?? DEFAULT_SOURCE,
)
const outputPath = resolve(String(args.out ?? 'public/data/marine-ch-data.csv'))
const response = await fetch(sourceUrl, { cache: 'no-cache' })

if (!response.ok) {
  throw new Error(`YouTube CSV source returned HTTP ${response.status}`)
}

const csvText = await response.text()
const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true })

if (parsed.errors.length > 0) {
  throw new Error(`Cannot parse YouTube CSV: ${parsed.errors.map((error) => error.message).join(', ')}`)
}

const fields = parsed.meta.fields ?? []
const missingFields = REQUIRED_FIELDS.filter((field) => !fields.includes(field))

if (missingFields.length > 0) {
  throw new Error(`YouTube CSV is missing required fields: ${missingFields.join(', ')}`)
}

if (parsed.data.length === 0) {
  throw new Error('YouTube CSV contains no data rows')
}

const dates = parsed.data.map((row, index) => {
  const value = String(row.published_date ?? '')
  const timestamp = Date.parse(value)

  if (!Number.isFinite(timestamp)) {
    throw new Error(`YouTube CSV has invalid published_date at row ${index + 2}: ${value}`)
  }

  return { timestamp, value }
})
const newestDate = dates.sort((a, b) => b.timestamp - a.timestamp)[0].value

mkdirSync(dirname(outputPath), { recursive: true })
writeFileSync(outputPath, `${csvText.trimEnd()}\n`)
console.log(`Synced ${parsed.data.length} YouTube rows through ${newestDate} -> ${outputPath}`)

function parseArgs(values) {
  return values.reduce((current, value, index) => {
    if (!value.startsWith('--')) {
      return current
    }

    const nextValue = values[index + 1]

    if (nextValue && !nextValue.startsWith('--')) {
      current[value.slice(2)] = nextValue
    }

    return current
  }, {})
}
