import { addMonths, format, getMonth } from 'date-fns'
import { thaiMonthLabel } from '../format'
import type { ForecastPoint, MonthlyMetric } from '../../types'
import { clamp, deltaPercent, sum } from './math'

export function buildForecast(monthlyMetrics: MonthlyMetric[]) {
  if (monthlyMetrics.length === 0) {
    return []
  }

  const views = monthlyMetrics.map((metric) => metric.views)
  const likes = monthlyMetrics.map((metric) => metric.likes)
  const engagement = monthlyMetrics.map((metric) => metric.engagementRate)
  const linearViews = linearRegressionForecast(views, 6)
  const smoothViews = exponentialSmoothingForecast(views, 6)
  const linearLikes = linearRegressionForecast(likes, 6)
  const smoothLikes = exponentialSmoothingForecast(likes, 6)
  const linearEngagement = linearRegressionForecast(engagement, 6)
  const smoothEngagement = exponentialSmoothingForecast(engagement, 6)
  const lastMonth = monthlyMetrics.at(-1)!.date

  return Array.from({ length: 6 }, (_, index): ForecastPoint => {
    const date = addMonths(lastMonth, index + 1)

    return {
      key: format(date, 'yyyy-MM'),
      label: `${thaiMonthLabel(getMonth(date) + 1)} ${format(date, 'yy')}`,
      views: Math.max(0, Math.round((linearViews[index] + smoothViews[index]) / 2)),
      likes: Math.max(0, Math.round((linearLikes[index] + smoothLikes[index]) / 2)),
      engagementRate: clamp((linearEngagement[index] + smoothEngagement[index]) / 2, 0, 1),
      linearViews: Math.max(0, Math.round(linearViews[index])),
      smoothedViews: Math.max(0, Math.round(smoothViews[index])),
    }
  })
}

export function computeProjectedGrowth(monthlyMetrics: MonthlyMetric[], forecast: ForecastPoint[]) {
  const recentActual = monthlyMetrics.slice(-3)
  const nextForecast = forecast.slice(0, 3)
  const recentViews = sum(recentActual.map((metric) => metric.views))
  const projectedViews = sum(nextForecast.map((metric) => metric.views))

  return deltaPercent(projectedViews, recentViews)
}

function linearRegressionForecast(values: number[], horizon: number) {
  if (values.length === 0) {
    return Array.from({ length: horizon }, () => 0)
  }

  const n = values.length
  const xs = values.map((_, index) => index + 1)
  const sumX = sum(xs)
  const sumY = sum(values)
  const sumXY = sum(values.map((value, index) => value * xs[index]))
  const sumXX = sum(xs.map((value) => value * value))
  const denominator = n * sumXX - sumX * sumX
  const slope = denominator === 0 ? 0 : (n * sumXY - sumX * sumY) / denominator
  const intercept = (sumY - slope * sumX) / n

  return Array.from({ length: horizon }, (_, index) => intercept + slope * (n + index + 1))
}

function exponentialSmoothingForecast(values: number[], horizon: number, alpha = 0.35) {
  if (values.length === 0) {
    return Array.from({ length: horizon }, () => 0)
  }

  let level = values[0]

  for (const value of values.slice(1)) {
    level = alpha * value + (1 - alpha) * level
  }

  return Array.from({ length: horizon }, () => level)
}
