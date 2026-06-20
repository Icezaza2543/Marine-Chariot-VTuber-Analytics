import { format } from 'date-fns'
import { useEffect, useRef, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { loadMarineData } from '../data/loadMarineData'
import { loadMarineXData } from '../data/loadMarineXData'
import { useDashboardStore } from '../store/useDashboardStore'
import type { VideoRecord, XDataset } from '../types'

const DATA_REFRESH_INTERVAL_MS = 60_000

export function useMarineDashboardData() {
  const [records, setRecords] = useState<VideoRecord[]>([])
  const [xData, setXData] = useState<XDataset | undefined>(undefined)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [didInitDateRange, setDidInitDateRange] = useState(false)
  const latestDataDateRef = useRef<string | null>(null)
  const { dateEnd, patchFilters } = useDashboardStore(
    useShallow((state) => ({
      dateEnd: state.filters.dateEnd,
      patchFilters: state.patchFilters,
    })),
  )

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
    if (records.length === 0) {
      return
    }

    const rangeStart = records[0].publishedAt
    const rangeEnd = records.at(-1)!.publishedAt
    const nextDateStart = format(rangeStart, 'yyyy-MM-dd')
    const nextDateEnd = format(rangeEnd, 'yyyy-MM-dd')
    const previousDateEnd = latestDataDateRef.current

    if (!didInitDateRange) {
      patchFilters({
        dateStart: nextDateStart,
        dateEnd: nextDateEnd,
      })
      latestDataDateRef.current = nextDateEnd
      setDidInitDateRange(true)
      return
    }

    if (previousDateEnd && dateEnd === previousDateEnd && nextDateEnd !== previousDateEnd) {
      patchFilters({
        dateEnd: nextDateEnd,
      })
    }

    latestDataDateRef.current = nextDateEnd
  }, [dateEnd, didInitDateRange, patchFilters, records])

  return {
    records,
    xData,
    isLoading,
    error,
  }
}
