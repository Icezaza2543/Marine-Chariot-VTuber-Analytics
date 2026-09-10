// Bound to Marine Ch. Data. Keep the existing 12-hour trigger.
const SPREADSHEET_ID = '12xLP8wS3XIpkE5rNa6kddqheU5DutOnnPyxDnbrqJao'
const CHANNEL_ID = 'UC0FTyntIoEvvpfQOe75zJXA'
const HEADERS = [
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

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('🎬 YouTube Auto')
    .addItem('อัปเดตวิดีโอและสถิติ', 'fetchNewVideosAndCalculate')
    .addToUi()
}

function runUpdateStats() {
  return fetchNewVideosAndCalculate()
}

function youtubeRequest_(resource, params) {
  const key = PropertiesService.getScriptProperties().getProperty('YOUTUBE_API_KEY')
  if (!key) throw new Error('Set YOUTUBE_API_KEY in Script Properties')
  const query = Object.keys(params)
    .map((k) => encodeURIComponent(k) + '=' + encodeURIComponent(params[k]))
    .join('&')
  const response = UrlFetchApp.fetch(
    'https://www.googleapis.com/youtube/v3/' +
      resource +
      '?' +
      query +
      '&key=' +
      encodeURIComponent(key),
    { muteHttpExceptions: true },
  )
  if (response.getResponseCode() !== 200)
    throw new Error('YouTube ' + resource + ' failed: HTTP ' + response.getResponseCode())
  const data = JSON.parse(response.getContentText())
  if (!Array.isArray(data.items)) throw new Error('Invalid YouTube response')
  return data
}

function videoId_(url) {
  const match = String(url).match(/(?:v=|youtu\.be\/|shorts\/)([A-Za-z0-9_-]{11})/)
  return match ? match[1] : null
}

function durationSeconds_(iso) {
  const m = String(iso).match(/^P(?:(\d+)D)?T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/)
  return m
    ? Number(m[1] || 0) * 86400 +
        Number(m[2] || 0) * 3600 +
        Number(m[3] || 0) * 60 +
        Number(m[4] || 0)
    : 0
}

function guessType_(title, allowed) {
  const candidates = []
  if (/shorts?|shots?/i.test(title)) candidates.push('Shots', 'Shorts')
  if (/asmr/i.test(title)) candidates.push('ASMR')
  if (/ร้อง|เพลง|sing|cover|karaoke/i.test(title)) candidates.push('ร้องเพลง')
  if (/วาด|draw|illust/i.test(title)) candidates.push('Drawing', 'วาดรูป')
  if (/free\s*talk|คุย|พูดคุย/i.test(title)) candidates.push('FreeTalk')
  if (/【.+】|game|เล่นเกม/i.test(title)) candidates.push('Gaming')
  candidates.push('FreeTalk')
  return candidates.find((value) => allowed.includes(value)) || ''
}

function fetchNewVideosAndCalculate() {
  const lock = LockService.getScriptLock()
  if (!lock.tryLock(1000)) return
  const props = PropertiesService.getScriptProperties()
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('sheet')
    const data = sheet.getRange(1, 1, sheet.getLastRow(), 13).getDisplayValues()
    if (JSON.stringify(data[0]) !== JSON.stringify(HEADERS))
      throw new Error('Sheet headers changed; no cells were written')
    const original = JSON.stringify(data)
    const rows = data.slice(1).filter((row) => row[1])
    const known = new Set(rows.map((row) => videoId_(row[1])).filter(Boolean))
    const channel = youtubeRequest_('channels', { id: CHANNEL_ID, part: 'contentDetails' }).items[0]
    if (!channel) throw new Error('Channel not found')
    const playlistId = channel.contentDetails.relatedPlaylists.uploads
    const newIds = []
    let pageToken = ''
    do {
      const result = youtubeRequest_('playlistItems', {
        playlistId,
        part: 'contentDetails',
        maxResults: 50,
        pageToken,
      })
      for (const item of result.items) {
        const id = item.contentDetails.videoId
        if (!known.has(id)) {
          known.add(id)
          newIds.push(id)
        }
      }
      pageToken = result.nextPageToken || ''
    } while (pageToken)
    const ids = [...known]
    const videos = new Map()
    for (let start = 0; start < ids.length; start += 50) {
      const result = youtubeRequest_('videos', {
        id: ids.slice(start, start + 50).join(','),
        part: 'snippet,statistics,contentDetails',
      })
      for (const item of result.items) videos.set(item.id, item)
    }
    const rule = sheet.getRange('J2').getDataValidation()
    const allowed = rule
      ? rule.getCriteriaValues()[0]
      : ['Gaming', 'FreeTalk', 'Shots', 'ร้องเพลง', 'Drawing']
    const additions = newIds
      .filter(
        (id) => videos.has(id) && durationSeconds_(videos.get(id).contentDetails.duration) > 0,
      )
      .map((id) => [
        '',
        'https://www.youtube.com/watch?v=' + id,
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
      ])
    const output = additions.concat(rows).map((row, index) => {
      const next = row.slice()
      const item = videos.get(videoId_(row[1]))
      next[0] = index + 1
      if (!item) return next // Preserve unavailable/private videos and their existing data.
      const stats = item.statistics || {}
      const seconds = durationSeconds_(item.contentDetails.duration)
      next[2] = item.snippet.title
      ;[
        ['viewCount', 3],
        ['likeCount', 4],
        ['commentCount', 5],
      ].forEach(([key, col]) => {
        if (stats[key] !== undefined) next[col] = Number(stats[key])
      })
      next[6] = item.snippet.publishedAt.slice(0, 10)
      if (seconds > 0) {
        next[7] =
          Math.floor(seconds / 3600) +
          ':' +
          String(Math.floor(seconds / 60) % 60).padStart(2, '0') +
          ':' +
          String(seconds % 60).padStart(2, '0')
        next[8] = Math.round((seconds / 60) * 100) / 100
        next[11] = Math.round((seconds / 60) * 0.45 * 100) / 100 // Explicit estimate in minutes, NOT observed retention.
      }
      if (!next[9] || !allowed.includes(next[9])) next[9] = guessType_(next[2], allowed)
      const views = Number(next[3]),
        likes = Number(next[4]),
        comments = Number(next[5])
      if (next[3] !== '' && next[4] !== '' && next[5] !== '')
        next[10] = views > 0 ? (likes + comments) / views : 0
      next[12] = next[3] !== '' && next[4] !== '' && likes > 0 ? views / likes : ''
      return next
    })
    // Fetch all batches before writing. Never overwrite concurrent manual edits.
    if (
      JSON.stringify(sheet.getRange(1, 1, sheet.getLastRow(), 13).getDisplayValues()) !== original
    )
      throw new Error('Sheet changed during refresh; retry next run')
    if (additions.length) {
      sheet.insertRowsBefore(2, additions.length)
      sheet
        .getRange(2 + additions.length, 1, 1, 13)
        .copyTo(
          sheet.getRange(2, 1, additions.length, 13),
          SpreadsheetApp.CopyPasteType.PASTE_FORMAT,
          false,
        )
      sheet
        .getRange(2 + additions.length, 1, 1, 13)
        .copyTo(
          sheet.getRange(2, 1, additions.length, 13),
          SpreadsheetApp.CopyPasteType.PASTE_DATA_VALIDATION,
          false,
        )
    }
    sheet.getRange(2, 1, output.length, 13).setValues(output)
    sheet
      .getRange('L1')
      .setNote(
        'Estimated watch duration in minutes = video duration × 45%. Not measured YouTube Analytics data.',
      )
    SpreadsheetApp.flush()
    props.setProperty('LAST_SUCCESSFUL_SYNC', new Date().toISOString())
    props.deleteProperty('LAST_SYNC_ERROR')
    console.log(JSON.stringify({ updated: output.length, added: additions.length }))
  } catch (error) {
    props.setProperty('LAST_SYNC_ERROR', String(error.message).slice(0, 300))
    throw error
  } finally {
    lock.releaseLock()
  }
}

function doGet() {
  const lock = LockService.getScriptLock()
  if (!lock.tryLock(5000)) return json_({ error: 'refresh_in_progress' })
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('sheet')
    const range = sheet.getRange(1, 1, sheet.getLastRow(), 13)
    const data = range.getValues()
    const display = range.getDisplayValues()
    if (JSON.stringify(data[0]) !== JSON.stringify(HEADERS))
      return json_({ error: 'invalid_headers' })
    const rows = data
      .slice(1)
      .map((row, index) => {
        row[6] =
          row[6] instanceof Date
            ? Utilities.formatDate(row[6], 'Asia/Bangkok', 'yyyy-MM-dd')
            : String(row[6])
        row[7] = display[index + 1][7]
        return Object.fromEntries(HEADERS.map((key, i) => [key, row[i]]))
      })
      .filter((row) => row.Urls)
    return json_({
      schemaVersion: 1,
      source: 'google-sheets',
      updatedAt: PropertiesService.getScriptProperties().getProperty('LAST_SUCCESSFUL_SYNC'),
      retention: { source: 'estimated', unit: 'minutes', assumption: 0.45 },
      rows,
    })
  } finally {
    lock.releaseLock()
  }
}

function json_(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(
    ContentService.MimeType.JSON,
  )
}
