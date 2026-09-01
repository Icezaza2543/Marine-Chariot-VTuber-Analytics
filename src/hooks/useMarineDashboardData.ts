import { format } from 'date-fns'
import { useEffect, useRef, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { loadMarineData } from '../data/loadMarineData'
import { loadMarineXData } from '../data/loadMarineXData'
import { useDashboardStore } from '../store/useDashboardStore'
import type { MarineDataSnapshot, VideoRecord, XDataset } from '../types'

const DATA_REFRESH_INTERVAL_MS = 5 * 60_000

export function useMarineDashboardData() {
  const [records, setRecords] = useState<VideoRecord[]>([])
  const [xData, setXData] = useState<XDataset | undefined>(undefined)
  const [dataSnapshot, setDataSnapshot] = useState<MarineDataSnapshot | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const didInitDateRangeRef = useRef(false)
  const latestDataDateRef = useRef<string | null>(null)
  const latestLoadTimeRef = useRef(0)
  const { dateEnd, patchFilters } = useDashboardStore(
    useShallow((state) => ({
      dateEnd: state.filters.dateEnd,
      patchFilters: state.patchFilters,
    })),
  )

  useEffect(() => {
    let isMounted = true
    const controller = new AbortController()

    async function loadInitialData() {
      try {
        const [snapshot, socialData] = await Promise.all([
          loadMarineData(controller.signal),
          loadMarineXData(),
        ])

        if (isMounted) {
          setRecords(snapshot.records)
          setDataSnapshot(snapshot)
          setXData(socialData)
          latestLoadTimeRef.current = Date.parse(snapshot.loadedAt)
          setError(null)
        }
      } catch (cause) {
        if (isMounted && !isAbortError(cause)) {
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
      controller.abort()
    }
  }, [])

  useEffect(() => {
    let isMounted = true
    let isRefreshing = false
    let controller: AbortController | null = null

    async function refreshMarineData() {
      if (document.hidden || isRefreshing) {
        return
      }

      isRefreshing = true
      controller = new AbortController()

      try {
        const snapshot = await loadMarineData(controller.signal)

        if (isMounted) {
          setRecords(snapshot.records)
          setDataSnapshot(snapshot)
          latestLoadTimeRef.current = Date.parse(snapshot.loadedAt)
          setError(null)
        }
      } catch (cause) {
        if (!isAbortError(cause)) {
          console.warn('Marine Chariot CSV refresh failed', cause)
        }
      } finally {
        isRefreshing = false
        controller = null
      }
    }

    const intervalId = window.setInterval(() => {
      void refreshMarineData()
    }, DATA_REFRESH_INTERVAL_MS)
    const handleVisibilityChange = () => {
      const isStale = Date.now() - latestLoadTimeRef.current >= DATA_REFRESH_INTERVAL_MS

      if (!document.hidden && isStale) {
        void refreshMarineData()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      isMounted = false
      controller?.abort()
      window.clearInterval(intervalId)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
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

    if (!didInitDateRangeRef.current) {
      patchFilters({
        dateStart: nextDateStart,
        dateEnd: nextDateEnd,
      })
      latestDataDateRef.current = nextDateEnd
      didInitDateRangeRef.current = true
      return
    }

    if (previousDateEnd && dateEnd === previousDateEnd && nextDateEnd !== previousDateEnd) {
      patchFilters({
        dateEnd: nextDateEnd,
      })
    }

    latestDataDateRef.current = nextDateEnd
  }, [dateEnd, patchFilters, records])

  return {
    records,
    xData,
    dataSnapshot,
    isLoading,
    error,
  }
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === 'AbortError'
}
