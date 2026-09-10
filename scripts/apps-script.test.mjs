import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { describe, expect, it, vi } from 'vitest'

const source = readFileSync(new URL('../apps-script/Code.gs', import.meta.url), 'utf8')
function context() {
  const properties = new Map([['YOUTUBE_API_KEY', 'test-key']])
  const releaseLock = vi.fn()
  const setValues = vi.fn()
  const header = [
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
  const data = [
    header,
    [
      1,
      'https://youtu.be/abcdefghijk',
      'Existing',
      100,
      10,
      1,
      '2026-01-01',
      '00:30:00',
      30,
      'Gaming',
      0.11,
      13.5,
      10,
    ],
  ]
  const sheet = {
    getLastRow: () => data.length,
    getRange: () => ({ getDisplayValues: () => data, getValues: () => data, setValues }),
  }
  const env = {
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: (k) => properties.get(k),
        setProperty: (k, v) => properties.set(k, v),
      }),
    },
    LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock }) },
    SpreadsheetApp: { openById: () => ({ getSheetByName: () => sheet }) },
    UrlFetchApp: { fetch: vi.fn(() => ({ getResponseCode: () => 403 })) },
    ContentService: {
      MimeType: { JSON: 'json' },
      createTextOutput: (text) => ({ setMimeType: () => text }),
    },
  }
  runInNewContext(source, env)
  return { env, properties, releaseLock, setValues }
}
describe('Apps Script contract', () => {
  it('never writes sheet cells on a YouTube API failure and releases its lock', () => {
    const { env, properties, releaseLock, setValues } = context()
    expect(() => env.fetchNewVideosAndCalculate()).toThrow('YouTube channels failed: HTTP 403')
    expect(setValues).not.toHaveBeenCalled()
    expect(releaseLock).toHaveBeenCalledOnce()
    expect(properties.get('LAST_SYNC_ERROR')).not.toContain('test-key')
  })
  it('serves only the public schema and never fetches YouTube on GET', () => {
    const { env, properties } = context()
    properties.set('LAST_SUCCESSFUL_SYNC', '2026-09-10T15:00:00.000Z')
    const body = env.doGet()
    const result = JSON.parse(body)
    expect(result.rows).toHaveLength(1)
    expect(Object.keys(result.rows[0])).toHaveLength(13)
    expect(result.retention).toEqual({ source: 'estimated', unit: 'minutes', assumption: 0.45 })
    expect(body).not.toContain('test-key')
    expect(env.UrlFetchApp.fetch).not.toHaveBeenCalled()
  })
  it('classifies only into the existing dropdown choices', () => {
    const { env } = context()
    expect(env.guessType_('ASMR singing', ['Gaming', 'FreeTalk'])).toBe('FreeTalk')
    expect(env.guessType_('Shorts', ['Shots', 'FreeTalk'])).toBe('Shots')
  })
})
