export function groupBy<T>(values: T[], getKey: (value: T) => string) {
  return values.reduce((map, value) => {
    const key = getKey(value)
    const items = map.get(key) ?? []
    items.push(value)
    map.set(key, items)
    return map
  }, new Map<string, T[]>())
}

export function unique<T>(values: T[]) {
  return Array.from(new Set(values))
}

export function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0)
}

export function average(values: number[]) {
  return safeDivide(sum(values), values.length)
}

export function median(values: number[]) {
  if (values.length === 0) {
    return 0
  }

  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)

  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2
  }

  return sorted[middle]
}

export function safeDivide(value: number, divisor: number) {
  return divisor === 0 ? 0 : value / divisor
}

export function deltaPercent(current: number, previous: number) {
  if (previous === 0) {
    return current > 0 ? 100 : 0
  }

  return ((current - previous) / previous) * 100
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}
