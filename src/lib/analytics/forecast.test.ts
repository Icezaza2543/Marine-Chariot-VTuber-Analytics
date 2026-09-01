import { describe, expect, it } from 'vitest'
import type { MonthlyMetric } from '../../types'
import { buildForecast, computeForecastConfidence } from './forecast'

function monthlyMetric(key: string, views: number): MonthlyMetric {
  const date = new Date(`${key}-01T00:00:00.000Z`)

  return {
    key,
    label: key,
    date,
    views,
    likes: Math.round(views * 0.1),
    comments: Math.round(views * 0.01),
    videos: 4,
    engagementRate: 0.11,
    cumulativeViews: views,
    cumulativeLikes: Math.round(views * 0.1),
  }
}

describe('forecast', () => {
  it('excludes an incomplete current month and returns an uncertainty range', () => {
    const metrics = [
      monthlyMetric('2026-01', 1000),
      monthlyMetric('2026-02', 1200),
      monthlyMetric('2026-03', 1400),
      monthlyMetric('2026-04', 250),
    ]

    const forecast = buildForecast(metrics, new Date('2026-04-15T00:00:00.000Z'))

    expect(forecast).toHaveLength(6)
    expect(forecast[0].key).toBe('2026-04')
    expect(forecast[0].lowerViews).toBeLessThanOrEqual(forecast[0].views)
    expect(forecast[0].upperViews).toBeGreaterThanOrEqual(forecast[0].views)
    expect(computeForecastConfidence(metrics, new Date('2026-04-15T00:00:00.000Z'))).toBeGreaterThan(0)
  })

  it('does not forecast from fewer than three completed months', () => {
    const metrics = [monthlyMetric('2026-01', 1000), monthlyMetric('2026-02', 1200)]

    expect(buildForecast(metrics, new Date('2026-03-15T00:00:00.000Z'))).toEqual([])
    expect(computeForecastConfidence(metrics, new Date('2026-03-15T00:00:00.000Z'))).toBe(0)
  })
})
