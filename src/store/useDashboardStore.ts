import { create } from 'zustand'
import type { DashboardFilters, TableSort } from '../types'

export const DEFAULT_FILTERS: DashboardFilters = {
  dateStart: '',
  dateEnd: '',
  granularity: 'month',
  contentTypes: [],
  years: [],
  months: [],
  weeks: [],
  search: '',
  tag: '',
}

interface DashboardStore {
  filters: DashboardFilters
  topLimit: 10 | 20
  tableSort: TableSort
  setFilters: (filters: DashboardFilters) => void
  patchFilters: (filters: Partial<DashboardFilters>) => void
  resetFilters: () => void
  setTopLimit: (limit: 10 | 20) => void
  setTableSort: (sort: TableSort) => void
}

export const useDashboardStore = create<DashboardStore>((set) => ({
  filters: DEFAULT_FILTERS,
  topLimit: 10,
  tableSort: {
    key: 'viralScore',
    direction: 'desc',
  },
  setFilters: (filters) => set({ filters }),
  patchFilters: (filters) =>
    set((state) => ({
      filters: {
        ...state.filters,
        ...filters,
      },
    })),
  resetFilters: () => set({ filters: DEFAULT_FILTERS }),
  setTopLimit: (topLimit) => set({ topLimit }),
  setTableSort: (tableSort) => set({ tableSort }),
}))
