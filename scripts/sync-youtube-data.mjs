import { mkdirSync, writeFileSync, renameSync, rmSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { parseMarineSheet } from '../src/data/parseMarineSheet.ts'

import { GOOGLE_SHEET_URL } from '../src/data/sheetSource.ts'

const args = parseArgs(process.argv.slice(2))
const sourceUrl = String(
  args.source ??
    process.env.MARINE_SHEET_URL ??
    process.env.VITE_MARINE_SHEET_URL ??
    GOOGLE_SHEET_URL,
)
const outputPath = resolve(String(args.out ?? 'public/data/marine-sheet.json'))
const response = await fetch(sourceUrl, { cache: 'no-cache', signal: AbortSignal.timeout(15_000) })

if (!response.ok) {
  throw new Error(`Google Sheets endpoint returned HTTP ${response.status}`)
}

const payload = await response.json()
const { records, rows, skippedRows } = parseMarineSheet(payload, sourceUrl)
const newestDate = records.at(-1).publishedDate
mkdirSync(dirname(outputPath), { recursive: true })
const temporaryPath = `${outputPath}.tmp`
try {
  writeFileSync(temporaryPath, `${JSON.stringify({ ...payload, rows }, null, 2)}\n`)
  renameSync(temporaryPath, outputPath)
} finally {
  rmSync(temporaryPath, { force: true })
}
console.log(
  `Synced ${records.length} complete YouTube rows through ${newestDate}; skipped ${skippedRows} incomplete rows -> ${outputPath}`,
)

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
