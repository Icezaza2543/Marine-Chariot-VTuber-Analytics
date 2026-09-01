import { addMonths, format, getMonth } from 'date-fns'
import { thaiMonthLabel } from '../format'
import type { ForecastPoint, MonthlyMetric } from '../../types'
import { average, clamp, deltaPercent, sum } from './math'

const FORECAST_HORIZON = 6
const MAX_TRAINING_MONTHS = 18
const MIN_TRAINING_MONTHS = 3

export function buildForecast(monthlyMetrics: MonthlyMetric[], today = new Date()) {
  const trainingMetrics = selectTrainingMetrics(monthlyMetrics, today)

  if (trainingMetrics.length < MIN_TRAINING_MONTHS) {
    return []
  }

  const views = trainingMetrics.map((metric) => metric.views)
  const likes = trainingMetrics.map((metric) => metric.likes)
  const engagement = trainingMetrics.map((metric) => metric.engagementRate)
  const linearViews = linearRegressionForecast(views, FORECAST_HORIZON)
  const smoothViews = exponentialSmoothingForecast(views, FORECAST_HORIZON)
  const linearLikes = linearRegressionForecast(likes, FORECAST_HORIZON)
  const smoothLikes = exponentialSmoothingForecast(likes, FORECAST_HORIZON)
  const linearEngagement = linearRegressionForecast(engagement, FORECAST_HORIZON)
  const smoothEngagement = exponentialSmoothingForecast(engagement, FORECAST_HORIZON)
  const relativeError = forecastRelativeError(views)
  const lastMonth = trainingMetrics.at(-1)!.date

  return Array.from({ length: FORECAST_HORIZON }, (_, index): ForecastPoint => {
    const date = addMonths(lastMonth, index + 1)
    const projectedViews = Math.max(0, Math.round((linearViews[index] + smoothViews[index]) / 2))

    return {
      key: format(date, 'yyyy-MM'),
      label: `${thaiMonthLabel(getMonth(date) + 1)} ${format(date, 'yy')}`,
      views: projectedViews,
      likes: Math.max(0, Math.round((linearLikes[index] + smoothLikes[index]) / 2)),
      engagementRate: clamp((linearEngagement[index] + smoothEngagement[index]) / 2, 0, 1),
      lowerViews: Math.max(0, Math.round(projectedViews * (1 - relativeError))),
      upperViews: Math.round(projectedViews * (1 + relativeError)),
      linearViews: Math.max(0, Math.round(linearViews[index])),
      smoothedViews: Math.max(0, Math.round(smoothViews[index])),
    }
  })
}

export function computeProjectedGrowth(
  monthlyMetrics: MonthlyMetric[],
  forecast: ForecastPoint[],
  today = new Date(),
) {
  const recentActual = selectTrainingMetrics(monthlyMetrics, today).slice(-3)
  const nextForecast = forecast.slice(0, 3)

  if (recentActual.length < MIN_TRAINING_MONTHS || nextForecast.length < 3) {
    return 0
  }

  const recentViews = sum(recentActual.map((metric) => metric.views))
  const projectedViews = sum(nextForecast.map((metric) => metric.views))

  return deltaPercent(projectedViews, recentViews)
}

export function computeForecastConfidence(monthlyMetrics: MonthlyMetric[], today = new Date()) {
  const values = selectTrainingMetrics(monthlyMetrics, today).map((metric) => metric.views)

  if (values.length < MIN_TRAINING_MONTHS) {
    return 0
  }

  const sampleScore = clamp(values.length / MAX_TRAINING_MONTHS, 0, 1)
  const accuracyScore = 1 - clamp(forecastRelativeError(values), 0, 1)

  return Math.round(clamp(35 + sampleScore * 25 + accuracyScore * 30, 35, 90))
}

function selectTrainingMetrics(monthlyMetrics: MonthlyMetric[], today: Date) {
  const currentMonthKey = format(today, 'yyyy-MM')
  const completedMetrics =
    monthlyMetrics.at(-1)?.key === currentMonthKey ? monthlyMetrics.slice(0, -1) : monthlyMetrics

  return completedMetrics.slice(-MAX_TRAINING_MONTHS)
}

function forecastRelativeError(values: number[]) {
  if (values.length < 4) {
    return 0.5
  }

  const errors: number[] = []

  for (let index = 3; index < values.length; index += 1) {
    const history = values.slice(0, index)
    const linear = linearRegressionForecast(history, 1)[0]
    const smoothed = exponentialSmoothingForecast(history, 1)[0]
    const predicted = Math.max(0, (linear + smoothed) / 2)
    const actual = values[index]
    errors.push(Math.abs(actual - predicted) / Math.max(actual, 1))
  }

  return clamp(average(errors), 0.15, 0.75)
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
