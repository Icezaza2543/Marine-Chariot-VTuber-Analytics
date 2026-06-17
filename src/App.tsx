import { format } from 'date-fns'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Activity, AlertTriangle } from 'lucide-react'
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
import {
  CategoryBreakdownPanel,
  ChannelSummaryPanel,
  ContentFormatPanel,
  MonthlyUploadPanel,
  ShortsDeepDivePanel,
} from './components/LegacyInspiredPanels'

const DATA_REFRESH_INTERVAL_MS = 60_000

export default function App() {
  const [records, setRecords] = useState<VideoRecord[]>([])
  const [xData, setXData] = useState<XDataset | undefined>(undefined)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [didInitDateRange, setDidInitDateRange] = useState(false)
  const latestDataDateRef = useRef<string | null>(null)
  const filters = useDashboardStore((state) => state.filters)
  const topLimit = useDashboardStore((state) => state.topLimit)
  const tableSort = useDashboardStore((state) => state.tableSort)
  const patchFilters = useDashboardStore((state) => state.patchFilters)

  useEffect(() => {
    let isMounted = true

    async function loadInitialData() {
      try {
        const [data, socialData] = await Promise.all([loadMarineData(), loadMarineXData()])

        if (isMounted) {
          setRecords(data)
          setXData(socialData)
          setError(null)
        }
      } catch (cause) {
        if (isMounted) {
          setError(cause instanceof Error ? cause.message : String(cause))
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void loadInitialData()

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    let isMounted = true

    async function refreshMarineData() {
      try {
        const data = await loadMarineData()

        if (isMounted) {
          setRecords(data)
          setError(null)
        }
      } catch (cause) {
        console.warn('Marine Chariot CSV refresh failed', cause)
      }
    }

    const intervalId = window.setInterval(() => {
      void refreshMarineData()
    }, DATA_REFRESH_INTERVAL_MS)

    return () => {
      isMounted = false
      window.clearInterval(intervalId)
    }
  }, [])

  useEffect(() => {
    if (records.length > 0) {
      const dateStart = format(records[0].publishedAt, 'yyyy-MM-dd')
      const dateEnd = format(records.at(-1)!.publishedAt, 'yyyy-MM-dd')
      const previousDateEnd = latestDataDateRef.current

      if (!didInitDateRange) {
        patchFilters({
          dateStart,
          dateEnd,
        })
        latestDataDateRef.current = dateEnd
        setDidInitDateRange(true)
        return
      }

      if (previousDateEnd && filters.dateEnd === previousDateEnd && dateEnd !== previousDateEnd) {
        patchFilters({
          dateEnd,
        })
      }

      latestDataDateRef.current = dateEnd
    }
  }, [didInitDateRange, filters.dateEnd, patchFilters, records])

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
        <KpiDashboard kpis={analytics.kpis} />
        <FilterPanel analytics={analytics} />

        <main className="dashboard-main long-scroll-main">
          <section className="dashboard-section overview-grid">
            <GrowthTrendChart analytics={analytics} />
            <InsightPanel analytics={analytics} compact />
          </section>

          <section className="dashboard-section">
            <MonthlyUploadPanel analytics={analytics} />
          </section>

          <section className="dashboard-section">
            <ContentFormatPanel analytics={analytics} />
          </section>

          <section className="dashboard-section">
            <CategoryBreakdownPanel analytics={analytics} />
          </section>

          <section className="dashboard-section content-page-grid">
            <ContentTypeDeepDive analytics={analytics} />
            <ContentEfficiencyPanel analytics={analytics} />
            <YearlyComparisonPanel analytics={analytics} />
            <DurationEngagementChart analytics={analytics} />
            <EngagementMixPanel analytics={analytics} />
            <PostingHeatmap analytics={analytics} />
          </section>

          <section className="dashboard-section">
            <ShortsDeepDivePanel analytics={analytics} />
          </section>

          <section className="dashboard-section strategy-page-grid">
            <ForecastPanel analytics={analytics} />
            <SocialSignalPanel analytics={analytics} />
            <TopVideosTable analytics={analytics} />
          </section>

          <section className="dashboard-section">
            <ChannelSummaryPanel analytics={analytics} />
          </section>
        </main>
      </div>
    </AppShell>
  )
}
