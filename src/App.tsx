import { format } from 'date-fns'
import { useEffect, useMemo, useState } from 'react'
import { Activity, AlertTriangle, BarChart3, BrainCircuit, Clock3 } from 'lucide-react'
import { buildAnalytics } from './lib/analytics'
import { loadMarineData } from './data/loadMarineData'
import { loadMarineXData } from './data/loadMarineXData'
import { useDashboardStore } from './store/useDashboardStore'
import type { VideoRecord, XDataset } from './types'
import { AppShell } from './components/AppShell'
import { FilterPanel } from './components/FilterPanel'
import { KpiDashboard } from './components/KpiDashboard'
import { GrowthTrendChart } from './components/charts/GrowthTrendChart'
import { ContentTypeDeepDive } from './components/ContentTypeDeepDive'
import { DurationEngagementChart } from './components/charts/DurationEngagementChart'
import { PostingHeatmap } from './components/PostingHeatmap'
import { TopVideosTable } from './components/TopVideosTable'
import { InsightPanel } from './components/InsightPanel'
import { ForecastPanel } from './components/ForecastPanel'
import { SocialSignalPanel } from './components/SocialSignalPanel'
import { YearlyComparisonPanel } from './components/YearlyComparisonPanel'
import { ContentEfficiencyPanel } from './components/ContentEfficiencyPanel'
import { EngagementMixPanel } from './components/EngagementMixPanel'

type DashboardPage = 'overview' | 'content' | 'strategy'

const dashboardPages: Array<{
  id: DashboardPage
  label: string
  description: string
  icon: typeof BarChart3
}> = [
  {
    id: 'overview',
    label: 'Overview',
    description: 'KPI and growth pulse',
    icon: BarChart3,
  },
  {
    id: 'content',
    label: 'Content & Timing',
    description: 'Format, duration, upload slot',
    icon: Clock3,
  },
  {
    id: 'strategy',
    label: 'Prediction & Strategy',
    description: 'Forecast, videos, AI insights',
    icon: BrainCircuit,
  },
]

export default function App() {
  const [records, setRecords] = useState<VideoRecord[]>([])
  const [xData, setXData] = useState<XDataset | undefined>(undefined)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [didInitDateRange, setDidInitDateRange] = useState(false)
  const [activePage, setActivePage] = useState<DashboardPage>('overview')
  const filters = useDashboardStore((state) => state.filters)
  const topLimit = useDashboardStore((state) => state.topLimit)
  const tableSort = useDashboardStore((state) => state.tableSort)
  const patchFilters = useDashboardStore((state) => state.patchFilters)

  useEffect(() => {
    let isMounted = true

    Promise.all([loadMarineData(), loadMarineXData()])
      .then(([data, socialData]) => {
        if (isMounted) {
          setRecords(data)
          setXData(socialData)
          setError(null)
        }
      })
      .catch((cause: Error) => {
        if (isMounted) {
          setError(cause.message)
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    if (records.length > 0 && !didInitDateRange) {
      patchFilters({
        dateStart: format(records[0].publishedAt, 'yyyy-MM-dd'),
        dateEnd: format(records.at(-1)!.publishedAt, 'yyyy-MM-dd'),
      })
      setDidInitDateRange(true)
    }
  }, [didInitDateRange, patchFilters, records])

  const analytics = useMemo(
    () => buildAnalytics(records, filters, topLimit, tableSort, xData),
    [filters, records, tableSort, topLimit, xData],
  )

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--mc-bg)] text-[var(--mc-text)]">
        <div className="mx-auto flex min-h-screen max-w-7xl items-center justify-center px-6">
          <div className="glass-panel flex items-center gap-4 p-6">
            <Activity className="h-6 w-6 animate-pulse text-[var(--mc-cyan)]" />
            <div>
              <p className="text-sm font-semibold text-white">Loading Marine Chariot data</p>
              <p className="text-xs text-[var(--mc-muted)]">Parsing CSV and preparing analytics engine</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[var(--mc-bg)] text-[var(--mc-text)]">
        <div className="mx-auto flex min-h-screen max-w-4xl items-center justify-center px-6">
          <div className="glass-panel border-red-400/40 p-6">
            <div className="mb-4 flex items-center gap-3 text-red-200">
              <AlertTriangle className="h-6 w-6" />
              <h1 className="text-xl font-semibold">CSV load failed</h1>
            </div>
            <p className="text-sm text-[var(--mc-muted)]">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <AppShell analytics={analytics}>
      <div className="dashboard-workspace">
        <FilterPanel analytics={analytics} />

        <nav className="page-tabs" aria-label="Dashboard pages">
          {dashboardPages.map((page) => {
            const Icon = page.icon

            return (
              <button
                className={activePage === page.id ? 'page-tab is-active' : 'page-tab'}
                key={page.id}
                type="button"
                onClick={() => {
                  closeFilterDropdowns()
                  setActivePage(page.id)
                  window.requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'auto' }))
                }}
              >
                <Icon className="h-4 w-4" />
                <span>
                  <strong>{page.label}</strong>
                  <em>{page.description}</em>
                </span>
              </button>
            )
          })}
        </nav>

        <main className="dashboard-main">
          {activePage === 'overview' ? (
            <>
              <KpiDashboard kpis={analytics.kpis} />
              <section className="dashboard-section overview-grid">
                <GrowthTrendChart analytics={analytics} />
                <InsightPanel analytics={analytics} compact />
              </section>
              <section className="dashboard-section">
                <YearlyComparisonPanel analytics={analytics} />
              </section>
            </>
          ) : null}

          {activePage === 'content' ? (
            <section className="dashboard-section content-page-grid">
              <ContentTypeDeepDive analytics={analytics} />
              <ContentEfficiencyPanel analytics={analytics} />
              <DurationEngagementChart analytics={analytics} />
              <EngagementMixPanel analytics={analytics} />
              <PostingHeatmap analytics={analytics} />
            </section>
          ) : null}

          {activePage === 'strategy' ? (
            <section className="dashboard-section strategy-page-grid">
              <ForecastPanel analytics={analytics} />
              <InsightPanel analytics={analytics} />
              <SocialSignalPanel analytics={analytics} />
              <TopVideosTable analytics={analytics} />
            </section>
          ) : null}
        </main>
      </div>
    </AppShell>
  )
}

function closeFilterDropdowns() {
  document
    .querySelectorAll<HTMLDetailsElement>('.filter-dropdown[open]')
    .forEach((dropdown) => {
      dropdown.open = false
    })
}
