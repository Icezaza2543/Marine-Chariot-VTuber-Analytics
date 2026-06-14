import { zodResolver } from '@hookform/resolvers/zod'
import { CalendarDays, ChevronDown, Filter, RotateCcw, Search, Tags } from 'lucide-react'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { thaiMonthLabel } from '../lib/format'
import { DEFAULT_FILTERS, useDashboardStore } from '../store/useDashboardStore'
import type { AnalyticsBundle, DashboardFilters, Granularity } from '../types'

const filterSchema = z.object({
  dateStart: z.string(),
  dateEnd: z.string(),
  granularity: z.enum(['year', 'month', 'week', 'day']),
  contentTypes: z.array(z.string()),
  years: z.array(z.number()),
  months: z.array(z.number()),
  weeks: z.array(z.number()),
  search: z.string(),
  tag: z.string(),
})

type FilterFormValues = z.infer<typeof filterSchema>

interface FilterPanelProps {
  analytics: AnalyticsBundle
}

export function FilterPanel({ analytics }: FilterPanelProps) {
  const filters = useDashboardStore((state) => state.filters)
  const setFilters = useDashboardStore((state) => state.setFilters)
  const resetFilters = useDashboardStore((state) => state.resetFilters)
  const { register, handleSubmit, reset, setValue, watch } = useForm<FilterFormValues>({
    resolver: zodResolver(filterSchema),
    defaultValues: filters,
  })
  const selectedTypes = watch('contentTypes') ?? []
  const selectedYears = watch('years') ?? []
  const selectedMonths = watch('months') ?? []
  const selectedWeeks = watch('weeks') ?? []
  const granularity = watch('granularity')

  useEffect(() => {
    reset(filters)
  }, [filters, reset])

  const submitFilters = (values: FilterFormValues) => {
    setFilters(values as DashboardFilters)
    closeOpenDropdowns()
  }

  const resetAll = () => {
    reset(DEFAULT_FILTERS)
    resetFilters()
  }

  const toggleType = (type: string) => {
    const next = selectedTypes.includes(type)
      ? selectedTypes.filter((value) => value !== type)
      : [...selectedTypes, type]
    setValue('contentTypes', next, { shouldDirty: true })
  }

  const toggleNumber = (field: 'years' | 'months' | 'weeks', value: number) => {
    const current = watch(field) ?? []
    const next = current.includes(value)
      ? current.filter((item) => item !== value)
      : [...current, value].sort((a, b) => a - b)
    setValue(field, next, { shouldDirty: true })
  }

  const setGranularity = (value: Granularity) => {
    setValue('granularity', value, { shouldDirty: true })
  }

  return (
    <form className="filter-panel" onSubmit={handleSubmit(submitFilters)}>
      <div className="panel-heading">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-[var(--mc-cyan)]" />
          <div>
            <h2>Filters</h2>
            <p>{analytics.filteredRecords.length} videos matched</p>
          </div>
        </div>
        <button className="icon-btn" type="button" aria-label="Reset filters" onClick={resetAll}>
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>

      <div className="filter-bar-grid">
        <div className="filter-control date-control">
          <label className="filter-label">
            <CalendarDays className="h-3.5 w-3.5" />
            Date Range
          </label>
          <div className="grid grid-cols-2 gap-2">
            <input className="input input-sm input-bordered filter-input" type="date" {...register('dateStart')} />
            <input className="input input-sm input-bordered filter-input" type="date" {...register('dateEnd')} />
          </div>
        </div>

        <div className="filter-control">
          <span className="filter-label">Time Grain</span>
          <div className="segmented-control">
            {(['year', 'month', 'week', 'day'] as const).map((item) => (
              <button
                className={granularity === item ? 'is-active' : ''}
                key={item}
                type="button"
                onClick={() => setGranularity(item)}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <div className="filter-control">
          <label className="filter-label">
            <Search className="h-3.5 w-3.5" />
            Search
          </label>
          <input
            className="input input-sm input-bordered filter-input"
            placeholder="title, game, keyword"
            type="search"
            {...register('search')}
          />
        </div>

        <div className="filter-control">
          <label className="filter-label">
            <Tags className="h-3.5 w-3.5" />
            Tag
          </label>
          <input
            className="input input-sm input-bordered filter-input"
            placeholder="ASMR, Collab, Enshrouded"
            type="search"
            {...register('tag')}
          />
        </div>

        <MultiSelectDropdown
          label="Content Type"
          selectedCount={selectedTypes.length}
          selectedText={selectedTypes.length > 0 ? selectedTypes.slice(0, 2).join(', ') : 'All types'}
        >
          {analytics.allContentTypes.map((type) => (
            <DropdownCheck
              checked={selectedTypes.includes(type)}
              key={type}
              label={type}
              onChange={() => toggleType(type)}
            />
          ))}
        </MultiSelectDropdown>

        <MultiSelectDropdown
          label="Year"
          selectedCount={selectedYears.length}
          selectedText={selectedYears.length > 0 ? selectedYears.join(', ') : 'All years'}
        >
          {analytics.allYears.map((year) => (
            <DropdownCheck
              checked={selectedYears.includes(year)}
              key={year}
              label={String(year)}
              onChange={() => toggleNumber('years', year)}
            />
          ))}
        </MultiSelectDropdown>

        <MultiSelectDropdown
          label="Month"
          selectedCount={selectedMonths.length}
          selectedText={
            selectedMonths.length > 0
              ? selectedMonths.map((month) => thaiMonthLabel(month)).join(', ')
              : 'All months'
          }
        >
          {analytics.allMonths.map((month) => (
            <DropdownCheck
              checked={selectedMonths.includes(month)}
              key={month}
              label={thaiMonthLabel(month)}
              onChange={() => toggleNumber('months', month)}
            />
          ))}
        </MultiSelectDropdown>

        <MultiSelectDropdown
          label="Week"
          selectedCount={selectedWeeks.length}
          selectedText={selectedWeeks.length > 0 ? selectedWeeks.map((week) => `W${week}`).join(', ') : 'All weeks'}
        >
          <div className="dropdown-grid">
            {analytics.allWeeks.map((week) => (
              <DropdownCheck
                checked={selectedWeeks.includes(week)}
                key={week}
                label={`W${week}`}
                onChange={() => toggleNumber('weeks', week)}
              />
            ))}
          </div>
        </MultiSelectDropdown>
      </div>

      <div className="filter-actions">
        <button className="btn btn-sm apply-btn" type="submit">
          Apply Filters
        </button>
      </div>
    </form>
  )
}

function closeOpenDropdowns() {
  document
    .querySelectorAll<HTMLDetailsElement>('.filter-dropdown[open]')
    .forEach((dropdown) => {
      dropdown.open = false
    })
}

interface MultiSelectDropdownProps {
  label: string
  selectedCount: number
  selectedText: string
  children: React.ReactNode
}

function MultiSelectDropdown({ label, selectedCount, selectedText, children }: MultiSelectDropdownProps) {
  const countLabel = selectedCount > 0 ? `${selectedCount} selected` : 'All'

  return (
    <details className="filter-dropdown">
      <summary>
        <span>
          <strong>{label}</strong>
          <em>{selectedText}</em>
        </span>
        <span className="dropdown-count">{countLabel}</span>
        <ChevronDown className="h-4 w-4" />
      </summary>
      <div className="dropdown-menu-panel">{children}</div>
    </details>
  )
}

interface DropdownCheckProps {
  checked: boolean
  label: string
  onChange: () => void
}

function DropdownCheck({ checked, label, onChange }: DropdownCheckProps) {
  return (
    <label className={checked ? 'dropdown-check is-active' : 'dropdown-check'}>
      <input checked={checked} onChange={onChange} type="checkbox" />
      <span>{label}</span>
    </label>
  )
}
