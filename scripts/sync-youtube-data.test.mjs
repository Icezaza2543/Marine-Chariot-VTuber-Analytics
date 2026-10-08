import { mkdtempSync, readFileSync, writeFileSync, existsSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createServer } from 'node:http'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { completeRow, sheetPayload } from '../src/test/sheetFixture.ts'
import { syncYoutubeData } from './sync-youtube-data.mjs'

const payload = sheetPayload([completeRow])
const sourceUrl = 'https://example.invalid/sheet?token=secret-token'
const success = () => new Response(JSON.stringify(payload))
const pending = (signal) =>
  new Promise((_, reject) => {
    signal.addEventListener('abort', () => reject(signal.reason), { once: true })
  })

describe('YouTube snapshot refresh', () => {
  let directory, outputPath, log, sleep
  beforeEach(() => {
    directory = mkdtempSync(join(tmpdir(), 'marine-sync-'))
    outputPath = join(directory, 'snapshot.json')
    writeFileSync(outputPath, 'old snapshot\n')
    log = vi.fn()
    sleep = vi.fn().mockResolvedValue(undefined)
  })
  afterEach(() => {
    vi.restoreAllMocks()
    rmSync(directory, { recursive: true, force: true })
  })
  const runOptions = () => ({ sourceUrl, outputPath, log, sleep, timeoutMs: 20 })
  const unchanged = () => {
    expect(readFileSync(outputPath, 'utf8')).toBe('old snapshot\n')
    expect(existsSync(`${outputPath}.tmp`)).toBe(false)
  }

  it('retries a request timeout with a fresh signal and writes validated rows', async () => {
    const signals = []
    const fetchImpl = vi.fn((_url, { signal }) => {
      signals.push(signal)
      return signals.length === 1 ? pending(signal) : Promise.resolve(success())
    })
    await syncYoutubeData({ ...runOptions(), fetchImpl })
    expect(signals).toHaveLength(2)
    expect(signals[0]).not.toBe(signals[1])
    expect(signals[0].aborted).toBe(true)
    expect(signals[1].aborted).toBe(false)
    expect(sleep.mock.calls).toEqual([[2000]])
    expect(JSON.parse(readFileSync(outputPath, 'utf8')).rows[0].View).toBe('1000')
    expect(log.mock.calls.flat().join('\n')).toMatch(/attempt 1\/3.*\d+ms.*timeout/i)
    expect(log.mock.calls.flat().join('\n')).not.toContain('secret-token')
  })

  it('keeps the timeout active while reading the response body', async () => {
    const fetchImpl = vi.fn((_url, { signal }) =>
      fetchImpl.mock.calls.length === 1
        ? Promise.resolve({ ok: true, text: () => pending(signal), json: () => pending(signal) })
        : Promise.resolve(success()),
    )
    await syncYoutubeData({ ...runOptions(), fetchImpl })
    expect(fetchImpl).toHaveBeenCalledTimes(2)
    expect(log.mock.calls.flat().join('\n')).toMatch(/timeout/i)
  })

  it.each([429, 500, 502, 503, 504])('retries HTTP %s and succeeds', async (status) => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(new Response('', { status }))
      .mockResolvedValueOnce(success())
    await syncYoutubeData({ ...runOptions(), fetchImpl })
    expect(fetchImpl).toHaveBeenCalledTimes(2)
    expect(log.mock.calls.flat().join('\n')).toContain(`HTTP ${status}`)
  })

  it('uses 60-second deadlines and 2/5-second waits for network failures', async () => {
    const timeout = vi.spyOn(AbortSignal, 'timeout')
    const fetchImpl = vi
      .fn()
      .mockRejectedValueOnce(
        new TypeError('fetch failed: secret-token', {
          cause: Object.assign(new Error(), { code: 'ECONNRESET' }),
        }),
      )
      .mockRejectedValueOnce(
        new TypeError('fetch failed', { cause: Object.assign(new Error(), { code: 'ENOTFOUND' }) }),
      )
      .mockResolvedValueOnce(success())
    await syncYoutubeData({ sourceUrl, outputPath, fetchImpl, log, sleep })
    expect(timeout.mock.calls).toEqual([[60000], [60000], [60000]])
    expect(sleep.mock.calls).toEqual([[2000], [5000]])
    expect(log.mock.calls.flat().join('\n')).not.toContain('secret-token')
  })

  it.each([400, 401, 403, 404, 501])(
    'does not retry HTTP %s or overwrite the snapshot',
    async (status) => {
      const fetchImpl = vi.fn().mockResolvedValue(new Response('', { status }))
      await expect(syncYoutubeData({ ...runOptions(), fetchImpl })).rejects.toThrow(
        `HTTP ${status}`,
      )
      expect(fetchImpl).toHaveBeenCalledTimes(1)
      expect(sleep).not.toHaveBeenCalled()
      unchanged()
    },
  )

  it.each([
    ['JSON', '{"secret-token":'],
    ['schema', JSON.stringify({ secret: 'secret-token' })],
    ['schema', JSON.stringify(sheetPayload([{ ...completeRow, View: 'secret-token' }]))],
  ])('does not retry invalid %s', async (reason, body) => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(body))
    await expect(syncYoutubeData({ ...runOptions(), fetchImpl })).rejects.toThrow(
      new RegExp(reason, 'i'),
    )
    expect(fetchImpl).toHaveBeenCalledTimes(1)
    expect(sleep).not.toHaveBeenCalled()
    expect(log.mock.calls.flat().join('\n')).not.toContain('secret-token')
    unchanged()
  })

  it('does not treat a body decoding TypeError as a network failure', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => {
        throw new TypeError('bad encoding secret-token')
      },
    })
    await expect(syncYoutubeData({ ...runOptions(), fetchImpl })).rejects.toThrow(/body/i)
    expect(fetchImpl).toHaveBeenCalledTimes(1)
    unchanged()
  })

  it('stops after three failed attempts and preserves the original snapshot', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response('', { status: 503 }))
    await expect(syncYoutubeData({ ...runOptions(), fetchImpl })).rejects.toThrow(
      /3 attempts.*HTTP 503/i,
    )
    expect(fetchImpl).toHaveBeenCalledTimes(3)
    expect(sleep.mock.calls).toEqual([[2000], [5000]])
    unchanged()
  })

  it.each(['timeout', 'network'])(
    'preserves the snapshot after three %s failures',
    async (reason) => {
      const fetchImpl = vi.fn((_url, { signal }) =>
        reason === 'timeout' ? pending(signal) : Promise.reject(new TypeError('fetch failed')),
      )
      await expect(syncYoutubeData({ ...runOptions(), fetchImpl })).rejects.toThrow(
        new RegExp(`3 attempts.*${reason}`, 'i'),
      )
      expect(fetchImpl).toHaveBeenCalledTimes(3)
      expect(sleep.mock.calls).toEqual([[2000], [5000]])
      unchanged()
    },
  )

  it('retries a network interruption while reading the body', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        text: async () => {
          throw new TypeError('terminated', {
            cause: Object.assign(new Error(), { code: 'UND_ERR_SOCKET' }),
          })
        },
      })
      .mockResolvedValueOnce(success())
    await syncYoutubeData({ ...runOptions(), fetchImpl })
    expect(fetchImpl).toHaveBeenCalledTimes(2)
    expect(JSON.parse(readFileSync(outputPath, 'utf8')).rows).toHaveLength(1)
  })

  it('rejects invalid endpoint configuration without making a request', async () => {
    const fetchImpl = vi.fn()
    await expect(
      syncYoutubeData({ ...runOptions(), sourceUrl: 'bad-secret-token', fetchImpl }),
    ).rejects.toThrow(/expected an HTTP/i)
    expect(fetchImpl).not.toHaveBeenCalled()
    unchanged()
  })

  it('retries a real interrupted response body from a local server', async () => {
    let requests = 0
    const server = createServer((_request, response) => {
      requests++
      response.writeHead(200, { 'Content-Type': 'application/json' })
      if (requests === 1) response.write('{')
      else response.end(JSON.stringify(payload))
    })
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
    try {
      await syncYoutubeData({
        ...runOptions(),
        sourceUrl: `http://127.0.0.1:${server.address().port}`,
        timeoutMs: 200,
      })
      expect(requests).toBe(2)
      expect(JSON.parse(readFileSync(outputPath, 'utf8')).rows).toHaveLength(1)
    } finally {
      server.closeAllConnections()
      await new Promise((resolve) => server.close(resolve))
    }
  })

  it('returns a nonzero CLI exit code without leaking endpoint secrets', async () => {
    const server = createServer((_request, response) => {
      response.writeHead(403)
      response.end('secret-token')
    })
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
    try {
      const result = await promisify(execFile)(
        process.execPath,
        [
          fileURLToPath(new URL('./sync-youtube-data.mjs', import.meta.url)),
          '--source',
          `http://127.0.0.1:${server.address().port}/?token=secret-token`,
          '--out',
          outputPath,
        ],
        { windowsHide: true, timeout: 20_000 },
      ).catch((error) => error)
      expect(result.code).toBe(1)
      expect(result.stderr).toMatch(/HTTP 403/)
      expect(result.stderr + result.stdout).not.toContain('secret-token')
      unchanged()
    } finally {
      server.closeAllConnections()
      await new Promise((resolve) => server.close(resolve))
    }
  }, 30_000)
})
