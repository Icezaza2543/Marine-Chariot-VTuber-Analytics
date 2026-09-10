import type { MarineDataSnapshot } from '../types'
import { parseMarineCsv } from './parseMarineCsv'

const LOCAL_DATA_PATH = '/data/marine-ch-data.csv'
const DEFAULT_GOOGLE_SHEET_CSV_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vTyNpRUR1B4SDX_VKOIDndOfodMaEMuojtK7SYocFy6oz6bHtJ_uxmMDTvmipvu8H_7o7yNb5rgq0fq/pub?gid=0&single=true&output=csv'

const DATA_PATH = import.meta.env.VITE_MARINE_CSV_URL?.trim() || DEFAULT_GOOGLE_SHEET_CSV_URL

export async function loadMarineData(signal?: AbortSignal): Promise<MarineDataSnapshot> {
  try {
    return await loadSnapshot(DATA_PATH, signal)
  } catch (primaryError) {
    if (signal?.aborted || DATA_PATH === LOCAL_DATA_PATH) throw primaryError
    try {
      return await loadSnapshot(LOCAL_DATA_PATH, signal)
    } catch (fallbackError) {
      throw new Error(
        `Cannot load Marine Chariot CSV. Primary source failed: ${describeError(primaryError)}. Local fallback failed: ${describeError(fallbackError)}`,
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
  const { records, skippedRows } = parseMarineCsv(await response.text(), sourcePath)
  return {
    records,
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
