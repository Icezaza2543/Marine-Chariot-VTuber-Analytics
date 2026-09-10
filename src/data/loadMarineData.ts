import type { MarineDataSnapshot } from '../types'
import { parseMarineSheet } from './parseMarineSheet'

import { GOOGLE_SHEET_URL } from './sheetSource.ts'

const LOCAL_DATA_PATH = '/data/marine-sheet.json'
const DATA_PATH = import.meta.env.VITE_MARINE_SHEET_URL?.trim() || GOOGLE_SHEET_URL

export async function loadMarineData(signal?: AbortSignal): Promise<MarineDataSnapshot> {
  try {
    return await loadSnapshot(DATA_PATH, signal)
  } catch (primaryError) {
    if (signal?.aborted || DATA_PATH === LOCAL_DATA_PATH) throw primaryError
    try {
      return await loadSnapshot(LOCAL_DATA_PATH, signal)
    } catch (fallbackError) {
      throw new Error(
        `Cannot load Marine Chariot Google Sheets data. Primary source failed: ${describeError(primaryError)}. Local fallback failed: ${describeError(fallbackError)}`,
        { cause: fallbackError },
      )
    }
  }
}

async function loadSnapshot(sourcePath: string, signal?: AbortSignal): Promise<MarineDataSnapshot> {
  const timeout = AbortSignal.timeout(10_000)
  const response = await fetch(sourcePath, {
    cache: 'no-cache',
    signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
  })
  if (!response.ok) throw new Error(`${sourcePath} returned HTTP ${response.status}`)
  const { records, skippedRows, updatedAt } = parseMarineSheet(await response.json(), sourcePath)
  return {
    records,
    updatedAt,
    skippedRows,
    source: sourcePath === LOCAL_DATA_PATH ? 'fallback' : 'live',
    sourcePath,
    loadedAt: new Date().toISOString(),
    newestPublishedDate: records.at(-1)?.publishedDate ?? null,
  }
}

function describeError(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}
