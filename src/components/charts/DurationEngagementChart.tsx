import type { ChartData, ChartOptions } from 'chart.js'
import { Bubble } from 'react-chartjs-2'
import { compactNumber } from '../../lib/format'
import type { AnalyticsBundle } from '../../types'
import { SectionInsight } from '../SectionInsight'
import './registerChartJs'

interface DurationEngagementChartProps {
  analytics: AnalyticsBundle
}

export function DurationEngagementChart({ analytics }: DurationEngagementChartProps) {
  const data: ChartData<'bubble'> = {
    datasets: [
      {
        label: 'Videos',
        data: analytics.scatterPoints.map((point) => ({
          x: point.x,
          y: point.y,
          r: point.r,
        })),
        backgroundColor: 'rgba(255, 107, 157, 0.42)',
        borderColor: '#ff6b9d',
        borderWidth: 1,
      },
    ],
  }
  const options: ChartOptions<'bubble'> = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        title: { display: true, text: 'Duration (minutes)', color: '#9aa4b2' },
        ticks: { color: '#9aa4b2' },
        grid: { color: 'rgba(148,163,184,0.09)' },
      },
      y: {
        title: { display: true, text: 'Engagement (%)', color: '#9aa4b2' },
        ticks: { color: '#9aa4b2' },
        grid: { color: 'rgba(148,163,184,0.09)' },
      },
    },
    plugins: {
      datalabels: { display: false },
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(12, 14, 24, 0.96)',
        borderColor: 'rgba(167, 139, 250, 0.35)',
        borderWidth: 1,
        callbacks: {
          label: (context) => {
            const point = analytics.scatterPoints[context.dataIndex]
            return `${point.title}: ${compactNumber(point.views)} views · viral ${point.viralScore.toFixed(1)}`
          },
        },
      },
      zoom: {
        pan: { enabled: true, mode: 'xy' },
        zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: 'xy' },
      },
    },
  }

  return (
    <article className="chart-panel">
      <div className="panel-heading">
        <div>
          <h2>Duration vs Engagement</h2>
          <p>Bubble size follows view volume</p>
        </div>
      </div>

      <div className="chart-frame h-[285px]">
        <Bubble data={data} options={options} />
      </div>

      <div className="duration-buckets">
        {analytics.durationMetrics.map((metric) => (
          <div className="duration-pill" key={metric.bucket}>
            <strong>{metric.bucket}</strong>
            <span>{compactNumber(metric.avgViews)} avg · {metric.avgRetentionScore.toFixed(1)} retention</span>
          </div>
        ))}
      </div>

      <SectionInsight>{analytics.sectionInsights.duration}</SectionInsight>
    </article>
  )
}
