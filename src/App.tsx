import { lazy, Suspense, useMemo, type ReactNode } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { Activity, AlertTriangle } from 'lucide-react'
import { buildAnalytics } from './lib/analytics'
import { useDashboardStore } from './store/useDashboardStore'
import { AppShell } from './components/AppShell'
import { KpiDashboard } from './components/KpiDashboard'
import { useMarineDashboardData } from './hooks/useMarineDashboardData'

const GrowthTrendChart = lazy(() =>
  import('./components/charts/GrowthTrendChart').then((module) => ({ default: module.GrowthTrendChart })),
)
const FilterPanel = lazy(() =>
  import('./components/FilterPanel').then((module) => ({ default: module.FilterPanel })),
)
const ContentTypeDeepDive = lazy(() =>
  import('./components/ContentTypeDeepDive').then((module) => ({ default: module.ContentTypeDeepDive })),
)
const DurationEngagementChart = lazy(() =>
  import('./components/charts/DurationEngagementChart').then((module) => ({
    default: module.DurationEngagementChart,
  })),
)
const PostingHeatmap = lazy(() =>
  import('./components/PostingHeatmap').then((module) => ({ default: module.PostingHeatmap })),
)
const TopVideosTable = lazy(() =>
  import('./components/TopVideosTable').then((module) => ({ default: module.TopVideosTable })),
)
const InsightPanel = lazy(() =>
  import('./components/InsightPanel').then((module) => ({ default: module.InsightPanel })),
)
const ForecastPanel = lazy(() =>
  import('./components/ForecastPanel').then((module) => ({ default: module.ForecastPanel })),
)
const SocialSignalPanel = lazy(() =>
  import('./components/SocialSignalPanel').then((module) => ({ default: module.SocialSignalPanel })),
)
const YearlyComparisonPanel = lazy(() =>
  import('./components/YearlyComparisonPanel').then((module) => ({ default: module.YearlyComparisonPanel })),
)
const ContentEfficiencyPanel = lazy(() =>
  import('./components/ContentEfficiencyPanel').then((module) => ({ default: module.ContentEfficiencyPanel })),
)
const EngagementMixPanel = lazy(() =>
  import('./components/EngagementMixPanel').then((module) => ({ default: module.EngagementMixPanel })),
)
const MonthlyUploadPanel = lazy(() =>
  import('./components/legacyPanels/MonthlyUploadPanel').then((module) => ({ default: module.MonthlyUploadPanel })),
)
const ContentFormatPanel = lazy(() =>
  import('./components/legacyPanels/ContentFormatPanel').then((module) => ({ default: module.ContentFormatPanel })),
)
const CategoryBreakdownPanel = lazy(() =>
  import('./components/legacyPanels/CategoryBreakdownPanel').then((module) => ({
    default: module.CategoryBreakdownPanel,
  })),
)
const ShortsDeepDivePanel = lazy(() =>
  import('./components/legacyPanels/ShortsDeepDivePanel').then((module) => ({ default: module.ShortsDeepDivePanel })),
)
const ChannelSummaryPanel = lazy(() =>
  import('./components/legacyPanels/ChannelSummaryPanel').then((module) => ({ default: module.ChannelSummaryPanel })),
)

function DeferredSection({ children }: { children: ReactNode }) {
  return <Suspense fallback={<SectionFallback />}>{children}</Suspense>
}

function SectionFallback() {
  return (
    <article aria-busy="true" className="chart-panel min-h-64">
      <div className="panel-heading">
        <div>
          <h2>Loading dashboard section</h2>
          <p>Preparing visual analytics</p>
        </div>
        <Activity className="h-4 w-4 animate-pulse text-[var(--mc-cyan)]" />
      </div>
    </article>
  )
}

export default function App() {
  const { records, xData, isLoading, error } = useMarineDashboardData()
  const { filters, tableSort, topLimit } = useDashboardStore(
    useShallow((state) => ({
      filters: state.filters,
      tableSort: state.tableSort,
      topLimit: state.topLimit,
    })),
  )

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
        <DeferredSection>
          <FilterPanel analytics={analytics} />
        </DeferredSection>

        <main className="dashboard-main long-scroll-main">
          <section className="dashboard-section overview-grid">
            <DeferredSection>
              <GrowthTrendChart analytics={analytics} />
            </DeferredSection>
            <DeferredSection>
              <InsightPanel analytics={analytics} compact />
            </DeferredSection>
          </section>

          <section className="dashboard-section">
            <DeferredSection>
              <MonthlyUploadPanel analytics={analytics} />
            </DeferredSection>
          </section>

          <section className="dashboard-section">
            <DeferredSection>
              <ContentFormatPanel analytics={analytics} />
            </DeferredSection>
          </section>

          <section className="dashboard-section">
            <DeferredSection>
              <CategoryBreakdownPanel analytics={analytics} />
            </DeferredSection>
          </section>

          <section className="dashboard-section content-page-grid">
            <DeferredSection>
              <ContentTypeDeepDive analytics={analytics} />
            </DeferredSection>
            <DeferredSection>
              <ContentEfficiencyPanel analytics={analytics} />
            </DeferredSection>
            <DeferredSection>
              <YearlyComparisonPanel analytics={analytics} />
            </DeferredSection>
            <DeferredSection>
              <DurationEngagementChart analytics={analytics} />
            </DeferredSection>
            <DeferredSection>
              <EngagementMixPanel analytics={analytics} />
            </DeferredSection>
            <DeferredSection>
              <PostingHeatmap analytics={analytics} />
            </DeferredSection>
          </section>

          <section className="dashboard-section">
            <DeferredSection>
              <ShortsDeepDivePanel analytics={analytics} />
            </DeferredSection>
          </section>

          <section className="dashboard-section strategy-page-grid">
            <DeferredSection>
              <ForecastPanel analytics={analytics} />
            </DeferredSection>
            <DeferredSection>
              <SocialSignalPanel analytics={analytics} />
            </DeferredSection>
            <DeferredSection>
              <TopVideosTable analytics={analytics} />
            </DeferredSection>
          </section>

          <section className="dashboard-section">
            <DeferredSection>
              <ChannelSummaryPanel analytics={analytics} />
            </DeferredSection>
          </section>
        </main>
      </div>
    </AppShell>
  )
}
