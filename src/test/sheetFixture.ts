export const completeRow = {
  No: 1,
  Urls: 'https://youtu.be/abcdefghijk',
  'Video Name': 'Marine Alpha',
  View: 1000,
  Like: 100,
  Comm: 10,
  published_date: '2026-01-01',
  duration: '00:30:00',
  minute: 30,
  type: 'Gaming',
  'Engagement Rate': 0.11,
  'AVG View Duration': 13.5,
  'Views to Likes Ratio': 10,
}
export function sheetPayload(rows: Record<string, string | number>[]) {
  return {
    schemaVersion: 1,
    source: 'google-sheets',
    updatedAt: '2026-09-10T15:01:00.000Z',
    retention: { source: 'estimated', unit: 'minutes', assumption: 0.45 },
    rows,
  }
}
