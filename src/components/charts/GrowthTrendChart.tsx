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
        label: 'ยอดวิวรายเดือน',
        data: [...actualViews, ...analytics.forecast.map(() => null)],
        borderColor: '#e44878',
        backgroundColor: 'rgba(255, 107, 157, 0.18)',
        fill: true,
        pointBackgroundColor: '#e44878',
        pointRadius: 2,
        tension: 0.35,
      },
      {
        label: 'ยอดวิวคาดการณ์',
        data: [
          ...analytics.monthlyMetrics.slice(0, -1).map(() => null),
          analytics.monthlyMetrics.at(-1)?.views ?? null,
          ...forecastViews,
        ],
        borderColor: '#0891b2',
        backgroundColor: 'rgba(103, 232, 249, 0.08)',
        borderDash: [8, 6],
        pointBackgroundColor: '#0891b2',
        pointRadius: 2,
        tension: 0.35,
      },
      {
        label: 'ยอดวิวสะสม',
        data: [
          ...analytics.monthlyMetrics.map((metric) => metric.cumulativeViews),
          ...analytics.forecast.map(() => null),
        ],
        borderColor: '#7c3aed',
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
        ticks: { color: '#475569', maxRotation: 0 },
        grid: { color: 'rgba(71, 85, 105, 0.16)' },
      },
      y: {
        ticks: {
          color: '#475569',
          callback: (value) => compactNumber(Number(value)),
        },
        grid: { color: 'rgba(71, 85, 105, 0.16)' },
      },
      y1: {
        position: 'right',
        ticks: {
          color: '#7c3aed',
          callback: (value) => compactNumber(Number(value)),
        },
        grid: { drawOnChartArea: false },
      },
    },
    plugins: {
      datalabels: { display: false },
      legend: {
        labels: { color: '#334155', boxWidth: 10, usePointStyle: true },
      },
      tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.98)',
        titleColor: '#111827',
        bodyColor: '#20283a',
        borderColor: 'rgba(124, 58, 237, 0.22)',
        borderWidth: 1,
      },
      annotation: {
        annotations: {
          averageLine: {
            type: 'line',
            yMin: averageViews,
            yMax: averageViews,
            borderColor: 'rgba(71,85,105,0.28)',
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
          <h2>แนวโน้มยอดวิวสะสมและการเติบโต</h2>
          <p>กำลังดูข้อมูล {analytics.filteredRecords.length} วิดีโอ</p>
        </div>
      </div>
      <div className="chart-frame panel-chart-fill">
        <Line data={data} options={options} />
      </div>
      <SectionInsight>{analytics.sectionInsights.growth}</SectionInsight>
    </article>
  )
}
