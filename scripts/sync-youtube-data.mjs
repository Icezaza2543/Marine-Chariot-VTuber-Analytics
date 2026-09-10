import { mkdirSync, writeFileSync, renameSync, rmSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import Papa from 'papaparse'
import { parseMarineCsv } from '../src/data/parseMarineCsv.ts'

const DEFAULT_SOURCE =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vTyNpRUR1B4SDX_VKOIDndOfodMaEMuojtK7SYocFy6oz6bHtJ_uxmMDTvmipvu8H_7o7yNb5rgq0fq/pub?gid=0&single=true&output=csv'
const args = parseArgs(process.argv.slice(2))
const sourceUrl = String(
  args.source ?? process.env.MARINE_CSV_URL ?? process.env.VITE_MARINE_CSV_URL ?? DEFAULT_SOURCE,
)
const outputPath = resolve(String(args.out ?? 'public/data/marine-ch-data.csv'))
const response = await fetch(sourceUrl, { cache: 'no-cache', signal: AbortSignal.timeout(15_000) })

if (!response.ok) {
  throw new Error(`YouTube CSV source returned HTTP ${response.status}`)
}

const csvText = await response.text()
const { records, rows, skippedRows } = parseMarineCsv(csvText, sourceUrl)
const newestDate = records.at(-1).publishedDate
mkdirSync(dirname(outputPath), { recursive: true })
const temporaryPath = `${outputPath}.tmp`
try {
  writeFileSync(temporaryPath, `${Papa.unparse(rows)}\n`)
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
