import { parseISO } from 'date-fns'
import type { DashboardFilters, VideoRecord } from '../../types'

export function filterRecords(records: VideoRecord[], filters: DashboardFilters) {
  const search = filters.search.trim().toLowerCase()
  const tag = filters.tag.trim().toLowerCase()
  const selectedTypes = new Set(filters.contentTypes)
  const selectedYears = new Set(filters.years)
  const selectedMonths = new Set(filters.months)
  const selectedWeeks = new Set(filters.weeks)
  const startDate = filters.dateStart ? parseISO(filters.dateStart) : null
  const endDate = filters.dateEnd ? parseISO(filters.dateEnd) : null

  return records.filter((record) => {
    const matchesDateStart = !startDate || record.publishedAt >= startDate
    const matchesDateEnd = !endDate || record.publishedAt <= endDate
    const matchesType = selectedTypes.size === 0 || selectedTypes.has(record.contentType)
    const matchesYear = selectedYears.size === 0 || selectedYears.has(record.uploadYear)
    const matchesMonth = selectedMonths.size === 0 || selectedMonths.has(record.uploadMonth)
    const matchesWeek = selectedWeeks.size === 0 || selectedWeeks.has(record.uploadWeek)
    const searchable = `${record.title} ${record.contentType} ${record.tags.join(' ')}`.toLowerCase()
    const matchesSearch = search.length === 0 || searchable.includes(search)
    const matchesTag = tag.length === 0 || record.tags.some((value) => value.toLowerCase().includes(tag))

    return (
      matchesDateStart &&
      matchesDateEnd &&
      matchesType &&
      matchesYear &&
      matchesMonth &&
      matchesWeek &&
      matchesSearch &&
      matchesTag
    )
  })
}
