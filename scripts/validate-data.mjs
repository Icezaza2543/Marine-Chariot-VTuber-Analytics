import { readFileSync } from 'node:fs'
import { parseMarineCsv } from '../src/data/parseMarineCsv.ts'

const path = 'public/data/marine-ch-data.csv'
const { records, skippedRows } = parseMarineCsv(readFileSync(path, 'utf8'), path)
if (skippedRows)
  throw new Error(`Snapshot contains ${skippedRows} incomplete rows; run npm run sync:youtube`)
console.log(`Validated ${records.length} complete records through ${records.at(-1).publishedDate}`)
