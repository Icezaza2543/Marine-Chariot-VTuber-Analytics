import { ArrowDown, ArrowUp, ExternalLink, Trophy } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import { compactNumber, percent } from '../lib/format'
import { metricLabel, retentionLabel } from '../lib/analytics'
import { useDashboardStore } from '../store/useDashboardStore'
import type { AnalyticsBundle, TableSort } from '../types'
import { SectionInsight } from './SectionInsight'

interface TopVideosTableProps {
  analytics: AnalyticsBundle
}

const columns: Array<{ key: TableSort['key'] | 'thumbnail'; label: string; className?: string }> = [
  { key: 'thumbnail', label: 'Thumbnail', className: 'w-24 text-center' },
  { key: 'title', label: 'วิดีโอ', className: 'min-w-[280px]' },
  { key: 'contentType', label: 'ประเภท' },
  { key: 'publishedAt', label: 'วันที่' },
  { key: 'views', label: 'ยอดวิว' },
  { key: 'engagementRate', label: 'มีส่วนร่วม' },
  { key: 'viralScore', label: 'ไวรัล' },
  { key: 'retentionScore', label: 'ดูต่อ' },
]

function getYouTubeId(url: string) {
  const match = url.match(/[?&]v=([^&]+)/) || url.match(/youtu\.be\/([^?]+)/)
  return match ? match[1] : ''
}

export function TopVideosTable({ analytics }: TopVideosTableProps) {
  const { setTableSort, setTopLimit, tableSort, topLimit } = useDashboardStore(
    useShallow((state) => ({
      setTableSort: state.setTableSort,
      setTopLimit: state.setTopLimit,
      tableSort: state.tableSort,
      topLimit: state.topLimit,
    })),
  )

  const toggleSort = (key: TableSort['key']) => {
    const direction = tableSort.key === key && tableSort.direction === 'desc' ? 'asc' : 'desc'
    setTableSort({ key, direction })
  }

  return (
    <article className="chart-panel">
      <div className="panel-heading">
        <div>
          <h2>วิดีโอยอดนิยม</h2>
          <p>เรียงตามผลงานและศักยภาพไวรัลได้</p>
        </div>
        <div className="segmented-control small">
          {[10, 20].map((limit) => (
            <button
              aria-pressed={topLimit === limit}
              className={topLimit === limit ? 'is-active' : ''}
              key={limit}
              type="button"
              onClick={() => setTopLimit(limit as 10 | 20)}
            >
              สูงสุด {limit}
            </button>
          ))}
        </div>
      </div>

      <div className="table-wrap">
        <table className="video-table">
          <thead>
            <tr>
              {columns.map((column) => {
                const isSortable = column.key !== 'thumbnail'
                const isSorted = tableSort.key === column.key
                const nextDirection =
                  isSorted && tableSort.direction === 'desc' ? 'น้อยไปมาก' : 'มากไปน้อย'

                return (
                  <th
                    aria-sort={
                      !isSortable || !isSorted
                        ? undefined
                        : tableSort.direction === 'asc'
                          ? 'ascending'
                          : 'descending'
                    }
                    className={column.className}
                    key={column.key}
                    scope="col"
                  >
                    {isSortable ? (
                      <button
                        aria-label={`เรียง${column.label}จาก${nextDirection}`}
                        type="button"
                        onClick={() => toggleSort(column.key as TableSort['key'])}
                      >
                        {column.label}
                        {isSorted ? (
                          tableSort.direction === 'desc' ? (
                            <ArrowDown aria-hidden="true" className="h-3.5 w-3.5" />
                          ) : (
                            <ArrowUp aria-hidden="true" className="h-3.5 w-3.5" />
                          )
                        ) : null}
                      </button>
                    ) : (
                      column.label
                    )}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {analytics.topVideos.map((video, index) => {
              const videoId = getYouTubeId(video.url)

              return (
                <tr key={video.id}>
                  <td>
                    {videoId ? (
                      <div className="flex items-center justify-center">
                        <img
                          alt=""
                          className="w-16 h-auto rounded border border-[var(--mc-border)] shadow-sm object-cover"
                          loading="lazy"
                          src={`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`}
                        />
                      </div>
                    ) : null}
                  </td>
                  <td>
                    <div className="video-title-cell">
                      <span aria-label={`อันดับ ${index + 1}`} className="rank-medal" role="img">
                        {index < 3 ? (
                          <Trophy aria-hidden="true" className="h-3.5 w-3.5" />
                        ) : (
                          index + 1
                        )}
                      </span>
                      <a href={video.url} rel="noreferrer" target="_blank">
                        {video.title}
                        <ExternalLink aria-hidden="true" className="h-3 w-3" />
                      </a>
                    </div>
                  </td>
                  <td>
                    <span className="type-badge">{video.contentType}</span>
                  </td>
                  <td>{video.publishedDate}</td>
                  <td>{compactNumber(video.views)}</td>
                  <td>{percent(video.engagementRate)}</td>
                  <td>{video.viralScore.toFixed(1)}</td>
                  <td>{retentionLabel(video)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <SectionInsight>
        {analytics.sectionInsights.videos} · เรียงตาม {metricLabel(tableSort.key)}
      </SectionInsight>
    </article>
  )
}
