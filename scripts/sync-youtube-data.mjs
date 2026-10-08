import { mkdirSync, writeFileSync, renameSync, rmSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { setTimeout as delay } from 'node:timers/promises'
import { parseMarineSheet } from '../src/data/parseMarineSheet.ts'
import { GOOGLE_SHEET_URL } from '../src/data/sheetSource.ts'

const retryStatuses = new Set([429, 500, 502, 503, 504])
const retryDelays = [2000, 5000]
const networkCodes = new Set([
  'ECONNRESET',
  'ECONNREFUSED',
  'ECONNABORTED',
  'ETIMEDOUT',
  'ENOTFOUND',
  'EAI_AGAIN',
  'ENETUNREACH',
  'EHOSTUNREACH',
  'EPIPE',
  'UND_ERR_CONNECT_TIMEOUT',
  'UND_ERR_HEADERS_TIMEOUT',
  'UND_ERR_BODY_TIMEOUT',
  'UND_ERR_SOCKET',
])

export async function syncYoutubeData({
  sourceUrl,
  outputPath,
  fetchImpl = fetch,
  timeoutMs = 60_000,
  sleep = delay,
  log = console.log,
}) {
  // Reject configuration errors before treating fetch TypeErrors as network failures.
  let source
  try {
    source = new URL(sourceUrl)
    if (!['http:', 'https:'].includes(source.protocol)) throw new Error()
  } catch {
    throw new Error('Invalid Google Sheets endpoint: expected an HTTP(S) URL')
  }

  let validated
  for (let attempt = 1; attempt <= 3; attempt++) {
    const started = performance.now()
    const signal = AbortSignal.timeout(timeoutMs)
    let stage = 'request'
    let status
    log(`Google Sheets attempt ${attempt}/3 started (timeout ${timeoutMs}ms)`)
    try {
      const response = await fetchImpl(source.href, { cache: 'no-cache', signal })
      if (!response.ok) {
        status = response.status
        // Release the unused error body without logging its contents.
        if (response.body) await response.body.cancel()
        throw new Error('HTTP failure')
      }
      stage = 'body'
      // The same signal remains active until the entire body has been downloaded.
      const body = await response.text()
      signal.throwIfAborted()
      stage = 'JSON'
      const payload = JSON.parse(body)
      stage = 'schema'
      const parsed = parseMarineSheet(payload, 'downloaded Google Sheets data')
      validated = { payload, ...parsed }
      log(
        `Google Sheets attempt ${attempt}/3 succeeded in ${Math.round(performance.now() - started)}ms (download and validation complete)`,
      )
      break
    } catch (error) {
      const timedOut = signal.aborted || error?.name === 'TimeoutError'
      const networkError =
        ['request', 'body'].includes(stage) &&
        (networkCodes.has(error?.code) ||
          networkCodes.has(error?.cause?.code) ||
          (stage === 'request' && error instanceof TypeError && error.message === 'fetch failed'))
      const retryable = status !== undefined ? retryStatuses.has(status) : timedOut || networkError
      // Only controlled messages are logged: URLs, response content and raw errors may contain secrets.
      const reason =
        status !== undefined
          ? `HTTP ${status}`
          : timedOut
            ? `timeout after ${timeoutMs}ms (${stage})`
            : networkError
              ? `network error (${stage})`
              : `${stage} error`
      const elapsed = Math.round(performance.now() - started)
      const waitMs = retryDelays[attempt - 1]
      log(
        `Google Sheets attempt ${attempt}/3 failed in ${elapsed}ms: ${reason}; ${retryable && attempt < 3 ? `retrying in ${waitMs}ms` : 'no more retries'}`,
      )
      if (!retryable || attempt === 3) {
        // eslint-disable-next-line preserve-caught-error -- Raw causes can contain endpoint secrets.
        throw new Error(
          `Google Sheets refresh failed after ${attempt} attempts: ${reason}. Snapshot was not changed.`,
        )
      }
      await sleep(waitMs)
    }
  }

  const { payload, records, rows, skippedRows } = validated
  const newestDate = records.at(-1).publishedDate
  mkdirSync(dirname(outputPath), { recursive: true })
  const temporaryPath = `${outputPath}.tmp`
  try {
    writeFileSync(temporaryPath, `${JSON.stringify({ ...payload, rows }, null, 2)}\n`)
    renameSync(temporaryPath, outputPath)
  } finally {
    rmSync(temporaryPath, { force: true })
  }
  log(
    `Synced ${records.length} complete YouTube rows through ${newestDate}; skipped ${skippedRows} incomplete rows -> ${outputPath}`,
  )
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args = parseArgs(process.argv.slice(2))
  const sourceUrl = String(
    args.source ??
      process.env.MARINE_SHEET_URL ??
      process.env.VITE_MARINE_SHEET_URL ??
      GOOGLE_SHEET_URL,
  )
  const outputPath = resolve(String(args.out ?? 'public/data/marine-sheet.json'))
  try {
    await syncYoutubeData({ sourceUrl, outputPath })
  } catch (error) {
    console.error(`YouTube snapshot sync failed: ${error.message}`)
    process.exitCode = 1
  }
}

function parseArgs(values) {
  return values.reduce((current, value, index) => {
    if (!value.startsWith('--')) return current
    const nextValue = values[index + 1]
    if (nextValue && !nextValue.startsWith('--')) current[value.slice(2)] = nextValue
    return current
  }, {})
}
