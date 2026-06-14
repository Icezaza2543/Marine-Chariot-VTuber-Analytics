import type { ChartData, ChartOptions } from 'chart.js'
import { Line } from 'react-chartjs-2'
import { compactNumber } from '../../lib/format'
import type { AnalyticsBundle } from '../../types'
import { SectionInsight } from '../SectionInsight'
import './registerChartJs'

interface GrowthTrendChartProps {
  analytics: AnalyticsBundle
}

export function GrowthTrendChart({ analytics }: GrowthTrendChartProps) {
  const labels = [
    ...analytics.monthlyMetrics.map((metric) => metric.label),
    ...analytics.forecast.map((point) => point.label),
  ]
  const actualViews = analytics.monthlyMetrics.map((metric) => metric.views)
  const forecastViews = analytics.forecast.map((point) => point.views)
  const averageViews =
    actualViews.reduce((total, value) => total + value, 0) / Math.max(actualViews.length, 1)
  const data: ChartData<'line', Array<number | null>, string> = {
    labels,
    datasets: [
      {
        label: 'Monthly Views',
        data: [...actualViews, ...analytics.forecast.map(() => null)],
        borderColor: '#ff6b9d',
        backgroundColor: 'rgba(255, 107, 157, 0.18)',
        fill: true,
        pointBackgroundColor: '#ff6b9d',
        pointRadius: 2,
        tension: 0.35,
      },
      {
        label: 'Forecast Views',
        data: [
          ...analytics.monthlyMetrics.slice(0, -1).map(() => null),
          analytics.monthlyMetrics.at(-1)?.views ?? null,
          ...forecastViews,
        ],
        borderColor: '#67e8f9',
        backgroundColor: 'rgba(103, 232, 249, 0.08)',
        borderDash: [8, 6],
        pointBackgroundColor: '#67e8f9',
        pointRadius: 2,
        tension: 0.35,
      },
      {
        label: 'Cumulative Views',
        data: [
          ...analytics.monthlyMetrics.map((metric) => metric.cumulativeViews),
          ...analytics.forecast.map(() => null),
        ],
        borderColor: '#a78bfa',
        pointRadius: 0,
        yAxisID: 'y1',
        tension: 0.25,
      },
    ],
  }
  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      intersect: false,
      mode: 'index',
    },
    scales: {
      x: {
        ticks: { color: '#9aa4b2', maxRotation: 0 },
        grid: { color: 'rgba(148, 163, 184, 0.08)' },
      },
      y: {
        ticks: {
          color: '#9aa4b2',
          callback: (value) => compactNumber(Number(value)),
        },
        grid: { color: 'rgba(148, 163, 184, 0.1)' },
      },
      y1: {
        position: 'right',
        ticks: {
          color: '#a78bfa',
          callback: (value) => compactNumber(Number(value)),
        },
        grid: { drawOnChartArea: false },
      },
    },
    plugins: {
      datalabels: { display: false },
      legend: {
        labels: { color: '#dfe7f4', boxWidth: 10, usePointStyle: true },
      },
      tooltip: {
        backgroundColor: 'rgba(12, 14, 24, 0.96)',
        borderColor: 'rgba(167, 139, 250, 0.35)',
        borderWidth: 1,
      },
      annotation: {
        annotations: {
          averageLine: {
            type: 'line',
            yMin: averageViews,
            yMax: averageViews,
            borderColor: 'rgba(255,255,255,0.22)',
            borderDash: [4, 4],
            borderWidth: 1,
          },
        },
      },
      zoom: {
        pan: { enabled: true, mode: 'x' },
        zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: 'x' },
      },
    },
  }

  return (
    <article className="chart-panel min-h-[390px]">
      <div className="panel-heading">
        <div>
          <h2>Cumulative & Growth Trend</h2>
          <p>{analytics.filteredRecords.length} videos in current selection</p>
        </div>
      </div>
      <div className="chart-frame">
        <Line data={data} options={options} />
      </div>
      <SectionInsight>{analytics.sectionInsights.growth}</SectionInsight>
    </article>
  )
}
