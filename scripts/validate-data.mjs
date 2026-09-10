import { readFileSync } from 'node:fs'
import { parseMarineSheet } from '../src/data/parseMarineSheet.ts'

const path = 'public/data/marine-sheet.json'
const { records, skippedRows } = parseMarineSheet(JSON.parse(readFileSync(path, 'utf8')), path)
if (skippedRows)
  throw new Error(`Snapshot contains ${skippedRows} incomplete rows; run npm run sync:youtube`)
console.log(`Validated ${records.length} complete records through ${records.at(-1).publishedDate}`)
