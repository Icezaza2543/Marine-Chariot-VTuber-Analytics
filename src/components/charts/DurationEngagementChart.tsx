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
        label: 'วิดีโอ',
        data: analytics.scatterPoints.map((point) => ({
          x: point.x,
          y: point.y,
          r: point.r,
        })),
        backgroundColor: 'rgba(255, 107, 157, 0.42)',
        borderColor: '#e44878',
        borderWidth: 1,
      },
    ],
  }
  const options: ChartOptions<'bubble'> = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        title: { display: true, text: 'ความยาว (นาที)', color: '#475569' },
        ticks: { color: '#475569' },
        grid: { color: 'rgba(71,85,105,0.16)' },
      },
      y: {
        title: { display: true, text: 'การมีส่วนร่วม (%)', color: '#475569' },
        ticks: { color: '#475569' },
        grid: { color: 'rgba(71,85,105,0.16)' },
      },
    },
    plugins: {
      datalabels: { display: false },
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.98)',
        titleColor: '#111827',
        bodyColor: '#20283a',
        borderColor: 'rgba(124, 58, 237, 0.22)',
        borderWidth: 1,
        callbacks: {
          label: (context) => {
            const point = analytics.scatterPoints[context.dataIndex]
            return `${point.title}: ${compactNumber(point.views)} วิว · ไวรัล ${point.viralScore.toFixed(1)}`
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
          <h2>ความยาวคลิป vs Engagement</h2>
          <p>ขนาด bubble แทนปริมาณยอดวิว</p>
        </div>
      </div>

      <div className="chart-frame panel-chart-fill">
        <Bubble data={data} options={options} />
      </div>

      <div className="duration-buckets">
        {analytics.durationMetrics.map((metric) => (
          <div className="duration-pill" key={metric.bucket}>
            <strong>{metric.bucket}</strong>
            <span>{compactNumber(metric.avgViews)} วิวเฉลี่ย · retention {metric.avgRetentionScore.toFixed(1)}</span>
          </div>
        ))}
      </div>

      <SectionInsight>{analytics.sectionInsights.duration}</SectionInsight>
    </article>
  )
}
